import type { LayoutServerLoad } from './$types';
import { getActiveAnnouncements } from '$lib/server/services/announcementService';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // 我們需要傳 token 給前端，是因為前端的 PocketBase SDK (pb.authStore)
  // 需要這個 token 才能正確運作 (例如生成圖片 URL)
  const token = locals.pb.authStore.token;
  const announcements = locals.pb.authStore.isValid
    ? await getActiveAnnouncements(locals.pb, 2)
    : [];

  return {
    // 傳遞用戶資訊供 UI 顯示 (Navbar 等)
    token,
    currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null,
    announcements
  };
};
