import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { logger } from '$lib/utils/logger';

/**
 * 頁面載入時，從 URL 讀取 token
 * 如果 token 不存在，則拋出 400 錯誤
 */
export const load: LayoutServerLoad = async ({ params }) => {
    const { token } = params;

    // 如果 URL 中沒有 token，表示這是一個無效的請求
    if (!token) {
        logger.warn('Password reset page loaded without a token.');
        throw error(400, 'Bad Request');
    }

    // 將 token 傳遞給 Svelte 頁面，以便表單可以使用
    // 註：真正的 Token 驗證將交由使用者送出表單時 (+page.server.ts) 進行。
    // 這樣可以避免在載入階段產生不必要的 API 呼叫與 PocketBase 錯誤日誌。
    return { token };
};
