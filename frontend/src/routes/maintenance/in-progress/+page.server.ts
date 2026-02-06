import { getIncompleteMaintenanceRecords, completeMaintenanceRecord } from '$lib/server/services/maintenanceService';
import { logger } from '$lib/utils/logger';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// 使用 as any 解決 PocketBase CJS/ESM 型別衝突
		const pb = locals.pb as any;

		const recordsResult = await getIncompleteMaintenanceRecords(pb, 1, 100);

		return {
			records: recordsResult,
			currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
		};
	} catch (err) {
		logger.error('Failed to load in-progress maintenance records:', err);
		return {
			records: null,
			currentUser: locals.user || null
		};
	}
};

export const actions: Actions = {
    complete: async ({ request, locals }) => {
        const pb = locals.pb as any;
        if (!pb) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const recordId = formData.get('record_id') as string;
        const assetId = formData.get('asset_id') as string;
        const completeDate = formData.get('complete_date') as string;

        // 處理多檔案上傳 (proof_images)
        const proofImages = formData.getAll('proof_images') as File[];
        // 過濾掉空檔案 (如果使用者沒選檔案，瀏覽器有時會傳送一個空的 File 物件)
        const validImages = proofImages.filter(f => f.size > 0 && f.name !== '');

        if (!recordId || !assetId || !completeDate) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            await completeMaintenanceRecord(
                pb,
                recordId,
                assetId,
                completeDate,
                validImages
            );
            return { success: true };
        } catch (error: any) {
            logger.error('Failed to complete maintenance:', error);
            return fail(500, { error: 'Failed to complete maintenance' });
        }
    }
};