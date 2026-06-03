import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { isAdmin, getUsersList } from '$lib/server/services/userService';
import { calculateNextAssetIdAndSequence } from '$lib/server/services/assetService';
import { normalizeDateForComparison } from '$lib/utils/datetime';
import type { Asset, AssetCategory, User } from '$lib/types';
import * as XLSX from 'xlsx';

const normalizeComparableValue = (value: unknown) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const compareTextFields = [
    'category',
    'name',
    'brand',
    'model',
    'serial_number',
    'location',
    'department',
    'assigned_to',
    'notes'
] as const;

const compareNumberFields = [
    'warranty_years',
    'confidentiality_score',
    'integrity_score',
    'availability_score',
    'total_risk_score'
] as const;

const isBlankExcelRow = (row: Record<string, unknown>) => {
    return Object.values(row).every(value => normalizeComparableValue(value) === '');
};

const isAssetDataUnchanged = (existingAsset: Record<string, any>, assetData: Record<string, any>) => {
    const textFieldsUnchanged = compareTextFields.every(field =>
        normalizeComparableValue(existingAsset[field]) === normalizeComparableValue(assetData[field])
    );

    const numberFieldsUnchanged = compareNumberFields.every(field =>
        Number(existingAsset[field] || 0) === Number(assetData[field] || 0)
    );

    const purchaseDateUnchanged =
        normalizeDateForComparison(existingAsset.purchase_date) === normalizeDateForComparison(assetData.purchase_date);

    return textFieldsUnchanged && numberFieldsUnchanged && purchaseDateUnchanged;
};

/**
 * @description 為大量匯入/匯出頁面載入必要資料
 * - 僅限管理員訪問
 * - 載入所有資產和資產類別以供匯出功能使用
 */
export const load: PageServerLoad = async ({ locals }) => {
    // 權限檢查：僅限管理員
    if (!locals.user || !isAdmin(locals.user)) {
        logger.warn(`[Page/Assets/Bulk] Unauthorized access attempt by user ${locals.user?.name}`);
        throw error(403, '權限不足，只有管理員才能訪問此頁面');
    }

    try {
        const pb = locals.pb;

        // 並行獲取所有資產和資產類別
        const [assets, categories] = await Promise.all([
            pb.collection('assets').getFullList<Asset>({
                batch: 5000,
                sort: '-created',
                expand: 'category,assigned_to' // 展開關聯的 category 和 assigned_to 欄位
            }),
            pb.collection('asset_categories').getFullList<AssetCategory>({
                batch: 200,
                sort: 'name'
            })
        ]);

        logger.info(
            `[Page/Assets/Bulk] Loaded ${assets.length} assets and ${categories.length} categories for export.`
        );

        return {
            assets: structuredClone(assets),
            categories: structuredClone(categories)
        };
    } catch (err: unknown) {
        logger.error('[Page/Assets/Bulk] Failed to load data for bulk operations.', { error: err });
        throw error(500, '無法載入頁面資料，請稍後再試');
    }
};

/**
 * @description 處理大量匯入資產的表單操作 (支援新增與更新)
 */
