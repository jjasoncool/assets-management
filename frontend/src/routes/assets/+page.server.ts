import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAssets, deleteAsset, getAssetFormOptions } from '$lib/server/services/assetService';
import { borrowAsset } from '$lib/server/services/borrowService';
import type PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals, url }) => {
    const page = Number(url.searchParams.get('page')) || 1;
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const category = url.searchParams.get('category') || '';
    const sort = url.searchParams.get('sort') || 'asset_id';

    const filterParts = [];
    if (search) {
        filterParts.push(`(name ~ "${search}" || asset_id ~ "${search}" || serial_number ~ "${search}" || notes ~ "${search}")`);
    }
    if (status) {
        filterParts.push(`status = "${status}"`);
    }
    if (category) {
        filterParts.push(`category = "${category}"`);
    }
    const filter = filterParts.length > 0 ? filterParts.join(' && ') : '';

    try {
        const pb = locals.pb as unknown as PocketBase;
        
        // 同時獲取資產和表單選項
        const [assets, options] = await Promise.all([
            getAssets(pb, page, 20, { filter, sort }),
            getAssetFormOptions(pb, locals.user) // <-- 使用重構後的 Service
        ]);

        return {
            assets,
            currentSort: sort,
            currentUser: locals.user,
            ...options // 包含 categories 和 borrowableUsers
        };
    } catch (err) {
        console.error('Load assets error:', err);
        return {
            assets: { items: [], totalItems: 0, totalPages: 0, page: 1, perPage: 20 },
            currentSort: sort,
            currentUser: locals.user,
            borrowableUsers: [],
            categories: [],
            error: `無法載入資產列表: ${(err as Error).message}`
        };
    }
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { error: '缺少 ID' });

        try {
            // 3.【修正點】同樣加上通行證
            await deleteAsset(locals.pb as unknown as PocketBase, id);
            return { success: true };
        } catch (err) {
            console.error('Delete error:', err);
            return fail(500, { error: '刪除失敗' });
        }
    },

    borrow: async ({ request, locals }) => {
        const formData = await request.formData();
        const assetId = formData.get('asset') as string;
        const returnDate = formData.get('expected_return_date') as string;
        const images = formData.getAll('borrow_images') as File[];
        const userId = formData.get('user') as string; // 讀取使用者 ID

        if (!assetId || !returnDate || !userId) {
            return fail(400, { error: '缺少必要欄位' });
        }

        try {
            await borrowAsset(
                locals.pb as unknown as PocketBase, 
                assetId, 
                returnDate, 
                images,
                userId // 傳遞使用者 ID
            );
            return { success: true };
        } catch (err: any) {
            console.error('Borrow error:', err);
            return fail(500, { error: err.message || '借用申請失敗' });
        }
    }
};