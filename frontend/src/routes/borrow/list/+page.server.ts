import { getBorrowRecords } from '$lib/server/services/borrowService';
import type { PageServerLoad } from './$types';
import type PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals, url }) => {
    // 從 locals 獲取 PocketBase 實例與使用者 (由 hooks.server.ts 注入)
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

    // 3. 呼叫後端 Service 獲取資料
    // 注意：我們不需要 try-catch 包覆所有東西，讓 SvelteKit 處理嚴重的 Server Error
    // 如果需要特定的錯誤 UI，可以在這裡處理並回傳 error 物件
    const recordsResult = await getBorrowRecords(pb as unknown as PocketBase, {
        filter: filterParts.join(' && '),
        page,
        perPage: 10,
        sort: '-created',
        expand: 'user,asset'
    });

    // 4. 回傳資料 (SvelteKit 會自動序列化)
    return {
        recordsResult: JSON.parse(JSON.stringify(recordsResult)), // 確保 POJO 序列化
        viewMode,
        filterStatus,
        page
    };
};