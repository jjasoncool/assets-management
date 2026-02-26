import type PocketBase from 'pocketbase';
import { logger } from '$lib/utils/logger';
import { createPocketBaseInstance } from '$lib/pocketbase';
import { env } from '$env/dynamic/private';

// =================================================================
// 資料獲取 (Data Fetching)
// =================================================================

/**
 * 提供一個安全的範圍 (scope)，在其中暫時性地使用管理員權限執行操作。
 * @param requester 呼叫者的識別字串，用於日誌審核
 * @param callback 要使用管理員權限執行的函式
 * @returns 回呼函式的執行結果，如果管理員驗證失敗或未設定則返回 null
 */
async function withAdminAuth<T>(
	requester: string,
	callback: (adminPb: PocketBase) => Promise<T>
): Promise<T | null> {
	const adminEmail = env.PB_ADMIN_EMAIL;
	const adminPassword = env.PB_ADMIN_PASSWORD;

	// 檢查是否有設定管理員帳密
	if (!adminEmail || !adminPassword) {
		logger.warn(`withAdminAuth called by "${requester}" but admin credentials are not set.`);
		return null;
	}

	logger.info(`Privilege escalation requested by "${requester}". Attempting admin authentication.`);

	try {
		// 建立一個臨時的管理員用 PocketBase instance
		const adminPb = createPocketBaseInstance();
		await adminPb.admins.authWithPassword(adminEmail, adminPassword);

		// 執行傳入的回呼函式，並將臨時的 adminPb instance 傳給它
		const result = await callback(adminPb);
		logger.info(`Privilege escalation for "${requester}" completed successfully.`);
		return result;
	} catch (err) {
		logger.error(`Privilege escalation for "${requester}" failed:`, err);
		return null; // 任何錯誤都返回 null
	}
}

/**
 * 獲取所有使用者列表 (供下拉選單使用)
 * @param pb PocketBase 實例
 * @param options 選項: asAdmin - 是否以管理員權限獲取，以取得 email 等完整欄位。其他選項會被傳遞給 getList。
 */
export async function getUsersList(
	pb: PocketBase,
	options: { asAdmin?: boolean; [key: string]: any } = {}
) {
	const { asAdmin = false, ...restOptions } = options;

	// 如果未提供排序，設定預設值
	if (!restOptions.sort) {
		restOptions.sort = 'name';
	}

	// 如果呼叫者要求，則嘗試使用管理員權限
	if (asAdmin) {
		const result = await withAdminAuth('userService.getUsersList', async (adminPb) => {
			return adminPb.collection('users').getList(1, 1000, restOptions);
		});
		// 如果用管理員權限成功，直接回傳結果
		if (result) {
			return JSON.parse(JSON.stringify(result.items));
		}
	}

	// 如果不要求管理員權限，或管理員權限執行失敗，則使用當前使用者權限
	try {
		if (asAdmin) {
			// 如果是從管理員模式降級的，加個日誌
			logger.warn('Falling back to user context for getUsersList, emails may be hidden.');
		}
		const fallbackResult = await pb.collection('users').getList(1, 1000, restOptions);
		return JSON.parse(JSON.stringify(fallbackResult.items));
	} catch (err) {
		logger.error('獲取使用者列表失敗 (using user context):', err);
		return [];
	}
}

/**
 * 獲取單一使用者詳情
 * @param pb PocketBase 實例
 * @param id 使用者 ID
 * @param options 選項: asAdmin - 是否以管理員權限獲取，以取得 email 等完整欄位
 */
export async function getUser(pb: PocketBase, id: string, options: { asAdmin?: boolean } = {}) {
	const { asAdmin = false } = options;

	// 如果呼叫者要求，則嘗試使用管理員權限
	if (asAdmin) {
		const user = await withAdminAuth('userService.getUser', async (adminPb) => {
			return adminPb.collection('users').getOne(id);
		});
		// 如果用管理員權限成功，直接回傳結果
		if (user) {
			return JSON.parse(JSON.stringify(user));
		}
	}

	// 如果不要求管理員權限，或管理員權限執行失敗，則使用當前使用者權限
	try {
		if (asAdmin) {
			// 如果是從管理員模式降級的，加個日誌
			logger.warn(`Falling back to user context for getUser(${id}), email may be hidden.`);
		}
		const fallbackUser = await pb.collection('users').getOne(id);
		return JSON.parse(JSON.stringify(fallbackUser));
	} catch (err) {
		logger.error(`獲取使用者 ${id} 失敗 (using user context):`, err);
		return null;
	}
}

// =================================================================
// 資料操作 (Data Manipulation)
// =================================================================

/**
 * 建立新使用者
 * 權限：需要 pb 實例擁有 'users' 集合的 'Create' 權限
 * @param pb PocketBase 實例
 * @param data 使用者資料
 */
export async function createUser(pb: PocketBase, data: any) {
    try {
        const newUser = await pb.collection('users').create(data);
        return { success: true, user: JSON.parse(JSON.stringify(newUser)) };
    } catch (err: any) {
        logger.error('建立新使用者失敗:', err);
        return { success: false, error: err.message };
    }
}

/**
 * 更新使用者資料
 * 權限：需要 pb 實例擁有 'users' 集合的 'Update' 權限
 * @param pb PocketBase 實例
 * @param id 使用者 ID
 * @param data 要更新的使用者資料
 */
export async function updateUser(pb: PocketBase, id: string, data: any) {
    try {
        const updatedUser = await pb.collection('users').update(id, data);
        return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
    } catch (err: any) {
        logger.error(`更新使用者 ${id} 失敗:`, err);
        return { success: false, error: err.message };
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
