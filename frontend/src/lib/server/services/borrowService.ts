import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { formatDateTime } from '$lib/utils/datetime';
import { Collections, type BorrowRecord } from '$lib/types'; // [修正] 引入 Collections Enum
import { getAsset, updateAsset } from './assetService';
import { isAdmin } from './userService';

// =================================================================
// 借還函式 (Server Side Only)
// =================================================================

/**
 * 獲取借還記錄的分頁列表
 */
export async function getBorrowRecords(pb: PocketBase, listOptions?: {
    filter?: string;
    sort?: string;
    page?: number;
    perPage?: number;
    expand?: string;
}) {
    try {
        // 使用 Collections.BorrowRecords (確保名稱一致)
        const records = await pb.collection(Collections.BorrowRecords).getList(
            listOptions?.page || 1,
            listOptions?.perPage || 50,
            {
                filter: listOptions?.filter || '',
                sort: listOptions?.sort || '-created',
                expand: listOptions?.expand || 'asset,user',
            }
        );
        return records;
    } catch (error) {
        logger.error('獲取借還記錄失敗:', error);
        throw error;
    }
}

/**
 * 獲取當前認證用戶的借還記錄
 */
export async function getMyBorrowRecords(pb: PocketBase, options?: {
    status?: string;
    page?: number;
    perPage?: number;
}) {
    try {
        const user = pb.authStore.record;
        if (!user) throw new Error('用戶未登入');

        let filter = `user = "${user.id}"`;
        // [修正] 處理多狀態查詢，例如 "borrowed,overdue"
        if (options?.status) {
            const statuses = options.status.split(',').map(s => s.trim()).filter(s => s);
            if (statuses.length > 0) {
                const statusFilter = statuses.map(s => `status = "${s}"`).join(' || ');
                filter += ` && (${statusFilter})`;
            }
        }

        return await getBorrowRecords(pb, {
            filter: filter,
            sort: '-created',
            page: options?.page,
            perPage: options?.perPage,
            expand: 'asset,user'
        });
    } catch (error) {
        logger.error('獲取我的借還記錄失敗:', error);
        throw error;
    }
}

/**
 * 獲取認證用戶當前借出的資產
 */
export async function getCurrentBorrowedAssets(pb: PocketBase) {
    try {
        const user = pb.authStore.record;
        if (!user) throw new Error('用戶未登入');

        return await getBorrowRecords(pb, {
            filter: `user = "${user.id}" && (status = "borrowed" || status = "overdue")`,
            expand: 'asset,user'
        });
    } catch (error) {
        logger.error('獲取當前借出資產失敗:', error);
        throw error;
    }
}

/**
 * 借出資產
 */
export async function borrowAsset(
    pb: PocketBase,
    assetId: string,
    expectedReturnDate: string,
    borrowImages?: File[],
    borrowerId?: string
) {
    try {
        const currentUser = pb.authStore.record;
        if (!currentUser) throw new Error('用戶未登入');

        let finalUserId = currentUser.id;

        // 如果指定了不同的借用者，檢查權限
        if (borrowerId && borrowerId !== currentUser.id) {
            if (!isAdmin(currentUser)) {
                throw new Error('權限不足：只有管理員才能為他人借用資產');
            }
            finalUserId = borrowerId;
        }

        const asset = await getAsset(pb, assetId);

        if (!asset.is_lendable) {
            throw new Error('此資產不提供借用');
        }

        if (asset.status !== 'active') {
            throw new Error(`資產狀態為 ${asset.status}，不可借用`);
        }

        const needsApproval = !!asset.requires_approval;
        const targetStatus = needsApproval ? 'pending' : 'borrowed';

        const formData = new FormData();
        formData.append('asset', assetId);
        formData.append('user', finalUserId); // 使用最終確認的 user ID
        // 使用 formatDateTime 統一時間格式與時區
        formData.append('borrow_date', formatDateTime(new Date()));
        formData.append('expected_return_date', expectedReturnDate);
        formData.append('status', targetStatus);

        if (borrowImages && borrowImages.length > 0) {
            for (const file of borrowImages) {
                formData.append('borrow_images', file);
            }
        }

        const borrowRecord = await pb.collection(Collections.BorrowRecords).create(formData);

        if (targetStatus === 'borrowed') {
            await updateAsset(pb, assetId, { status: 'borrowed' });
            logger.log('資產借出成功 (登記制):', borrowRecord.id);
        } else {
            logger.log('借用申請已送出 (審核制):', borrowRecord.id);
        }

        return borrowRecord as unknown as BorrowRecord;
    } catch (error) {
        logger.error('借出資產失敗:', error);
        throw error;
    }
}


