import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    // 1. 檢查使用者是否登入 (Server 端驗證)
    if (!locals.user || !locals.pb) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. 透過 Server 端的 admin/auth client 產生 File Token
        // 這是 PocketBase 的標準功能
        const token = await locals.pb.files.getToken();

        return json({ token });
    } catch (err) {
        return json({ error: 'Failed to generate token' }, { status: 500 });
    }
};