// src/routes/api/borrow-events/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export async function GET({ url, locals }: RequestEvent) {
    try {
        // 1. 獲取前端傳來的時間範圍參數
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        // 2. 建立篩選條件 (Filter)
        // PocketBase 的日期比較需要符合格式。FullCalendar 傳來的是 ISO 字串，可以直接使用。
        // 我們篩選 borrow_date 或 expected_return_date 在此區間內的紀錄
        let filter = '';
        if (start && end) {
            // 簡單邏輯：借出時間小於結束時間 且 (歸還時間大於開始時間 或 尚未歸還)
            // 這裡先用簡單的篩選：只抓借出日期在範圍內的，或是狀態為 'borrowed' 的
            // 或是最單純的：不篩選，由前端過濾 (如果資料量不大)。
            // 為了效能，建議加上基本的日期篩選：
            filter = `borrow_date >= "${start}" && borrow_date <= "${end}"`;
        }

        // 3. 查詢資料 (改用字串 'borrow_records' 避免 import 錯誤)
        const records = await locals.pb.collection('borrow_records').getFullList({
            filter: filter,
            expand: 'asset,user',
            sort: '-borrow_date'
        });

        return json(records);

    } catch (error) {
        console.error('API Error fetching borrow records:', error);
        // 回傳 500 錯誤給前端
        return json(
            { error: 'Failed to fetch borrow records', details: String(error) },
            { status: 500 }
        );
    }
}