import { getMaintenanceRecords } from '$lib/server/services/maintenanceService';
import { logger } from '$lib/utils/logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    try {
        const pb = locals.pb as any;

        // 從 URL 讀取篩選狀態，預設為 'completed'
        const status = url.searchParams.get('status') || 'completed';

        let filter = '';
        if (status === 'completed') {
            filter = 'complete_date != ""'; // 只顯示已完成的
        }
        // 當 status 為 'all' 或其他值時，filter 為空字串，表示獲取所有紀錄

        // 統一使用 getMaintenanceRecords 並指定一致的排序規則
        const recordsResult = await getMaintenanceRecords(pb, 1, 20, {
            filter: filter,
            sort: '-maintenance_date' // 總是按維護日期倒序排列
        });

        return {
            status, // 將當前狀態傳給前端
            records: JSON.parse(JSON.stringify(recordsResult)),
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
        };
    } catch (err) {
        logger.error('Failed to load maintenance history:', err);
        return {
            status: 'completed',
            records: null,
            currentUser: locals.user || null
        };
    }
};