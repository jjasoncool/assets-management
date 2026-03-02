import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { logger } from '$lib/utils/logger';

/**
 * 處理密碼重設表單的提交
 */
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const token = formData.get('token') as string;
		const password = formData.get('password') as string;
		const passwordConfirm = formData.get('passwordConfirm') as string;

		if (!token) {
			return fail(400, { error: true, message: '遺失 Token，無法重設密碼。' });
		}

		if (!password || !passwordConfirm) {
			return fail(400, { error: true, message: '請輸入新密碼並確認。' });
		}

		if (password !== passwordConfirm) {
			return fail(400, { data: { password, passwordConfirm }, error: true, message: '兩次輸入的密碼不一致。' });
		}

		try {
			// 呼叫 PocketBase SDK 進行密碼重設確認
			await locals.pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
			logger.info('A user successfully reset their password.');
		} catch (err: any) {
			logger.error('Failed to confirm password reset:', err);

			// 根據 PocketBase 回傳的錯誤，提供更具體的訊息
			const message = err.message?.includes('Failed to authenticate')
				? '密碼重設失敗：連結可能已過期或無效。'
				: '發生未知的伺服器錯誤，請稍後再試。';

			return fail(err.status || 500, { data: { password, passwordConfirm }, error: true, message });
		}

		// 密碼重設成功後，重導向到登入頁面，並附帶一個成功提示的查詢參數
		throw redirect(303, '/login?reset=success');
	}
};
