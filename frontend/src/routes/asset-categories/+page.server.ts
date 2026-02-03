import { fail } from '@sveltejs/kit';
import {
    getAssetCategories,
    createAssetCategory,
    updateAssetCategory,
    deleteAssetCategory
} from '$lib/server/services/assetService';
import { isAdmin } from '$lib/server/services/userService';
import type { PageServerLoad, Actions } from './$types';
import type PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals }) => {
    const pb = locals.pb;

    try {
        const categoriesResult = await getAssetCategories(pb as unknown as PocketBase, {
            sort: 'name',
            perPage: 1000
        });

        return {
            categories: JSON.parse(JSON.stringify(categoriesResult.items)),
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
        };
    } catch (err) {
        console.error('載入資產類別失敗:', err);
        return {
            categories: [],
            currentUser: locals.user || null
        };
    }
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const pb = locals.pb;
        if (!pb) return fail(401, { error: 'Unauthorized' });

        if (!isAdmin(locals.user)) {
            return fail(403, { error: '權限不足：僅限管理員' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const prefix = formData.get('prefix') as string;
        const description = formData.get('description') as string;
        const next_sequence = parseInt(formData.get('next_sequence') as string || '1');

        if (!name || !prefix) {
            return fail(400, { error: '名稱與前綴為必填', values: { name, prefix, description, next_sequence } });
        }

        try {
            await createAssetCategory(pb as unknown as PocketBase, {
                name,
                prefix,
                description,
                next_sequence
            });
            return { success: true, message: '資產類別新增成功' };
        } catch (err: any) {
            return fail(400, {
                error: err.message || '新增失敗',
                values: { name, prefix, description, next_sequence }
            });
        }
    },

    update: async ({ request, locals }) => {
        const pb = locals.pb;
        if (!pb) return fail(401, { error: 'Unauthorized' });

        if (!isAdmin(locals.user)) return fail(403, { error: '權限不足' });

        const formData = await request.formData();
        const id = formData.get('id') as string;
        const name = formData.get('name') as string;
        const prefix = formData.get('prefix') as string;
        const description = formData.get('description') as string;

        if (!id || !name || !prefix) {
            return fail(400, { error: '缺少必要欄位' });
        }

        try {
            await updateAssetCategory(pb as unknown as PocketBase, id, {
                name,
                prefix,
                description
            });
            return { success: true, message: '資產類別更新成功' };
        } catch (err: any) {
            return fail(400, { error: err.message || '更新失敗' });
        }
    },

    delete: async ({ request, locals }) => {
        const pb = locals.pb;
        if (!pb) return fail(401, { error: 'Unauthorized' });

        if (!isAdmin(locals.user)) return fail(403, { error: '權限不足' });

        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { error: 'ID is required' });

        try {
            await deleteAssetCategory(pb as unknown as PocketBase, id);
            return { success: true, message: '刪除成功' };
        } catch (err: any) {
            return fail(400, { error: err.message || '刪除失敗' });
        }
    }
};