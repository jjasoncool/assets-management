import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.pb.authStore.isValid) {
		throw redirect(303, '/login');
	}
	return {
		user: locals.user
	};
};

export const actions: Actions = {
	// 對應原本 updateUserProfile
	updateProfile: async ({ request, locals, cookies }) => {
		const formData = await request.formData();

		// 處理 removeAvatar 邏輯：前端如果傳送 removeAvatar='true'，我們手動將 avatar 設為空
		const removeAvatar = formData.get('removeAvatar') === 'true';
		if (removeAvatar) {
			formData.append('avatar', ''); // PocketBase 刪除檔案的方式
		}

		try {
			const userId = locals.user?.id;
			if (!userId) throw redirect(303, '/login');

			// 1. 呼叫 PocketBase 更新
			const updatedUser = await locals.pb.collection('users').update(userId, formData);

			// 2. 【關鍵】原本 userService.ts 裡的 pb.authStore.save()
			// 現在要在這裡透過 "更新 Cookie" 來達成
			// 這樣 Navbar 上的名字和頭像才會變
			const authData = JSON.stringify({
				token: locals.pb.authStore.token,
				model: updatedUser
			});

			// 保持跟登入時一樣的 Cookie 設定
			const maxAge = 60 * 60 * 24 * 7;
			cookies.set('pb_auth', authData, {
				httpOnly: true,
				path: '/',
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: maxAge
			});

			return { success: true, message: '個人資料更新成功' };

		} catch (err: any) {
			console.error('Profile update error:', err);
			return fail(400, {
				error: err.message || '更新失敗'
			});
		}
	},

	// 對應原本 changePassword
	changePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const oldPassword = formData.get('oldPassword') as string;
		const password = formData.get('password') as string; // 新密碼
		const passwordConfirm = formData.get('passwordConfirm') as string;

		// 簡單驗證
		if (password !== passwordConfirm) {
			return fail(400, { passwordError: '新密碼與確認密碼不符' });
		}

		try {
			const userId = locals.user?.id;
			if (!userId) throw redirect(303, '/login');

			// PocketBase 修改密碼
			await locals.pb.collection('users').update(userId, {
				oldPassword,
				password,
				passwordConfirm
			});

			// 修改密碼後通常建議登出，或者您可以選擇不登出
			// 這裡示範回傳成功訊息
			return { success: true, message: '密碼修改成功' };

		} catch (err: any) {
			console.error('Password change error:', err);
			return fail(400, {
				passwordError: '修改失敗，請確認舊密碼是否正確'
			});
		}
	}
};