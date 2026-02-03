import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	login: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// 簡單的服務端驗證
		if (!email || !password) {
			return fail(400, {
				email,
				missing: true,
				error: '請輸入郵箱和密碼'
			});
		}

		try {
			// 1. 在 Server 端執行 PocketBase 登入
			// locals.pb 來自 hooks.server.ts
			await locals.pb.collection('users').authWithPassword(email, password);

			// 2. 設定 HttpOnly Cookie
			// 【修正重點】：直接使用 PocketBase 的 token 作為 cookie 的值
			cookies.set('pb_auth', locals.pb.authStore.token, {
				httpOnly: true,
				path: '/',
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30 // 30 天
			});

		} catch (err) {
			console.error('Login error:', err);
			return fail(400, {
				email,
				error: '登入失敗，請檢查您的帳號或密碼'
			});
		}

		// 3. 登入成功後重導向 (必須在 try/catch 之外拋出)
		throw redirect(303, '/');
	}
} satisfies Actions;