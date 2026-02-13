import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllMaintenanceRecords } from '$lib/server/services/maintenanceService';
import { getAllAssetCategories } from '$lib/server/services/assetService';
import type { MaintenanceRecord } from '$lib/types';
import { logger } from '$lib/utils/logger';

interface StatsByCategory {
	[key: string]: {
		totalCost: number;
		count: number;
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.pb.authStore.isValid) {
		throw redirect(303, '/login');
	}

	const selectedCategoryId = url.searchParams.get('category') || '';
	const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const defaultStartDate = new Date();
	defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
	const startDate = url.searchParams.get('startDate') || defaultStartDate.toISOString().split('T')[0];

	try {
		const [records, categories] = await Promise.all([
			getAllMaintenanceRecords(locals.pb as any, {
				categoryId: selectedCategoryId,
				startDate,
				endDate
			}),
			getAllAssetCategories(locals.pb as any)
		]);

		const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
		const selectedCategoryName = selectedCategory ? selectedCategory.name : '';

		// Calculate total cost
		const totalCost = records.reduce((sum: number, record: MaintenanceRecord) => sum + record.cost, 0);
		const totalRecords = records.length;
		const averageCost = totalRecords > 0 ? totalCost / totalRecords : 0;

		// Calculate cost by category
		const statsByCategory = records.reduce((acc: StatsByCategory, record: MaintenanceRecord) => {
			const categoryName = record.expand?.asset?.expand?.category?.name || '未分類';
			if (!acc[categoryName]) {
				acc[categoryName] = { totalCost: 0, count: 0 };
			}
			acc[categoryName].totalCost += record.cost;
			acc[categoryName].count++;
			return acc;
		}, {});

		// Prepare data for charts
		const categoryLabels = Object.keys(statsByCategory);
		const totalCostData = categoryLabels.map((label) => statsByCategory[label].totalCost);
		const averageCostData = categoryLabels.map(
			(label) => statsByCategory[label].totalCost / statsByCategory[label].count
		);

		return {
			categories,
			selectedCategoryId,
			selectedCategoryName,
			startDate,
			endDate,
			totalCost,
			totalRecords,
			averageCost,
			chartData: {
				labels: categoryLabels,
				totalCostData,
				averageCostData
			}
		};
	} catch (err) {
		logger.error('載入維護分析資料失敗:', err);
		return {
			error: '無法載入維護分析資料'
		};
	}
};
