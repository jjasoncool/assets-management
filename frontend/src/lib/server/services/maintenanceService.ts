import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { Collections, type Asset } from '$lib/types';
import { updateAsset } from './assetService';

// =================================================================
// 讀取邏輯 (Read Operations)
// =================================================================

/**
 * 獲取維護表單所需的選項 (如資產列表)
 */
export async function getMaintenanceFormOptions(pb: PocketBase) {
    try {
        const assets = await pb.collection(Collections.Assets).getFullList({
            sort: 'name',
            fields: 'id,name,asset_id,status'
        });

        return {
            assets: assets ? JSON.parse(JSON.stringify(assets)) : []
        };
    } catch (error) {
        logger.error('獲取維護表單選項失敗:', error);
        return { assets: [] };
    }
}

/**
 *  獲取維護紀錄的分頁列表
 */
export async function getMaintenanceRecords(pb: PocketBase, page = 1, perPage = 20, options?: {
    filter?: string;
    sort?: string;
    expand?: string;
}) {
    try {
        const records = await pb.collection(Collections.MaintenanceRecords).getList(page, perPage, {
            filter: options?.filter || '',
            sort: options?.sort || '-maintenance_date',
            expand: options?.expand || 'asset,performed_by'
        });

        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        logger.error('獲取維護紀錄列表失敗:', error);
        throw error;
    }
}

/**
 * [新增] 獲取 [已完成] 的維護歷史紀錄 (complete_date != "")
 * 用於維護首頁 (History)
 */
export async function getCompletedMaintenanceRecords(pb: PocketBase, page = 1, perPage = 20) {
    try {
        const records = await pb.collection(Collections.MaintenanceRecords).getList(page, perPage, {
            filter: 'complete_date != ""',
            sort: '-complete_date',
            expand: 'asset,performed_by'
        });

        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        logger.error('獲取歷史維護紀錄列表失敗:', error);
        throw error;
    }
}

/**
 * [新增] 獲取 [進行中] 的維護紀錄 (complete_date = "")
 * 用於 In-Progress 頁面
 */
