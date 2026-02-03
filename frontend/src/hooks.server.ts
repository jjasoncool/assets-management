import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createPocketBaseInstance } from '$lib/pocketbase';

// 定義不需要保護的路由 (只有登入頁面不需要保護)
const publicRoutes = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event;

  // 為每個請求創建新的 PocketBase 實例 (避免狀態污染)
  const pb = createPocketBaseInstance();

  // 從 cookies 中獲取 PocketBase auth token
  const allCookies = cookies.getAll();
  const tokenValue = cookies.get('pb_auth');

  // 只在開發環境顯示敏感日誌
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log(`[SERVER] ${url.pathname} - Token value:`, tokenValue ? 'EXISTS' : 'NOT FOUND');
    console.log(`[SERVER] ${url.pathname} - Token content:`, tokenValue?.substring(0, 20) + '...');
    console.log(`[SERVER] ${url.pathname} - All cookies:`, allCookies.map(c => `${c.name}=${c.value?.substring(0, 20)}...`));
  }

  if (tokenValue) {
    try {
      // tokenValue 現在是純 token 字串，使用 save 方法載入
      pb.authStore.save(tokenValue, null);

      // 驗證 token 是否有效並刷新用戶資料
      await pb.collection('users').authRefresh();
      
      if (isDev) {
        console.log(`[SERVER] ${url.pathname} - Auth refreshed, isValid:`, pb.authStore.isValid);
      }
    } catch (error) {
      if (isDev) {
        console.warn(`[SERVER] ${url.pathname} - Invalid token from cookie, clearing auth`, error);
      }
      // Token 無效，清空 auth store
      pb.authStore.clear();
      cookies.delete('pb_auth', { path: '/' });
    }
  } else {
    if (isDev) {
      console.log(`[SERVER] ${url.pathname} - No token found`);
    }
  }

  // 如果已登入且訪問登入頁面，重定向到重定向參數或首頁
  if (url.pathname === '/login' && pb.authStore.isValid) {
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
  if (!isPublicRoute && !pb.authStore.isValid) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  // 將用戶資料添加到 locals (可在 +layout.server.ts 或 +page.server.ts 中使用)
  event.locals.pb = pb;
  event.locals.user = pb.authStore.model;

  // 繼續處理請求
  return resolve(event);
};
