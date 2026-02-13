import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { createPocketBaseInstance } from '$lib/pocketbase';
import { env } from '$env/dynamic/private';

// =================================================================
// 資料獲取 (Data Fetching)
// =================================================================

/**
 * 獲取所有使用者列表 (供下拉選單使用)
 * 權限：需要 admin 或有權限的 pb 實例
 */
export async function getUsersList(pb: PocketBase) {
	// To fetch all user data including emails, we need admin privileges
	// to bypass the collection's API rules. We use a temporary admin client.
	const adminPb = createPocketBaseInstance();
	const adminEmail = env.PB_ADMIN_EMAIL;
	const adminPassword = env.PB_ADMIN_PASSWORD;

	// If admin credentials are not set, fallback to the user's pb instance,
	// which may have limited fields (e.g., email might be hidden).
	if (!adminEmail || !adminPassword) {
		logger.warn(
			'Admin credentials (PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD) are not set. Falling back to user context, emails may be hidden.'
		);
		try {
			const result = await pb.collection('users').getList(1, 1000, {
				sort: 'name'
			});
			return JSON.parse(JSON.stringify(result.items));
		} catch (err) {
			logger.error('獲取使用者列表失敗 (using user context):', err);
			return [];
		}
	}

	try {
		// Use admin credentials to fetch the full user list
		await adminPb.admins.authWithPassword(adminEmail, adminPassword);
		const result = await adminPb.collection('users').getList(1, 1000, {
			sort: 'name'
		});
		return JSON.parse(JSON.stringify(result.items));
	} catch (err) {
		logger.error('獲取使用者列表失敗 (using admin context):', err);
		// As a final fallback, try with the user's context if admin auth fails
		try {
			const result = await pb.collection('users').getList(1, 1000, {
				sort: 'name'
			});
			return JSON.parse(JSON.stringify(result.items));
		} catch (err_user_ctx) {
			logger.error('獲取使用者列表失敗 (fallback to user context):', err_user_ctx);
			return [];
		}
	}
}

/**
 * 獲取單一使用者詳情 (如果未來需要)
 */
export async function getUser(pb: PocketBase, id: string) {
    try {
        const user = await pb.collection('users').getOne(id);
        return JSON.parse(JSON.stringify(user));
    } catch (err) {
        logger.error(`獲取使用者 ${id} 失敗:`, err);
        return null;
    }
}

// =================================================================
// 輔助邏輯 (Helpers) - 這些純函式也可以在 Server Load 時用來處理資料
// =================================================================

/**
 * 顯示使用者名稱 (優先顯示 name，沒有則顯示 email)
 */
export function getUserDisplayName(user: any) {
    if (!user) return '訪客';
    return user.name || user.email || 'User';
}

/**
 * 檢查使用者是否擁有特定角色
 */
export function hasRole(user: any, role: string): boolean {
    if (!user || !user.role) return false;

    // 支援 role 是字串陣列或單一字串的情況
    if (Array.isArray(user.role)) {
        return user.role.includes(role);
    }
    return user.role === role;
}

/**
 * 快速檢查是否為管理員
 */
export function isAdmin(user: any): boolean {
    return hasRole(user, 'admin');
}
