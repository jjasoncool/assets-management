import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
// 引入 getAssetFormOptions
import { getAsset, getAssetFormOptions } from '$lib/server/services/assetService';
import { logger } from '$lib/utils/logger';
import type PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals, params }) => {
    const pb = locals.pb;
    if (!pb) throw error(401, 'Unauthorized');

    const id = params.id;
    if (!id) throw error(400, 'Asset ID is required');

    try {
        const [asset, options] = await Promise.all([
            getAsset(pb as unknown as PocketBase, id),
            getAssetFormOptions(pb as unknown as PocketBase, locals.user)
        ]);

        return {
            asset: JSON.parse(JSON.stringify(asset)),
            ...options, // 包含 categories 和 borrowableUsers
            currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
        };
    } catch (err) {
        logger.error(`Failed to load asset ${id}:`, err);
        throw error(404, 'Asset not found or access denied');
    }
};

export const actions: Actions = {
    update: async ({ request, locals }) => {
        const pb = locals.pb;
        if (!pb) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { error: 'Asset ID is required for update' });

        try {
            await pb.collection('assets').update(id, formData);
        } catch (err: any) {
             logger.error('Failed to update asset:', err);
             const pbError = err?.data?.data;
             if (pbError) {
                let errorMessages = Object.entries(pbError).map(([field, details]: [string, any]) => {
                    return `${field}: ${details.message}`;
                }).join('; ');
                return fail(400, { error: `Validation failed: ${errorMessages}` });
             }
             return fail(500, { error: err.message || 'Update failed' });
        }

        throw redirect(303, '/assets');
    }
};