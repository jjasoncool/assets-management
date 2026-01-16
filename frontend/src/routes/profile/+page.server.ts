import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // hooks.server.ts 已經處理了認證檢查，這裡直接返回用戶資料
  const { user } = locals;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      created: user.created,
      updated: user.updated
    }
  };
};
