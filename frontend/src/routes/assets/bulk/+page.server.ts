import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { isAdmin, getUsersList } from '$lib/server/services/userService';
import { calculateNextAssetIdAndSequence } from '$lib/server/services/assetService';
import { normalizeDateForComparison } from '$lib/utils/datetime';
import type { Asset, AssetCategory } from '$lib/types';
import * as XLSX from 'xlsx';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const normalizeExcelDateSerial = (value: number) => {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';

    return [
        String(parsed.y).padStart(4, '0'),
        String(parsed.m).padStart(2, '0'),
        String(parsed.d).padStart(2, '0')
    ].join('-');
};

const normalizeImportedPurchaseDate = (value: unknown, rowIndex: number) => {
    if (value === undefined || value === null || value === '') return undefined;

    const normalizedDate = typeof value === 'number'
        ? normalizeExcelDateSerial(value)
        : normalizeDateForComparison(value);

    if (dateOnlyPattern.test(normalizedDate)) return normalizedDate;

    logger.warn(`Invalid purchase date format at row ${rowIndex}: ${String(value)}`);
    return undefined;
};

const normalizeComparableValue = (value: unknown) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const normalizeMultilineValue = (value: unknown) => {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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

const fieldLabels: Record<string, string> = {
    category: '資產類別',
    name: '資產名稱',
    brand: '品牌',
    model: '型號',
    serial_number: '序號',
    purchase_date: '購買日期',
    warranty_years: '原廠維護年限',
    location: '存放位置',
    department: '部門',
    assigned_to: '保管人',
    notes: '備註',
    confidentiality_score: '機密性',
    integrity_score: '完整性',
    availability_score: '可用性',
    total_risk_score: '風險總分'
};

type DisplayMaps = {
    categories?: Map<string, string>;
    users?: Map<string, string>;
};

type ImportChange = {
    field: string;
    label: string;
    before: string;
    after: string;
};

type ImportResult = {
    success: boolean;
    action?: 'created' | 'updated' | 'unchanged' | 'failed' | 'skipped';
    message: string;
    asset_id?: string;
    changes?: ImportChange[];
    data?: Record<string, unknown>;
};

const formatChangeValue = (field: string, value: unknown, displayMaps?: DisplayMaps) => {
    if (field === 'purchase_date') {
        return normalizeDateForComparison(value) || '空白';
    }

    if (field === 'notes') {
        return normalizeMultilineValue(value) || '空白';
    }

    const normalizedValue = normalizeComparableValue(value);
    if (!normalizedValue) return '空白';

    if (field === 'category') {
        return displayMaps?.categories?.get(normalizedValue) || normalizedValue;
    }

    if (field === 'assigned_to') {
        return displayMaps?.users?.get(normalizedValue) || normalizedValue;
    }

    return normalizedValue;
};

const isBlankExcelRow = (row: Record<string, unknown>) => {
    return Object.values(row).every(value => normalizeComparableValue(value) === '');
};

const buildImportDetail = (
    rowData: Record<string, any>,
    categoryName: string,
    assetId: string,
    sheetName: string,
    rowIndex: number,
    assignedToDisplay: string
) => ({
    sheetName,
    rowIndex,
    asset_id: assetId,
    name: rowData.name,
    category: categoryName,
    brand: rowData.brand,
    model: rowData.model,
    serial_number: rowData.serial_number,
    purchase_date: normalizeDateForComparison(rowData.purchase_date),
    warranty_years: rowData.warranty_years,
    location: rowData.location,
    department: rowData.department,
    assigned_to: assignedToDisplay,
    notes: rowData.notes,
    confidentiality_score: rowData.confidentiality_score,
    integrity_score: rowData.integrity_score,
    availability_score: rowData.availability_score,
    total_risk_score:
        rowData.confidentiality_score + rowData.integrity_score + rowData.availability_score
});

const getAssetChanges = (
    existingAsset: Record<string, any>,
    assetData: Record<string, any>,
    displayMaps?: DisplayMaps
): ImportChange[] => {
    const changes: ImportChange[] = [];

    for (const field of compareTextFields) {
        const normalizeValue = field === 'notes' ? normalizeMultilineValue : normalizeComparableValue;
        if (normalizeValue(existingAsset[field]) !== normalizeValue(assetData[field])) {
            changes.push({
                field,
                label: fieldLabels[field],
                before: formatChangeValue(field, existingAsset[field], displayMaps),
                after: formatChangeValue(field, assetData[field], displayMaps)
            });
        }
    }

    for (const field of compareNumberFields) {
        if (Number(existingAsset[field] || 0) !== Number(assetData[field] || 0)) {
            changes.push({
                field,
                label: fieldLabels[field],
                before: formatChangeValue(field, existingAsset[field], displayMaps),
                after: formatChangeValue(field, assetData[field], displayMaps)
            });
        }
    }

    const purchaseDateUnchanged =
        normalizeDateForComparison(existingAsset.purchase_date) === normalizeDateForComparison(assetData.purchase_date);
    if (!purchaseDateUnchanged) {
        changes.push({
            field: 'purchase_date',
            label: fieldLabels.purchase_date,
            before: formatChangeValue('purchase_date', existingAsset.purchase_date, displayMaps),
            after: formatChangeValue('purchase_date', assetData.purchase_date, displayMaps)
        });
    }

    return changes;
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
        const results: ImportResult[] = [];
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

            const categoryDisplayMap = new Map<string, string>(allCategories.map(c => [c.id, c.name]));

            // 建立 name -> user 對應，避免在迴圈中重複查詢資料庫
            const userMap = new Map<string, any>();
            const userDisplayMap = new Map<string, string>();
            for (const u of allUsers) {
                if (u.name) userMap.set(u.name, u);
                // 也可以支援用 email 搜尋
                if (u.email) userMap.set(u.email, u);
                userDisplayMap.set(u.id, u.name || u.email || u.id);
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

                        const parsedDate = normalizeImportedPurchaseDate(
                            row['購買日期'] || row['Purchase Date'],
                            rowIndex
                        );

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
                            notes: normalizeMultilineValue(row['備註'] ?? row['Notes'] ?? ''),
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
                            let assignedToDisplay = '';
                            if (rowData.assigned_to_username) {
                                const matchedUser = userMap.get(rowData.assigned_to_username);
                                if (!matchedUser) {
                                    throw new Error(`找不到保管人: ${rowData.assigned_to_username}`);
                                }
                                assigned_to_user_id = matchedUser.id;
                                assignedToDisplay = matchedUser.name || matchedUser.email || matchedUser.id;
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
                                    const changes = getAssetChanges(existingAsset, baseAssetData, {
                                        categories: categoryDisplayMap,
                                        users: userDisplayMap
                                    });

                                    if (changes.length === 0) {
                                        results.push({ success: true, action: 'unchanged', asset_id: rowData.asset_id, message: `資產 ${rowData.asset_id} 無變更，已略過更新。` });
                                        skippedCount++;
                                        unchangedCount++;
                                        continue;
                                    }

                                    await pb.collection('assets').update(existingAsset.id, baseAssetData);
                                    results.push({
                                        success: true,
                                        action: 'updated',
                                        asset_id: rowData.asset_id,
                                        message: `成功更新資產 ${rowData.asset_id}`,
                                        changes,
                                        data: buildImportDetail(
                                            rowData,
                                            category.name,
                                            rowData.asset_id,
                                            sheetName,
                                            rowIndex,
                                            assignedToDisplay
                                        )
                                    });
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

                                results.push({
                                    success: true,
                                    action: 'created',
                                    asset_id: new_asset_id,
                                    message: `成功建立資產 ${new_asset_id}`,
                                    data: buildImportDetail(
                                        rowData,
                                        category.name,
                                        new_asset_id,
                                        sheetName,
                                        rowIndex,
                                        assignedToDisplay
                                    )
                                });
                                createdCount++;
                            }

                        } catch (err: unknown) {
                            failedCount++;
                            const errorMessage = err instanceof Error ? err.message : '未知錯誤';
                            results.push({
                                success: false,
                                action: 'failed',
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
