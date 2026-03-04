import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { logger } from '$lib/utils/logger';

/**
 * GET /app-api/maintenance-events
 * 查詢特定時間範圍內的維護紀錄，供 FullCalendar 使用
 */
export async function GET({ url, locals }: RequestEvent) {
    // 檢查使用者是否登入
    if (!locals.user) {
        return json({ error: '使用者未授權' }, { status: 401 });
    }

    try {
        // 1. 獲取前端傳來的時間範圍參數 (由 FullCalendar 提供)
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        // 2. 建立篩選條件 (Filter)
        // 查詢預計維護日期 (`maintenance_date`) 在指定範圍內的紀錄
        let filter = '';
        if (start && end) {
            filter = `maintenance_date >= "${start}" && maintenance_date <= "${end}"`;
        }

        // 3. 查詢資料
        // 從 'maintenance_records' 集合中獲取完整列表
        const records = await locals.pb.collection('maintenance_records').getFullList({
            filter: filter,
            expand: 'asset', // 展開資產關聯，以獲取資產名稱
            sort: '-maintenance_date'
        });

        // 4. 回傳 JSON 格式的紀錄
        return json(records);

    } catch (error) {
        // 紀錄並回傳錯誤
        logger.error('API 錯誤：獲取維護紀錄失敗:', error);
        return json(
            { error: '無法獲取維護紀錄', details: String(error) },
            { status: 500 }
        );
    }
}
