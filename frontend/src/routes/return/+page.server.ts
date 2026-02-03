import { redirect, fail } from '@sveltejs/kit';
import { getActiveBorrowRecordForAsset, getCurrentBorrowedAssets, returnAsset } from '$lib/server/services/borrowService';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    // 1. 權限檢查
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    const pb = locals.pb;
    const assetId = url.searchParams.get('assetId');

    // [FIX 1] 明確指定類型為 any[]，解決 "implicit any" 錯誤
    let borrowedAssets: any[] = [];
    let selectedRecordId = null;
    let error = null;

    try {
        if (assetId) {
            // [FIX 2] 使用 (pb as any) 繞過 CJS/ESM 類型不相容的錯誤
            // 這是安全的，因為執行時物件結構是一致的
            const record = await getActiveBorrowRecordForAsset(pb as any, assetId);
            borrowedAssets = [record];
            selectedRecordId = record.id;
        } else {
            // [FIX 2] 同上
            const result = await getCurrentBorrowedAssets(pb as any);
            borrowedAssets = result.items || [];
        }
    } catch (e: any) {
        console.error('Load error:', e);
        error = e.message || '無法載入借用資料';
    }

    return {
        borrowedAssets: JSON.parse(JSON.stringify(borrowedAssets)),
        selectedRecordId,
        error,
        assetIdFromQuery: assetId
    };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const pb = locals.pb;
        const formData = await request.formData();

        const recordId = formData.get('recordId') as string;
        const returnImages = formData.getAll('returnImages') as File[];

        if (!recordId) {
            return fail(400, { missing: true, message: '請選擇要歸還的資產' });
        }

        try {
            const validImages = returnImages.filter(f => f.size > 0);

            // [FIX 2] 同上，使用 as any 解決類型衝突
            await returnAsset(pb as any, recordId, validImages);
        } catch (err: any) {
            console.error('Return asset error:', err);
            return fail(500, {
                error: true,
                message: err.message || '歸還失敗',
                selectedRecordId: recordId
            });
        }

        throw redirect(303, '/borrow/list');
    }
};