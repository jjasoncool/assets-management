import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/services/userService';
import { createUser } from '$lib/server/services/userService';
import type { PageServerLoad, Actions } from './$types';

// 只有管理員可以載入此頁面
export const load: PageServerLoad = async ({ locals }) => {
	if (!isAdmin(locals.user)) {
		throw error(403, 'Forbidden');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// 再次確認權限
		if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();

		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const department = formData.get('department') as string; // 取得部門
		const role = formData.getAll('role') as string[]; // 角色可以是多選
		const password = formData.get('password') as string;
		const passwordConfirm = formData.get('passwordConfirm') as string;

		// --- 後端基本驗證 ---
		const errors: Record<string, string> = {};
		if (!name) errors.name = '姓名為必填欄位';
		if (!email) errors.email = '電子郵件為必填欄位';
		if (!password) errors.password = '密碼為必填欄位';
		if (password !== passwordConfirm) errors.passwordConfirm = '兩次輸入的密碼不一致';
		if (!role || role.length === 0) errors.role = '角色為必填欄位';

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				data: { name, email, role, department },
				errors
			});
		}
		// --- 驗證結束 ---

		// 準備要傳送給 PocketBase 的資料
		const userData = {
			name,
			email,
			department, // 新增部門
			role,
			password,
			passwordConfirm,
			emailVisibility: false, // 預設 email 不公開
			modified_by: locals.user?.id // 記錄修改者
		};

		// 呼叫 service 建立使用者
		const result = await createUser(locals.pb, userData);

		if (!result.success) {
			return fail(500, {
				data: { name, email, role, department },
				error: result.error || '伺服器發生未知錯誤'
			});
		}

		// 成功後重導向到使用者列表頁
		throw redirect(303, '/users');
	}
};
