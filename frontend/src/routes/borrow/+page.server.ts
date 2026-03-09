import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUsersList, isAdmin } from '$lib/server/services/userService';
import { borrowAssetsByIds } from '$lib/server/services/borrowService';
import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { Collections } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const pb = locals.pb as unknown as PocketBase;
        const user = locals.user;

        // 根據使用者權限，決定可以顯示在 "借用人" 下拉選單中的使用者列表
        const borrowableUsers = isAdmin(user)
            ? await getUsersList(pb)
            : user
              ? [user]
              : [];

        // [新增] 獲取所有可借用的資產列表
        // 條件：is_lendable 為 true 且 status 為 'active'
        const borrowableAssets = await pb.collection(Collections.Assets).getFullList({
            filter: `is_lendable = true && status = 'active'`,
            sort: 'name'
        });

        return {
            borrowableAssets: JSON.parse(JSON.stringify(borrowableAssets)),
            borrowableUsers: JSON.parse(JSON.stringify(borrowableUsers)),
            currentUser: user ? JSON.parse(JSON.stringify(user)) : null
        };
    } catch (err) {
        logger.error('載入借用頁面資料失敗:', err);
        return {
            borrowableAssets: [],
            borrowableUsers: [],
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null,
            error: `無法載入頁面: ${(err as Error).message}`
        };
    }
};

export const actions: Actions = {
    // 專門用於處理 "從無到有" 的借用紀錄建立
    create: async ({ request, locals }) => {
        const formData = await request.formData();

        // [修改] 從表單中獲取資料 (可能為多筆資產)
        const assetIds = formData.getAll('asset_ids') as string[];
        const returnDate = formData.get('expected_return_date') as string;
        const images = formData.getAll('borrow_images').filter((f): f is File => f instanceof File && f.size > 0);
        const userId = formData.get('user') as string;

        // [修改] 欄位驗證
        if (assetIds.length === 0 || !returnDate || !userId) {
            logger.error('驗證失敗', { assetIds, returnDate, userId });
            return fail(400, {
                data: Object.fromEntries(formData),
                error: '請至少選擇一項資產，並填寫預計歸還日期和借用人。'
            });
        }

        try {
            // [修改] 呼叫支援多筆的 Service Function
            await borrowAssetsByIds(
                locals.pb as unknown as PocketBase,
                assetIds, // 直接傳入 ID 陣列
                userId,
                returnDate,
                images
            );
            return { success: true, message: `已成功建立 ${assetIds.length} 筆借用紀錄！` };
        } catch (err: any) {
            logger.error('建立借用紀錄時發生錯誤:', err);
            return fail(500, {
                data: Object.fromEntries(formData),
                error: err.message || '建立借用紀錄失敗'
            });
        }
    }
};