export async function getIncompleteMaintenanceRecords(pb: PocketBase, page = 1, perPage = 50) {
    try {
        const records = await pb.collection(Collections.MaintenanceRecords).getList(page, perPage, {
            filter: 'complete_date = ""',
            sort: '-maintenance_date',
            expand: 'asset,performed_by'
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        logger.error('獲取進行中維護紀錄失敗:', error);
        throw error;
    }
}

/**
 * 獲取單一維護紀錄詳情
 */
export async function getMaintenanceRecord(pb: PocketBase, id: string) {
    try {
        const record = await pb.collection(Collections.MaintenanceRecords).getOne(id, {
            expand: 'asset,performed_by'
        });
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        logger.error(`獲取維護紀錄 ${id} 失敗:`, error);
        throw error;
    }
}

/**
 * 獲取特定資產的所有維護歷史
 */
export async function getAssetMaintenanceHistory(pb: PocketBase, assetId: string) {
    try {
        const records = await pb.collection(Collections.MaintenanceRecords).getFullList({
            filter: `asset = "${assetId}"`,
            sort: '-maintenance_date',
            expand: 'performed_by'
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        logger.error(`獲取資產 ${assetId} 維護歷史失敗:`, error);
        throw error;
    }
}

// =================================================================
// 寫入邏輯 (Write Operations)
// =================================================================

/**
 * [修改] 建立維護紀錄 (開始維護)
 * 動作：建立紀錄 + 將資產狀態改為 'maintenance'
 */
export async function createMaintenanceRecord(pb: PocketBase, formData: FormData) {
    try {
        // 1. 建立維護紀錄 (此時 complete_date 為空，代表進行中)
        const record = await pb.collection(Collections.MaintenanceRecords).create(formData);

        // 2. 同步將資產狀態改為 'maintenance'
        const assetId = formData.get('asset') as string;
        if (assetId) {
            // 使用 Type Assertion 確保狀態型別正確
            await updateAsset(pb, assetId, {
                status: 'maintenance' as Asset['status']
            });
            logger.log(`資產 ${assetId} 狀態已更新為: maintenance`);
        }

        logger.log('維護紀錄建立成功 (開始維修):', record.id);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        logger.error('建立維護紀錄失敗:', error);
        throw error;
    }
}

/**
 * [修改] 完成維護 (結案)
 * 邏輯：
 * 1. 更新此維護單 (日期 + Append 照片)
 * 2. 檢查該資產是否還有其他「未完成」的維護單
 * 3. 如果沒有其他未完成單據，才將資產改回 active
 */
export async function completeMaintenanceRecord(
    pb: PocketBase,
    recordId: string,
    assetId: string,
    completeDate: string,
    proofImages?: File[]
) {
    try {
        // 1. 準備更新資料
        // 使用 formData 是為了方便處理 File 上傳，且 PocketBase SDK 支援傳入 object 包含 File
        const updateData: any = {
            complete_date: completeDate
        };

        // 處理照片 Append (關鍵修改: 使用 'maintenance_images+' key)
        if (proofImages && proofImages.length > 0) {
            // 注意：PocketBase JS SDK 處理 multiple files append 的方式
            // key 必須包含 '+'
            updateData['maintenance_images+'] = proofImages;
        }

        // 更新維護紀錄
        const record = await pb.collection(Collections.MaintenanceRecords).update(recordId, updateData);
        logger.log(`維護紀錄 ${recordId} 已標記完成`);

        // 2. [關鍵邏輯] 檢查是否還有該資產的「未完成工單」
        // 我們查詢該資產所有 complete_date 為空的紀錄
        const remainingJobs = await pb.collection(Collections.MaintenanceRecords).getList(1, 1, {
            filter: `asset = "${assetId}" && complete_date = ""`,
            fields: 'id' // 只需檢查數量，優化效能
        });

        // 3. 只有當剩餘工單數為 0 時，才把資產改回 Active
        if (remainingJobs.totalItems === 0) {
            await updateAsset(pb, assetId, {
                status: 'active' as Asset['status']
            });
            logger.log(`資產 ${assetId} 所有維護已完成，狀態改回 active`);
        } else {
            logger.log(`資產 ${assetId} 仍有 ${remainingJobs.totalItems} 筆未完成工單，狀態維持 maintenance`);
        }

        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        logger.error(`完成維護紀錄 ${recordId} 失敗:`, error);
        throw error;
    }
}

/**
 * 更新維護紀錄 (一般編輯內容用，不涉及狀態切換)
 */
export async function updateMaintenanceRecord(pb: PocketBase, id: string, formData: FormData) {
    try {
        const user = pb.authStore.record;
        if (!user) throw new Error('用戶未登入');

        const record = await pb.collection(Collections.MaintenanceRecords).update(id, formData);

        logger.log(`維護紀錄 ${id} 更新成功`);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        logger.error(`更新維護紀錄 ${id} 失敗:`, error);
        throw error;
    }
}

/**
 * 刪除維護紀錄
 */
export async function deleteMaintenanceRecord(pb: PocketBase, id: string) {
    try {
        await pb.collection(Collections.MaintenanceRecords).delete(id);
        logger.log(`維護紀錄 ${id} 刪除成功`);
    } catch (error) {
        logger.error(`刪除維護紀錄 ${id} 失敗:`, error);
        throw error;
    }
}

// =================================================================
// 統計與分析 (Stats & Analysis)
// =================================================================

/**
 * 獲取維護成本統計
 */
export async function getMaintenanceStats(pb: PocketBase, filter: string = '') {
    try {
        const records = await pb.collection(Collections.MaintenanceRecords).getFullList({
            filter: filter,
            fields: 'cost,maintenance_type',
        });

        const stats = {
            totalCost: 0,
            count: records.length,
            byType: {
                preventive: { count: 0, cost: 0 },
                corrective: { count: 0, cost: 0 },
                inspection: { count: 0, cost: 0 }
            }
        };

        records.forEach((r: any) => {
            const cost = r.cost || 0;
            const type = r.maintenance_type as keyof typeof stats.byType || 'other';

            stats.totalCost += cost;

            if (stats.byType[type]) {
                stats.byType[type].count++;
                stats.byType[type].cost += cost;
            }
        });

        return stats;
    } catch (error) {
        logger.error('獲取維護統計失敗:', error);
        return { totalCost: 0, count: 0, byType: {} };
    }
}