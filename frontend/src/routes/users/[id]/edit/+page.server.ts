import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import { isAdmin, getUser, updateUser } from '$lib/server/services/userService';
import type { PageServerLoad, Actions } from './$types';
import { logger } from '$lib/utils/logger';

// 載入使用者資料，並確認權限
export const load: PageServerLoad = async ({ locals, params }) => {
    if (!isAdmin(locals.user)) {
        throw error(403, 'Forbidden');
    }

    const user = await getUser(locals.pb, params.id, { asAdmin: true });

    if (!user) {
        throw error(404, 'Not Found');
    }

    // 將資料庫回傳的資料獨立放在 user 屬性中
    return {
        user: {
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

        let name = '';
        let email = '';
        let department = '';
        let role: string[] = [];

        try {
            const formData = await request.formData();

            name = formData.get('name') as string;
            email = formData.get('email') as string;
            department = formData.get('department') as string; // 取得部門
            role = formData.getAll('role') as string[]; // 角色可以是多選

            // --- 後端基本驗證 ---
            const errors: Record<string, string> = {};
            if (!name) errors.name = '姓名為必填欄位';
            if (!email) errors.email = '電子郵件為必填欄位';
            if (!role || role.length === 0) errors.role = '角色為必填欄位';

            if (Object.keys(errors).length > 0) {
                logger.warn(`User update validation failed for ID: ${params.id}`);
                // 驗證失敗時，將使用者輸入的資料退回 (會變成 SvelteKit 的 form.data)
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

            // 呼叫 service 更新使用者
            const result = await updateUser(locals.pb, params.id, userData);

            if (!result.success) {
                logger.error(`Failed to update user ID: ${params.id}. Error: ${result.error}`);
                return fail(500, {
                    data: { name, email, role, department },
                    error: result.error || '伺服器發生未知錯誤'
                });
            }

            logger.info(`User ID: ${params.id} updated successfully by admin ${locals.user?.id}`);

            // 成功後重導向到使用者列表頁
            throw redirect(303, '/users');

        } catch (err) {
            if (isRedirect(err)) {
                throw err;
            }

            logger.error(`Unexpected error during user update (ID: ${params.id}):`, err);
            return fail(500, {
                data: { name, email, role, department },
                error: '伺服器發生未預期的錯誤，請稍後再試'
            });
        }
    }
};