/**
 * 透過資產紀錄 ID (record id) 借出資產，支援單筆或多筆
 *
 */
export async function borrowAssetsByIds(
    pb: PocketBase,
    assetIds: string[], // 這裡是資產的紀錄 ID 陣列 (e.g., ["a9b8c7d6e5f4", "g5h6i7j8k9l0"])
    userId: string,
    expectedReturnDate: string,
    borrowImages?: File[]
) {
    const successfulRecords: BorrowRecord[] = [];
    const failedAssets: { assetId: string; error: string }[] = [];

    // 針對每一個傳入的 assetId (record ID) 進行處理
    for (const assetId of assetIds) {
        try {
            // 直接呼叫單筆借用的函式
            const record = await borrowAsset(
                pb,
                assetId, // 傳入的是資料庫紀錄的 ID
                expectedReturnDate,
                borrowImages,
                userId
            );
            successfulRecords.push(record);

        } catch (err: any) {
            let errorMessage = err.message;
            if (err instanceof Error && err.name === 'ClientResponseError') {
                errorMessage = `找不到對應的資產或該資產目前不可借用`;
            }
            logger.error(`[Multi-Borrow] Asset ID (${assetId}) 借用失敗:`, errorMessage);
            failedAssets.push({ assetId, error: errorMessage });
        }
    }

    // 如果有任何一筆失敗，就整理錯誤訊息並拋出例外
    if (failedAssets.length > 0) {
        const errorDetails = failedAssets.map(f => `ID ${f.assetId}: ${f.error}`).join('\n');
        throw new Error(`部分資產借用失敗:\n${errorDetails}`);
    }

    // 如果全部成功，返回成功的紀錄
    return successfulRecords;
}

/**
 * 獲取所有待處理的借用請求 (供管理員使用)
 */
export async function getPendingRequests(pb: PocketBase, page = 1, perPage = 50) {
    try {
        const user = pb.authStore.record;
        if (!isAdmin(user)) throw new Error('權限不足');

        return await getBorrowRecords(pb, {
            filter: 'status = "pending"',
            sort: '-created',
            page,
            perPage,
            expand: 'asset,user'
        });
    } catch (error) {
        logger.error('獲取待處理請求失敗:', error);
        throw error;
    }
}

/**
 * 核准借用請求 (管理員使用)
 */
export async function approveBorrow(pb: PocketBase, borrowRecordId: string) {
    try {
        const user = pb.authStore.record;
        if (!isAdmin(user)) throw new Error('權限不足');

        const record = await pb.collection(Collections.BorrowRecords).getOne(borrowRecordId);
        if (record.status !== 'pending') throw new Error('此記錄非待處理狀態');

        const updatedRecord = await pb.collection(Collections.BorrowRecords).update(borrowRecordId, {
            status: 'borrowed',
            // 使用 formatDateTime 統一時間格式與時區
            borrow_date: formatDateTime(new Date())
        });

        if (record.asset) {
            await updateAsset(pb, record.asset, { status: 'borrowed' });
        }

        logger.log('借用請求已核准:', updatedRecord.id);
        return updatedRecord as unknown as BorrowRecord;
    } catch (error) {
        logger.error('核准借用失敗:', error);
        throw error;
    }
}

