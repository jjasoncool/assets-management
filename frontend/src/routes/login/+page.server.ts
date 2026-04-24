import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { dev } from '$app/environment';
import { fileLogger } from '$lib/utils/fileLogger';

export const actions = {
	login: async ({ request, locals, cookies, getClientAddress }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.toLowerCase();
		const password = formData.get('password') as string;

		// 簡單的服務端驗證
		if (!email || !password) {
			return fail(400, {
				email,
				missing: true,
				error: '請輸入郵箱和密碼'
			});
		}

		const clientIP = getClientAddress();
		const userAgent = request.headers.get('user-agent') || '';

		try {
			// 1. 在 Server 端執行 PocketBase 登入
			// locals.pb 來自 hooks.server.ts
			const { record: user } = await locals.pb.collection('users').authWithPassword(email, password);

			// 記錄登入日誌（包含真實 IP）
			try {
				await locals.pb.collection('login_logs').create({
					user: user.id,
					email_attempted: email,
					ip_address: clientIP,
					user_agent: userAgent,
					success: true
				});
			} catch (logErr) {
				// 登入日誌寫入資料庫失敗不應該影響登入流程，但要記錄到本地日誌
				console.error('Failed to create login log in database:', logErr);
			}

			// 無論資料庫寫入是否成功，都要記錄到本地檔案日誌
			try {
				fileLogger.info(`[LOGIN SUCCESS] User: ${user.email}, IP: ${clientIP}`);
			} catch (fileLogErr) {
				// fileLogger 內部已有錯誤處理，這裡只是額外保險
				console.error('Failed to write to file log:', fileLogErr);
			}

			// 檢查是否有密碼重設成功的 cookie
			const resetSuccess = cookies.get('password-reset-success');
			if (resetSuccess) {
				// 更新 modified_by 為使用者自己的名字
				await locals.pb.collection('users').update(user.id, { 'modified_by': user.id });
				// 刪除 cookie，確保此邏輯只執行一次
				cookies.delete('password-reset-success', { path: '/' });
			}


			// 2. 設定 HttpOnly Cookie
			// 【修正重點】：直接使用 PocketBase 的 token 作為 cookie 的值
			cookies.set('pb_auth', locals.pb.authStore.token, {
				httpOnly: true,
				path: '/',
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30 // 30 天
			});

		} catch (err: any) {
			// 嘗試將失敗記錄寫入 PocketBase
			try {
				await locals.pb.collection('login_logs').create({
					email_attempted: email,
					ip_address: clientIP,
					user_agent: userAgent,
					success: false,
					reason: err?.message || 'Invalid credentials'
				});
			} catch (logErr) {
				// 資料庫寫入失敗不影響錯誤處理流程
				console.error('Failed to create failed login log in database:', logErr);
			}

			// 無論資料庫寫入是否成功，都要記錄到本地檔案日誌
			try {
				fileLogger.warn(`[LOGIN FAILED] Attempt for email: ${email}, IP: ${clientIP}, Reason: ${err?.message || 'Unknown'}`);
			} catch (fileLogErr) {
				console.error('Failed to write failed login to file log:', fileLogErr);
			}

			return fail(400, {
				email,
				error: '登入失敗，請檢查您的帳號或密碼'
			});
		}

		// 3. 登入成功後重導向 (必須在 try/catch 之外拋出)
		throw redirect(303, '/');
	}
} satisfies Actions;
