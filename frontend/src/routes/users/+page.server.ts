import { error } from '@sveltejs/kit';
import { getUsersList, isAdmin } from '$lib/server/services/userService';
import type { PageServerLoad, Actions } from './$types';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ locals }) => {
	// 保護路由，只有管理員可以訪問
	if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
		throw error(403, 'Forbidden');
	}

	const users = await getUsersList(locals.pb, { asAdmin: true, expand: 'modified_by' });

	return {
		users
	};
};

/**
 * 處理使用者頁面的表單操作
 */
export const actions: Actions = {
	/**
	 * 發送密碼重設郵件
	 */
	resetPassword: async ({ locals, request }) => {
		// 再次確認使用者權限
		if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;

		// 驗證 email 是否存在
		if (!email) {
			logger.warn('Attempted to reset password without an email.');
			return { success: false, message: '缺少 Email 資訊，無法重設密碼。' };
		}

		try {
			// 呼叫 PocketBase SDK 發送密碼重設請求
			await locals.pb.collection('users').requestPasswordReset(email);
			logger.info(`Successfully requested password reset for user: ${email}`);
			return { success: true, message: `已將密碼重設郵件發送到 ${email}。` };
		} catch (err) {
			logger.error(`Failed to request password reset for user ${email}:`, err);
			return { success: false, message: '發送密碼重設郵件時發生錯誤，請稍後再試。' };
		}
	}
};
