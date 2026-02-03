// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ cookies, locals }) => {
        // 1. 刪除 HttpOnly Cookie
        cookies.delete('pb_auth', { path: '/' });

        // 2. 清除 locals 中的使用者狀態 (記憶體中)
        if (locals.pb) {
            locals.pb.authStore.clear();
        }

        // 3. 重導向回登入頁
        throw redirect(303, '/login');
    }
};