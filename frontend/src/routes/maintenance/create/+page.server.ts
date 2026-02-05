import { fail, redirect } from '@sveltejs/kit';
import { getMaintenanceFormOptions } from '$lib/server/services/maintenanceService';
import { logger } from '$lib/utils/logger';
import type { Actions, PageServerLoad } from './$types';
import { Collections } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const options = await getMaintenanceFormOptions(locals.pb);
		return {
			...options,
			currentUser: locals.user ? JSON.parse(JSON.stringify(locals.user)) : null
		};
	} catch (err) {
		logger.error('Failed to load maintenance form options:', err);
		return {
			assets: [],
			currentUser: locals.user || null
		};
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const pb = locals.pb;
		if (!pb) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		formData.append('performed_by', locals.user.id);

		try {
			await pb.collection(Collections.MaintenanceRecords).create(formData);
		} catch (error: any) {
			logger.error('Failed to create maintenance record:', error);
			const pbError = error?.data?.data;
			if (pbError) {
				let errorMessages = Object.entries(pbError)
					.map(([field, details]: [string, any]) => {
						return `${field}: ${details.message}`;
					})
					.join('; ');
				return fail(400, { error: `Validation failed: ${errorMessages}` });
			}
			return fail(500, {
				error: error.message || 'Failed to create maintenance record due to an internal error.'
			});
		}

		throw redirect(303, '/maintenance');
	}
};
