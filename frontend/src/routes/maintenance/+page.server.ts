import { getMaintenanceRecords } from '$lib/server/services/maintenanceService';
import { logger } from '$lib/utils/logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// 修正重點：加上 'as any' 來暫時繞過 PocketBase 的 CJS/ESM 型別衝突
		// 這樣可以避免 'baseToken is protected' 的錯誤
		const pb = locals.pb as any;

		// 僅載入維護歷史紀錄
		// 預設載入前 20 筆
		const recordsResult = await getMaintenanceRecords(pb, 1, 20);

		return {
			records: JSON.parse(JSON.stringify(recordsResult)),
			currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
		};
	} catch (err) {
		logger.error('Failed to load maintenance history:', err);
		return {
			records: null,
			currentUser: locals.user || null
		};
	}
};