/**
 * 拒絕借用請求 (管理員使用)
 */
export async function rejectBorrow(pb: PocketBase, borrowRecordId: string) {
    try {
        const user = pb.authStore.record;
        if (!isAdmin(user)) throw new Error('權限不足');

        const updatedRecord = await pb.collection(Collections.BorrowRecords).update(borrowRecordId, {
            status: 'rejected'
        });

        logger.log('借用請求已拒絕:', updatedRecord.id);
        return updatedRecord as unknown as BorrowRecord;
    } catch (error) {
        logger.error('拒絕借用失敗:', error);
        throw error;
    }
}

/**
 * 獲取特定資產的當前有效借用記錄 (供歸還使用)
 */
export async function getActiveBorrowRecordForAsset(pb: PocketBase, assetId: string) {
    try {
        const user = pb.authStore.record;
        if (!user) throw new Error('用戶未登入');

        const records = await pb.collection(Collections.BorrowRecords).getFullList({
            filter: `asset = "${assetId}" && (status = "borrowed" || status = "overdue")`,
            sort: '-created',
            expand: 'asset,user'
        });

        if (records.length === 0) {
            throw new Error('找不到此資產的有效借用記錄');
        }

        const record = records[0];
        const userIsAdmin = isAdmin(user);
        const isBorrower = record.user === user.id;

        if (!isBorrower && !userIsAdmin) {
            throw new Error('您無權操作此借用記錄');
        }

        return record as unknown as BorrowRecord;
    } catch (error) {
        logger.error('獲取資產的有效借用記錄失敗:', error);
        throw error;
    }
}

/**
 * 歸還借出的資產
 */
export async function returnAsset(pb: PocketBase, borrowRecordId: string, returnImages?: File[]) {
    try {
        const user = pb.authStore.record;
        if (!user) throw new Error('用戶未登入');

        const borrowRecord = await pb.collection(Collections.BorrowRecords).getOne(borrowRecordId);

        // 冪等性檢查：如果資產不是處於可歸還狀態，直接返回成功，避免重複操作或錯誤
        if (borrowRecord.status !== 'borrowed' && borrowRecord.status !== 'overdue') {
            logger.warn(`歸還操作被略過：資產狀態已為 "${borrowRecord.status}" (Record ID: ${borrowRecordId})`);
            return borrowRecord as unknown as BorrowRecord;
        }

        const userIsAdmin = isAdmin(user);
        const isBorrower = borrowRecord.user === user.id;

        if (!isBorrower && !userIsAdmin) {
            throw new Error('權限不足：您只能歸還自己借用的資產');
        }

        const formData = new FormData();
        formData.append('status', 'returned');
        formData.append('return_date', formatDateTime(new Date())); // 寫入實際歸還時間

        if (returnImages && returnImages.length > 0) {
            for (const file of returnImages) {
                formData.append('return_images', file);
            }
        }

        const updatedRecord = await pb.collection(Collections.BorrowRecords).update(borrowRecordId, formData);

        const assetId = (borrowRecord as any).asset;
        if (assetId) {
            await updateAsset(pb, assetId, { status: 'active' });
        }

        logger.log('資產歸還成功:', updatedRecord.id);
        return updatedRecord as unknown as BorrowRecord;
    } catch (error) {
        logger.error('歸還資產失敗:', error);
        throw error;
    }
}

/**
 * 檢查資產是否可供借用
 */
export async function checkAssetAvailability(pb: PocketBase, assetId: string) {
    try {
        const asset = await getAsset(pb, assetId);
        return asset.is_lendable && asset.status === 'active';
    } catch (error) {
        logger.error('檢查資產可用性失敗:', error);
        return false;
    }
}

/**
 * 檢查並更新逾期狀態
 */
