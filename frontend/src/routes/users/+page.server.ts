import { error } from '@sveltejs/kit';
import { getUsersList, isAdmin } from '$lib/server/services/userService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// 保護路由，只有管理員可以訪問
	if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
		throw error(403, 'Forbidden');
	}

	const users = await getUsersList(locals.pb);

	return {
		users
	};
};
