import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllMaintenanceRecords } from '$lib/server/services/maintenanceService';
import type { MaintenanceRecord } from '$lib/types';
import { logger } from '$lib/utils/logger';

interface CostByCategory {
	[key: string]: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.pb.authStore.isValid) {
		throw redirect(303, '/login');
	}

	try {
		const records: MaintenanceRecord[] = await getAllMaintenanceRecords(locals.pb);

		// Calculate total cost
		const totalCost = records.reduce((sum, record) => sum + record.cost, 0);

		// Calculate cost by category
		const costByCategory = records.reduce((acc: CostByCategory, record) => {
			// @ts-expect-error - expand is not typed
			const categoryName = record.expand?.asset?.expand?.asset_category?.name || '未分類';
			acc[categoryName] = (acc[categoryName] || 0) + record.cost;
			return acc;
		}, {});

		// Prepare data for charts
		const categoryLabels = Object.keys(costByCategory);
		const categoryData = Object.values(costByCategory);

		return {
			totalCost,
			totalRecords: records.length,
			averageCost: records.length > 0 ? totalCost / records.length : 0,
			costByCategory: {
				labels: categoryLabels,
				data: categoryData
			}
		};
	} catch (err) {
		logger.error('載入維護分析資料失敗:', err);
		return {
			error: '無法載入維護分析資料'
		};
	}
};
