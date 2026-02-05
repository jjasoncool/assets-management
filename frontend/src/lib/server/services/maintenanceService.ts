import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { Collections, type Asset } from '$lib/types'; // [修正] 引入 Asset 型別
import { updateAsset } from './assetService';
import { isAdmin } from './userService';

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
 * 獲取維護紀錄的分頁列表
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
 * 建立維護紀錄
 * @param pb PocketBase 實例
 * @param formData 表單資料
 * @param targetAssetStatus (選填) 更新資產狀態
 */
export async function createMaintenanceRecord(pb: PocketBase, formData: FormData, targetAssetStatus?: string) {
    try {
        // 1. 建立維護紀錄
        const record = await pb.collection(Collections.MaintenanceRecords).create(formData);

        // 2. 如果有指定目標狀態，同步更新資產
        if (targetAssetStatus) {
            const assetId = formData.get('asset') as string;
            if (assetId) {
                // [修正] 使用 'as Asset["status"]' 解決 TS2322 錯誤
                // 這是告訴 TS: "我保證傳進來的 string 是合法的 AssetStatus"
                await updateAsset(pb, assetId, {
                    status: targetAssetStatus as Asset['status']
                });

                logger.log(`同步更新資產 ${assetId} 狀態為: ${targetAssetStatus}`);
            }
        }

        logger.log('維護紀錄建立成功:', record.id);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        logger.error('建立維護紀錄失敗:', error);
        throw error;
    }
}

/**
 * 更新維護紀錄
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