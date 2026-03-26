import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createPocketBaseInstance } from '$lib/pocketbase';
import { dev } from '$app/environment';
import { logger } from '$lib/utils/logger';

// 定義不需要保護的路由
const publicRoutes = ['/login', '/password-reset'];

export const handle: Handle = async ({ event, resolve }) => {
    const { url } = event;

    // 為每個請求創建新的 PocketBase 實例
    event.locals.pb = createPocketBaseInstance();

    // 從請求的 cookie 字串中載入 auth store
    // 這是處理驗證的官方推薦方法，可以正確解析 token 和 model
    event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

    if (dev) {
        logger.debug(`[HOOKS] ${url.pathname} - Auth state after loadFromCookie.`, {
            isValid: event.locals.pb.authStore.isValid,
            token: event.locals.pb.authStore.token?.substring(0, 20) + '...'
        });
    }

    try {
        // 在載入 cookie 後，驗證 token 是否仍然有效，如果有效，刷新它
        if (event.locals.pb.authStore.isValid) {
            if (dev) logger.debug(`[HOOKS] ${url.pathname} - Token is valid, attempting auth refresh...`);
            await event.locals.pb.collection('users').authRefresh();
            if (dev) logger.debug(`[HOOKS] ${url.pathname} - Auth refresh successful.`);
        }
    } catch (err) {
        if (dev) logger.warn(`[HOOKS] ${url.pathname} - Auth refresh failed, clearing auth store.`, { error: err });
        // 如果 token 無效或刷新失敗，清除 auth store
        event.locals.pb.authStore.clear();
    }

    // 如果已登入且訪問登入頁面，重定向到重定向參數或首頁
    if (url.pathname === '/login' && event.locals.pb.authStore.isValid) {
        const redirectTo = url.searchParams.get('redirect');
        if (redirectTo && redirectTo !== '/login') {
            throw redirect(302, decodeURIComponent(redirectTo));
        } else {
            throw redirect(302, '/');
        }
    }

    // 檢查是否為公開路由
    const isPublicRoute = publicRoutes.some(route =>
        url.pathname.startsWith(route)
    );

    // 如果不是公開路由且未登入，重定向到登入頁面
    if (!isPublicRoute && !event.locals.pb.authStore.isValid) {
        if (dev) logger.warn(`[HOOKS] ${url.pathname} - Unauthorized access attempt, redirecting to login.`);
        throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
    }

    // 將用戶資料模型放入 locals，以便在後續的 server load 函數中訪問
    event.locals.user = event.locals.pb.authStore.model;

    // 繼續處理請求，等待回應生成
    const response = await resolve(event);

    // 處理完畢後，將最新的 auth store 狀態（可能已刷新）寫回 cookie
    // `exportToCookie` 會處理 `httpOnly` 等安全設定
    response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({ httpOnly: true, secure: !dev, sameSite: 'lax' }));

    return response;
};