export const actions: Actions = {
    upload: async ({ request, locals }) => {
        // 權限檢查
        if (!locals.user || !isAdmin(locals.user)) {
            return fail(403, { message: '權限不足' });
        }

        const formData = await request.formData();
        const file = formData.get('asset-file') as File;

        if (!file || file.size === 0) {
            return fail(400, { message: '未上傳檔案或檔案為空' });
        }

        const pb = locals.pb;
        const results: { success: boolean; message: string; data?: any }[] = [];
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let unchangedCount = 0;
        let failedCount = 0;

        try {
            // 並行獲取所需的所有參考資料
            const [allCategories, allUsers] = await Promise.all([
                pb.collection('asset_categories').getFullList<AssetCategory>(),
                getUsersList(pb, { asAdmin: true })
            ]);

            // 建立 safeName -> category 對應 (與匯出邏輯一致)
            // Excel 工作表名稱不能包含特殊字符: : \ / ? * [ ]
            // 匯出時已經統一轉換為 safe name，因此匯入時只需要處理 safe name 即可
            const categoryMap = new Map<string, any>();
            for (const c of allCategories) {
                // 將 category name 轉換為與匯出時相同的 safe name
                const safeName = c.name.replace(/[:\\/\?\*\[\]]/g, '_');
                categoryMap.set(safeName, c);
            }

            // 建立 name -> user 對應，避免在迴圈中重複查詢資料庫
            const userMap = new Map<string, any>();
            for (const u of allUsers) {
                if (u.name) userMap.set(u.name, u);
                // 也可以支援用 email 搜尋
                if (u.email) userMap.set(u.email, u);
            }

            // 追蹤記憶體中的 sequence 遞增
            const categorySequences = new Map<string, number>(allCategories.map(c => [c.id, c.next_sequence]));
            // 記錄哪些 category 有被更新 sequence，最後再一次性回寫
            const updatedCategories = new Set<string>();

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                // 這裡改用 Sheet 名稱對應 Category Name (配合匯出邏輯)
                const category = categoryMap.get(sheetName);

                if (category) {
                    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const rowIndex = i + 2;

                        if (isBlankExcelRow(row)) {
                            // 空白範本列或空白資料列不屬於有效資料，靜默略過，不列入畫面統計。
                            continue;
                        }

                        // 嘗試解析日期，並處理無效日期的錯誤
                        let parsedDate: string | undefined = undefined;
                        if (row['購買日期'] || row['Purchase Date']) {
                            const dateVal = row['購買日期'] || row['Purchase Date'];
                            try {
                                parsedDate = new Date(dateVal).toISOString();
                            } catch (e) {
                                logger.warn(`Invalid date format at row ${rowIndex}: ${dateVal}`);
                            }
                        }

                        const rowData = {
                            asset_id: String(row['財產編號'] || row['Asset ID'] || '').trim(),
                            name: String(row['資產名稱'] || row['Name'] || '').trim(),
                            brand: String(row['品牌'] || row['Brand'] || '').trim(),
                            model: String(row['型號'] || row['Model'] || '').trim(),
                            serial_number: String(row['序號'] || row['Serial Number'] || '').trim(),
                            purchase_date: parsedDate,
                            warranty_years: Number(row['原廠維護年限'] || row['Warranty Years']) || 0,
                            location: String(row['存放位置'] || row['Location'] || '').trim(),
                            department: String(row['部門'] || row['Department'] || '').trim(),
                            assigned_to_username: String(row['保管人'] || row['Assigned To'] || '').trim(),
                            notes: String(row['備註'] || row['Notes'] || '').trim(),
                            confidentiality_score: Number(row['機密性'] || row['Confidentiality']) || 0,
                            integrity_score: Number(row['完整性'] || row['Integrity']) || 0,
                            availability_score: Number(row['可用性'] || row['Availability']) || 0
                        };

                        try {
                            // 驗證必填欄位：資產名稱不可為空
                            if (!rowData.name || rowData.name.trim() === '') {
                                throw new Error('資產名稱為必填欄位，不可為空');
                            }

                            // 從記憶體中尋找保管人
                            let assigned_to_user_id = '';
                            if (rowData.assigned_to_username) {
                                const matchedUser = userMap.get(rowData.assigned_to_username);
                                if (!matchedUser) {
                                    throw new Error(`找不到保管人: ${rowData.assigned_to_username}`);
                                }
                                assigned_to_user_id = matchedUser.id;
                            }

                            const total_risk_score = rowData.confidentiality_score + rowData.integrity_score + rowData.availability_score;

                            // 準備基本資料物件
                            const baseAssetData = {
                                category: category.id,
                                name: rowData.name.trim(), // 已驗證必填，移除預設值
                                brand: rowData.brand,
                                model: rowData.model,
                                serial_number: rowData.serial_number,
                                purchase_date: rowData.purchase_date,
                                warranty_years: rowData.warranty_years,
                                location: rowData.location,
                                department: rowData.department,
                                assigned_to: assigned_to_user_id,
                                notes: rowData.notes,
                                confidentiality_score: rowData.confidentiality_score,
                                integrity_score: rowData.integrity_score,
                                availability_score: rowData.availability_score,
                                total_risk_score: total_risk_score
                            };

                            if (rowData.asset_id) {
                                // Update 邏輯：有提供 asset_id
                                try {
                                    const existingAsset = await pb.collection('assets').getFirstListItem(`asset_id="${rowData.asset_id}"`);
                                    if (isAssetDataUnchanged(existingAsset, baseAssetData)) {
                                        results.push({ success: true, message: `資產 ${rowData.asset_id} 無變更，已略過更新。` });
                                        skippedCount++;
                                        unchangedCount++;
                                        continue;
                                    }

                                    await pb.collection('assets').update(existingAsset.id, baseAssetData);
                                    results.push({ success: true, message: `成功更新資產 ${rowData.asset_id}` });
                                    updatedCount++;
                                } catch (err: any) {
                                    if (err.status === 404) {
                                        throw new Error(`嘗試更新失敗，找不到財產編號為 ${rowData.asset_id} 的資產。若要新增請保持編號空白。`);
                                    }
                                    throw err;
                                }
                            } else {
                                // Create 邏輯：未提供 asset_id
                                // 與單筆新增共用相同規則：掃描既有資產編號，產生 PREFIX-001 格式並補最小缺號。
                                const { assetId: new_asset_id, newSequence } = await calculateNextAssetIdAndSequence(
                                    pb,
                                    category.id,
                                    allCategories
                                );

                                const newAssetData = {
                                    ...baseAssetData,
                                    asset_id: new_asset_id,
                                    status: 'active' as Asset['status'],
                                    is_lendable: true
                                };

                                await pb.collection('assets').create<Asset>(newAssetData);

                                // 更新記憶體中的 sequence
                                categorySequences.set(category.id, newSequence);
                                updatedCategories.add(category.id);

                                results.push({ success: true, message: `成功建立資產 ${new_asset_id}` });
                                createdCount++;
                            }

                        } catch (err: unknown) {
                            failedCount++;
                            const errorMessage = err instanceof Error ? err.message : '未知錯誤';
                            results.push({
                                success: false,
                                message: `[${sheetName}] 第 ${rowIndex} 行處理失敗: ${errorMessage}`,
                                data: rowData
                            });
                        }
                    }
                } else if (sheetName !== '未分類') {
                     // 未分類通常只是匯出時沒有 category 關聯的產物，不當作錯誤
                    results.push({ success: false, message: `工作表 "${sheetName}" 無法對應到任何資產類別的名稱，已略過。` });
                }
            }

            // 批次更新所有被影響的 Category next_sequence
            for (const categoryId of updatedCategories) {
                const newSeq = categorySequences.get(categoryId);
                if (newSeq) {
                    await pb.collection('asset_categories').update(categoryId, {
                        next_sequence: newSeq
                    });
                }
            }

            logger.info(`[Upload] Bulk asset import completed. Created: ${createdCount}, Updated: ${updatedCount}, Unchanged: ${unchangedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}.`);
            return { success: true, createdCount, updatedCount, skippedCount, unchangedCount, failedCount, results };

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error('[Upload] An error occurred during bulk asset import.', { error: errorMessage });
            return fail(500, { message: `處理檔案時發生嚴重錯誤: ${errorMessage}` });
        }
    }
};
