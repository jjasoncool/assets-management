import { getAssets } from '$lib/server/services/assetService';
import { logger } from '$lib/utils/logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// [修正 1] 使用 as any 解決 PocketBase CJS/ESM 型別衝突
		const pb = locals.pb as any;

		// [修正 2] 狀態改為 'maintenance' 以對應資料庫實際選項
		const assetsResult = await getAssets(pb, 1, 500, {
			filter: "status = 'maintenance'",
			expand: 'category,assigned_to',
			sort: '-updated'
		});

		return {
			assets: JSON.parse(JSON.stringify(assetsResult)),
			currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
		};
	} catch (err) {
		logger.error('Failed to load in-progress maintenance assets:', err);
		return {
			assets: null,
			currentUser: locals.user || null
		};
	}
};