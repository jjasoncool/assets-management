import { getBorrowRecords, extendBorrowRecord } from '$lib/server/services/borrowService';
import type { PageServerLoad, Actions } from './$types';
import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { fail } from '@sveltejs/kit';

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

        // 【Debug】記錄載入的資料
        logger.log(`[BorrowList Load] 載入了 ${recordsResult.items.length} 筆記錄`);
        if (recordsResult.items.length > 0) {
            const firstRecord = recordsResult.items[0];
            logger.log(`[BorrowList Load] 第一筆記錄 expected_return_date: ${firstRecord.expected_return_date}`);
        }

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

export const actions: Actions = {
    /**
     * 延期借用記錄
     */
    extend: async ({ request, locals }) => {
        const pb = locals.pb as unknown as PocketBase;
        const currentUser = locals.user;

        // 檢查使用者是否登入
        if (!currentUser) {
            return fail(401, { message: '請先登入' });
        }

        try {
            const formData = await request.formData();
            const borrowRecordId = formData.get('borrowRecordId') as string;
            const newExpectedReturnDate = formData.get('newExpectedReturnDate') as string;
            const extensionReason = formData.get('extensionReason') as string | undefined;

            // 驗證必填欄位
            if (!borrowRecordId || !newExpectedReturnDate) {
                return fail(400, { message: '缺少必填欄位' });
            }

            // 呼叫 Service 執行延期
            await extendBorrowRecord(
                pb,
                borrowRecordId,
                newExpectedReturnDate,
                extensionReason || undefined
            );

            logger.log(`延期成功: Record ${borrowRecordId}, 新日期: ${newExpectedReturnDate}`);

            return { success: true };

        } catch (err: any) {
            logger.error('延期操作失敗:', err);
            return fail(500, {
                message: err.message || '延期失敗，請稍後再試'
            });
        }
    }
};
