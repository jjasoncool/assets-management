import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type PocketBase from 'pocketbase';
import {
    createAnnouncement,
    deleteAnnouncement,
    getAnnouncementsList,
    updateAnnouncement
} from '$lib/server/services/announcementService';
import { isAdmin } from '$lib/server/services/userService';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
        throw error(403, 'Forbidden');
    }

    const announcements = await getAnnouncementsList(locals.pb as unknown as PocketBase);

    return {
        announcements
    };
};

function getAnnouncementPayload(formData: FormData, userId?: string) {
    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string)?.trim();
    const publishedDate = (formData.get('published_at') as string) || '';
    const is_active = formData.get('is_active') === 'on';

    return {
        title,
        content,
        is_active,
        published_at: publishedDate ? `${publishedDate} 00:00:00` : undefined,
        ...(userId ? { created_by: [userId] } : {})
    };
}

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
            return fail(403, { error: '權限不足：僅限管理員' });
        }

        const formData = await request.formData();
        const payload = getAnnouncementPayload(formData, locals.user?.id);

        if (!payload.title || !payload.content) {
            return fail(400, { error: '標題與內容為必填', values: payload });
        }

        try {
            await createAnnouncement(locals.pb as unknown as PocketBase, payload);
            return { success: true, message: '公告新增成功' };
        } catch (err: any) {
            return fail(400, { error: err.message || '公告新增失敗', values: payload });
        }
    },

    update: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
            return fail(403, { error: '權限不足：僅限管理員' });
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;
        const payload = getAnnouncementPayload(formData);

        if (!id || !payload.title || !payload.content) {
            return fail(400, { error: '缺少必要欄位', values: { id, ...payload } });
        }

        try {
            await updateAnnouncement(locals.pb as unknown as PocketBase, id, payload);
            return { success: true, message: '公告更新成功' };
        } catch (err: any) {
            return fail(400, { error: err.message || '公告更新失敗', values: { id, ...payload } });
        }
    },

    delete: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid || !isAdmin(locals.user)) {
            return fail(403, { error: '權限不足：僅限管理員' });
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { error: '缺少公告 ID' });

        try {
            await deleteAnnouncement(locals.pb as unknown as PocketBase, id);
            return { success: true, message: '公告刪除成功' };
        } catch (err: any) {
            return fail(400, { error: err.message || '公告刪除失敗' });
        }
    }
};
