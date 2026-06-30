import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Collections } from '$lib/types';
import { logger } from '$lib/utils/logger';

const escapePocketBaseValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const search = url.searchParams.get('search')?.trim() || '';
    const status = url.searchParams.get('status') || 'active';
    const category = url.searchParams.get('category') || '';

    const filterParts: string[] = [];

    if (search) {
        const escapedSearch = escapePocketBaseValue(search);
        filterParts.push(
            `(name ~ "${escapedSearch}" || asset_id ~ "${escapedSearch}" || brand ~ "${escapedSearch}" || model ~ "${escapedSearch}" || serial_number ~ "${escapedSearch}")`
        );
    }

    if (status) {
        filterParts.push(`status = "${escapePocketBaseValue(status)}"`);
    }

    if (category) {
        filterParts.push(`category = "${escapePocketBaseValue(category)}"`);
    }

    try {
        const [assets, categories] = await Promise.all([
            locals.pb.collection(Collections.Assets).getFullList({
                batch: 5000,
                filter: filterParts.join(' && '),
                sort: 'asset_id',
                expand: 'category,assigned_to'
            }),
            locals.pb.collection(Collections.AssetCategories).getFullList({
                batch: 500,
                sort: 'name'
            })
        ]);

        return {
            assets: JSON.parse(JSON.stringify(assets)),
            categories: JSON.parse(JSON.stringify(categories)),
            filters: {
                search,
                status,
                category
            }
        };
    } catch (err) {
        logger.error('[Page/AssetLabels] Failed to load asset labels data.', err);
        throw error(500, '無法載入資產標籤資料，請稍後再試');
    }
};