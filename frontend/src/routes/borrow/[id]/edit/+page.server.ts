import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getBorrowRecordById, updateBorrowRecord, deleteBorrowRecord } from '$lib/server/services/borrowService';
import { getUsersList, isAdmin } from '$lib/server/services/userService';
import { logger } from '$lib/utils/logger';
import type PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { id } = params;
	const pb = locals.pb as unknown as PocketBase;
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	try {
		const borrowRecord = await getBorrowRecordById(pb, id);

		// 權限檢查：是否為本人或管理員
		const isOwner = borrowRecord.user === currentUser.id;
		const userIsAdmin = isAdmin(currentUser);

		if (!isOwner && !userIsAdmin) {
			throw error(403, { message: '權限不足，您無法編輯此筆紀錄。' });
		}

		// 時間檢查：是否在 24 小時內
		const createdDate = new Date(borrowRecord.created);
		const now = new Date();
		const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

		if (hoursDiff > 24) {
			throw error(403, { message: '編輯時限已過 (超過 24 小時)，無法更新。' });
		}

		// 獲取可作為 "借用人" 的使用者列表
        const borrowableUsers = userIsAdmin
            ? await getUsersList(pb)
            : [currentUser];

		return {
			record: JSON.parse(JSON.stringify(borrowRecord)),
            borrowableUsers: JSON.parse(JSON.stringify(borrowableUsers))
		};

	} catch (err: any) {
		logger.error(`載入借用紀錄 (ID: ${id}) 進行編輯時失敗:`, err);
		throw error(404, { message: `找不到該筆借用紀錄或載入時發生錯誤: ${err.message}` });
	}
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const { id } = params;
		const pb = locals.pb as unknown as PocketBase;
		const formData = await request.formData();

        // 驗證必填欄位
        const expectedReturnDate = formData.get('expected_return_date');
        const remark = formData.get('remark');
        if (!expectedReturnDate || !remark) {
            return fail(400, {
                error: '預計歸還日期和事由為必填欄位。'
            });
        }

		try {
			await updateBorrowRecord(pb, id, formData);
		} catch (err: any) {
			logger.error(`更新借用紀錄 (ID: ${id}) 失敗:`, err);
			return fail(500, {
				error: `更新失敗: ${err.message}`
			});
		}

		throw redirect(303, '/borrow/list');
	},

    delete: async ({ locals, params }) => {
        const { id } = params;
        const pb = locals.pb as unknown as PocketBase;

        try {
            await deleteBorrowRecord(pb, id);
        } catch (err: any) {
            logger.error(`刪除借用紀錄 (ID: ${id}) 失敗:`, err);
            return fail(500, {
                error: `刪除失敗: ${err.message}`
            });
        }

        throw redirect(303, '/borrow/list');
    }
};