export async function updateOverdueRecords(pb: PocketBase) {
    try {
        // 使用 formatDateTime 獲取統一格式的當前時間，用於過濾
        const today = formatDateTime(new Date());

        const overdueRecords = await pb.collection(Collections.BorrowRecords).getFullList({
            filter: `status = "borrowed" && expected_return_date < "${today}"`
        });

        let count = 0;
        for (const record of overdueRecords) {
            await pb.collection(Collections.BorrowRecords).update(record.id, { status: 'overdue' });
            count++;
        }

        if (count > 0) {
            logger.log(`已更新 ${count} 筆逾期記錄`);
        }
        return count;
    } catch (error) {
        logger.error('更新逾期記錄失敗:', error);
        throw error;
    }
}

/**
 * 延期借用記錄
 * @param pb PocketBase 實例
 * @param borrowRecordId 借用記錄 ID
 * @param newExpectedReturnDate 新的預計歸還日期 (YYYY-MM-DD 格式)
 * @param extensionReason 延期理由（選填）
 */
export async function extendBorrowRecord(
    pb: PocketBase,
    borrowRecordId: string,
    newExpectedReturnDate: string,
    extensionReason?: string
) {
    try {
        const currentUser = pb.authStore.record;
        if (!currentUser) throw new Error('用戶未登入');

        // 1. 獲取借用記錄
        const borrowRecord = await pb.collection(Collections.BorrowRecords).getOne(borrowRecordId, {
            expand: 'asset,user'
        });

        // 2. 權限驗證：只有借用人本人或管理員可以延期
        const isBorrower = borrowRecord.user === currentUser.id;
        const userIsAdmin = isAdmin(currentUser);

        if (!isBorrower && !userIsAdmin) {
            throw new Error('權限不足：您只能延期自己借用的資產');
        }

        // 3. 狀態驗證：只能延期 borrowed 或 overdue 狀態的記錄
        if (borrowRecord.status !== 'borrowed' && borrowRecord.status !== 'overdue') {
            throw new Error(`此記錄狀態為 ${borrowRecord.status}，無法延期`);
        }

        // 4. 日期驗證：新日期必須晚於當前預計歸還日期
        const currentExpectedDate = new Date(borrowRecord.expected_return_date);
        const newExpectedDate = new Date(newExpectedReturnDate);

        if (newExpectedDate <= currentExpectedDate) {
            throw new Error('新的歸還日期必須晚於當前預計歸還日期');
        }

        // 5. 建立延期記錄文字
        const extensionTimestamp = formatDateTime(new Date());
        const operatorName = userIsAdmin && !isBorrower
            ? `${currentUser.name || currentUser.email} (管理員)`
            : currentUser.name || currentUser.email;

        const extensionLog = `[延期] ${extensionTimestamp} 由 ${operatorName} 延期至 ${newExpectedReturnDate} (原: ${borrowRecord.expected_return_date.split(' ')[0]})${extensionReason ? `\n理由: ${extensionReason}` : ''}`;

        // 6. 追加到 remark 欄位（保留原有內容）
        const currentRemark = borrowRecord.remark || '';
        const newRemark = currentRemark
            ? `${currentRemark}\n\n${extensionLog}`
            : extensionLog;

        // 7. 更新記錄
        const formattedDateForPB = newExpectedReturnDate; // 只傳 YYYY-MM-DD

        // 建構更新資料物件
        const updateData: Record<string, any> = {
            expected_return_date: formattedDateForPB,
            remark: newRemark
        };

        // 如果是從逾期延期，狀態改回 'borrowed'
        if (borrowRecord.status === 'overdue') {
            updateData.status = 'borrowed';
        }

        const updatedRecord = await pb.collection(Collections.BorrowRecords).update(
            borrowRecordId,
            updateData
        );

        logger.log(`借用記錄已延期: ${borrowRecordId}, 新日期: ${formattedDateForPB}`);
        return updatedRecord as unknown as BorrowRecord;

    } catch (error) {
        logger.error('延期借用記錄發生例外錯誤:', error);
        throw error;
    }
}
