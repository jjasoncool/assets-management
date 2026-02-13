import { fail, redirect } from '@sveltejs/kit';
import { createAssetWithIdGeneration, getAllAssetCategories } from '$lib/server/services/assetService';
import { getUsersList, isAdmin } from '$lib/server/services/userService';
import { logger } from '$lib/utils/logger';
import type { Actions, PageServerLoad } from './$types';
import type PocketBase from 'pocketbase';
import type { AssetCategory } from '$lib/types';

// 1. 新增 Load 函式：負責準備頁面需要的資料 (下拉選單選項)
export const load: PageServerLoad = async ({ locals }) => {
    try {
        const pb = locals.pb as unknown as PocketBase;
        const user = locals.user;

        // [重構] 使用 Promise.all 並行請求：
        // 1. 獲取所有資產類別 (來自 AssetService)
        // 2. 獲取使用者列表 (來自 UserService，僅管理員需要完整列表)
        const categoriesPromise = getAllAssetCategories(pb);
        const usersPromise = isAdmin(user) ? getUsersList(pb) : Promise.resolve(user ? [user] : []);

        const [categories, borrowableUsers] = await Promise.all([
            categoriesPromise,
            usersPromise
        ]);

        return {
            categories: JSON.parse(JSON.stringify(categories)),
            borrowableUsers: JSON.parse(JSON.stringify(borrowableUsers)),
            currentUser: user ? JSON.parse(JSON.stringify(user)) : null
        };

    } catch (err) {
        logger.error('Failed to load add asset options:', err);
        return {
            categories: [],
            borrowableUsers: [],
            currentUser: locals.user || null
        };
    }
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const pb = locals.pb;
    if (!pb) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const categoryId = formData.get('category') as string;

    if (!categoryId) {
      return fail(400, { error: 'Asset category is required.' });
    }

    try {
      // [修正] 改用 getAllAssetCategories 確保能取得到對應的類別資料 (不受分頁限制)
      const categories = await getAllAssetCategories(pb as unknown as PocketBase);

      await createAssetWithIdGeneration(
        pb as unknown as PocketBase,
        formData,
        categoryId,
        categories
      );

    } catch (error: any) {
      logger.error('Failed to create asset:', error);
      const pbError = error?.data?.data;
      if (pbError) {
        let errorMessages = Object.entries(pbError).map(([field, details]: [string, any]) => {
          return `${field}: ${details.message}`;
        }).join('; ');
        return fail(400, { error: `Validation failed: ${errorMessages}` });
      }
      return fail(500, { error: error.message || 'Failed to create asset due to an internal error.' });
    }

    throw redirect(303, '/assets');
  }
};
