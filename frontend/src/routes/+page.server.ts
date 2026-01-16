import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // hooks.server.ts 已經處理了認證檢查，這裡只需要返回用戶資料
  return {
    currentUser: locals.user
  };
};
