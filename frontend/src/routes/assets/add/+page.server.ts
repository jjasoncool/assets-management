import { fail, redirect } from '@sveltejs/kit';
import { createAssetWithIdGeneration, getAssetCategories, getAssetFormOptions } from '$lib/server/services/assetService';
import { logger } from '$lib/utils/logger';
import type { Actions, PageServerLoad } from './$types';
import type PocketBase from 'pocketbase';
import type { AssetCategory } from '$lib/types';

// 1. 新增 Load 函式：負責準備頁面需要的資料 (下拉選單選項)
export const load: PageServerLoad = async ({ locals }) => {
    try {
        // 傳遞 currentUser 給 getAssetFormOptions
        const options = await getAssetFormOptions(locals.pb as unknown as PocketBase, locals.user);

        return {
            ...options, // 這會自動展開成 categories 和 borrowableUsers
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
        };

    } catch (err) {
        logger.error('Failed to load add asset options:', err);
        return {
            categories: [],
            borrowableUsers: [], // 修正屬性名稱
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
      const categoriesData = await getAssetCategories(pb as unknown as PocketBase);
      const categories = categoriesData.items as unknown as AssetCategory[];

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