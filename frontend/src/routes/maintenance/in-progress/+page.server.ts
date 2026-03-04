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
        const costIsSame = formData.get('cost_is_same') === 'on'; // Checkbox value is 'on'
        const estimatedCost = Number(formData.get('estimated_cost'));
        
        // 【修正】根據 costIsSame 的狀態決定 actualCost 的值
        let actualCost: number;
        if (costIsSame) {
            // 如果勾選了「費用相符」，直接使用估算費用
            actualCost = estimatedCost;
        } else {
            // 否則，從表單中讀取實際費用
            actualCost = Number(formData.get('actual_cost'));
        }

        // 處理多檔案上傳 (proof_images)
        const proofImages = formData.getAll('proof_images') as File[];
        // 過濾掉空檔案 (如果使用者沒選檔案，瀏覽器有時會傳送一個空的 File 物件)
        const validImages = proofImages.filter(f => f.size > 0 && f.name !== '');

        if (!recordId || !assetId || !completeDate || isNaN(actualCost)) {
            return fail(400, { error: '缺少必要欄位或費用格式錯誤' });
        }

        // 根據費用選項，建立描述
        let description = '';
        if (costIsSame) {
            description = '實際花費費用與估算相符';
        } else {
            description = `估算費用為 ${estimatedCost.toLocaleString()} 元\n實際費用為 ${actualCost.toLocaleString()} 元`;
        }


        try {
            await completeMaintenanceRecord(
                pb,
                recordId,
                assetId,
                completeDate,
                actualCost,
                description,
                validImages
            );
            return { success: true };
        } catch (error: any) {
            logger.error('Failed to complete maintenance:', error);
            // 將後端原始錯誤訊息傳回前端，方便除錯
            const rawError = error.response?.message || error.message || '未知錯誤';
            return fail(500, { error: `結案失敗: ${rawError}` });
        }
    }
};
