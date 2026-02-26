import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin, getUser, updateUser } from '$lib/server/services/userService';
import type { PageServerLoad, Actions } from './$types';

// 載入使用者資料，並確認權限
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isAdmin(locals.user)) {
		throw error(403, 'Forbidden');
	}

	const user = await getUser(locals.pb, params.id, { asAdmin: true });

	if (!user) {
		throw error(404, 'Not Found');
	}

	// 只將需要的資料傳遞給表單，避免傳遞整個使用者物件
	return {
		form: {
			id: user.id,
			name: user.name,
			email: user.email,
			department: user.department,
			role: user.role
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
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
		if (!role || role.length === 0) errors.role = '角色為必填欄位';

		// 只有在輸入新密碼時才驗證密碼
		if (password && password !== passwordConfirm) {
			errors.passwordConfirm = '兩次輸入的密碼不一致';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				data: { name, email, role, department },
				errors
			});
		}
		// --- 驗證結束 ---

		// 準備要傳送給 PocketBase 的資料
		const userData: Record<string, any> = {
			name,
			email,
			department,
			role,
			modified_by: locals.user?.id // 記錄修改者
		};

		// 只有在提供了新密碼時才將其加入到更新資料中
		if (password) {
			userData.password = password;
			userData.passwordConfirm = passwordConfirm;
		}

		// 呼叫 service 更新使用者
		const result = await updateUser(locals.pb, params.id, userData);

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
