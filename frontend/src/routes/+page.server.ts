import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        // 只傳遞用戶資訊，紀錄由客戶端懶加載
        return {
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
        };
    } catch (error) {
        logger.error('無法在主頁載入用戶資訊:', error);
        return {
            currentUser: null
        };
    }
};