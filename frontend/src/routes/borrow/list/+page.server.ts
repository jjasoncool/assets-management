import { getBorrowRecords } from '$lib/server/services/borrowService';
import type { PageServerLoad } from './$types';
import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ locals, url }) => {
    const pb = locals.pb;
    const currentUser = locals.user;

    // 1. 解析 URL 查詢參數
    const page = Number(url.searchParams.get('page')) || 1;
    const filterStatus = url.searchParams.get('status') || '';

    // viewMode: 如果網址沒參數，管理員預設 'all'，一般人預設 'my'
    const defaultViewMode = currentUser?.role?.includes('admin') ? 'all' : 'my';
    const viewMode = url.searchParams.get('viewMode') || defaultViewMode;

    // 2. 建構過濾條件
    let filterParts: string[] = [];

    if (filterStatus) {
        filterParts.push(`status = "${filterStatus}"`);
    }

    // 在 admin 'all' 模式顯示全部，否則只顯示自己的
    // 非管理員強制只能看自己的
    if (viewMode === 'my' || !currentUser?.role?.includes('admin')) {
        if (currentUser) {
            filterParts.push(`user = "${currentUser.id}"`);
        }
    }

    // 3. 呼叫後端 Service 獲取資料 (加入錯誤處理)
    try {
        const recordsResult = await getBorrowRecords(pb as unknown as PocketBase, {
            filter: filterParts.join(' && '),
            page,
            perPage: 10,
            sort: '-created',
            expand: 'user,asset'
        });

        // 成功回傳
        return {
            recordsResult: JSON.parse(JSON.stringify(recordsResult)),
            viewMode,
            filterStatus,
            page,
            currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null
        };

    } catch (err: any) {
        // [安全網] 發生錯誤時紀錄 Log，但回傳空資料讓頁面能正常顯示，避免無限 Loading
        logger.error('Failed to load borrow records:', err);

        return {
            recordsResult: {
                page: 1,
                perPage: 10,
                totalItems: 0,
                totalPages: 0,
                items: []
            },
            viewMode,
            filterStatus,
            page,
            currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
            error: '無法載入資料，請稍後再試'
        };
    }
};
