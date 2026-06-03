import type PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { createPocketBaseInstance } from '$lib/pocketbase';
import type { Announcement } from '$lib/types';
import { logger } from '$lib/utils/logger';

async function withAdminAuth<T>(
    requester: string,
    callback: (adminPb: PocketBase) => Promise<T>
): Promise<T | null> {
    const adminEmail = env.PB_ADMIN_EMAIL;
    const adminPassword = env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        logger.warn(`withAdminAuth called by "${requester}" but admin credentials are not set.`);
        return null;
    }

    try {
        const adminPb = createPocketBaseInstance();
        await adminPb.admins.authWithPassword(adminEmail, adminPassword);
        return await callback(adminPb);
    } catch (err) {
        logger.error(`Privilege escalation for "${requester}" failed:`, err);
        return null;
    }
}

export async function getActiveAnnouncements(pb: PocketBase, limit = 2): Promise<Announcement[]> {
    try {
        const result = await pb.collection('announcements').getList(1, limit, {
            filter: 'is_active = true',
            sort: '-published_at,-updated'
        });

        if (result.items.length > 0) {
            return JSON.parse(JSON.stringify(result.items));
        }

        logger.warn('使用目前使用者權限未取得啟用公告，改用 server-side admin fallback。');
    } catch (err) {
        logger.warn('使用目前使用者權限獲取啟用公告失敗，改用 server-side admin fallback:', err);
    }

    const adminResult = await withAdminAuth('announcementService.getActiveAnnouncements', async (adminPb) => {
        const records = await adminPb.collection('announcements').getList(1, limit, {
            filter: 'is_active = true',
            sort: '-published_at,-updated'
        });

        return JSON.parse(JSON.stringify(records.items));
    });

    if (adminResult) {
        return adminResult;
    }

    return [];
}

export async function getAnnouncementsList(pb: PocketBase): Promise<Announcement[]> {
    try {
        const records = await pb.collection('announcements').getList(1, 1000, {
            sort: '-published_at,-updated',
            expand: 'created_by'
        });
        return JSON.parse(JSON.stringify(records.items));
    } catch (err) {
        logger.warn('使用目前使用者權限獲取公告列表失敗，改用 server-side admin fallback:', err);
    }

    const result = await withAdminAuth('announcementService.getAnnouncementsList', async (adminPb) => {
        const records = await adminPb.collection('announcements').getList(1, 1000, {
            sort: '-published_at,-updated',
            expand: 'created_by'
        });
        return JSON.parse(JSON.stringify(records.items));
    });

    if (result) {
        return result;
    }

    return [];
}

export async function createAnnouncement(pb: PocketBase, data: Partial<Announcement>) {
    try {
        const record = await pb.collection('announcements').create(data);
        return JSON.parse(JSON.stringify(record)) as Announcement;
    } catch (err) {
        logger.error('建立公告失敗:', err);
        throw err;
    }
}

export async function updateAnnouncement(pb: PocketBase, id: string, data: Partial<Announcement>) {
    try {
        const record = await pb.collection('announcements').update(id, data);
        return JSON.parse(JSON.stringify(record)) as Announcement;
    } catch (err) {
        logger.error(`更新公告 ${id} 失敗:`, err);
        throw err;
    }
}

export async function deleteAnnouncement(pb: PocketBase, id: string) {
    try {
        await pb.collection('announcements').delete(id);
    } catch (err) {
        logger.error(`刪除公告 ${id} 失敗:`, err);
        throw err;
    }
}
