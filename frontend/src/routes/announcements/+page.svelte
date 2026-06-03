<script lang="ts">
    import { enhance } from '$app/forms';
    import { untrack } from 'svelte';
    import { flatpickr } from '$lib/actions/flatpickr';
    import Navbar from '$lib/components/Navbar.svelte';
    import RichTextEditor from '$lib/components/RichTextEditor.svelte';
    import { formatDate } from '$lib/utils/datetime';
    import type { Announcement } from '$lib/types';
    import type { ActionData, PageData } from './$types';

    let { data, form } = $props<{ data: PageData; form: ActionData }>();

    let announcements = $derived((data.announcements || []) as Announcement[]);
    let loading = $state(false);
    let isEditing = $state(false);
    let currentAnnouncementId = $state('');
    let editorSyncKey = $state(0);
    let formData = $state({
        title: '',
        content: '',
        published_at: '',
        is_active: true
    });

    let errorMessage = $derived(form?.error);
    let successMessage = $derived(form?.success ? form?.message : null);
    let lastHandledSuccessForm: ActionData | undefined;

    $effect(() => {
        const actionForm = form;

        if (actionForm?.values && !actionForm.success) {
            lastHandledSuccessForm = undefined;
            untrack(() => {
                formData = {
                    title: actionForm.values.title || '',
                    content: actionForm.values.content || '',
                    published_at: actionForm.values.published_at || '',
                    is_active: Boolean(actionForm.values.is_active)
                };
                editorSyncKey += 1;
            });
        }

        if (actionForm?.success && actionForm !== lastHandledSuccessForm) {
            lastHandledSuccessForm = actionForm;
            loading = false;
            untrack(resetForm);
        }
    });

    function toDateInputValue(value?: string) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    }

    function resetForm() {
        isEditing = false;
        currentAnnouncementId = '';
        formData = {
            title: '',
            content: '',
            published_at: '',
            is_active: true
        };
        editorSyncKey += 1;
    }

    function editAnnouncement(announcement: Announcement) {
        isEditing = true;
        currentAnnouncementId = announcement.id;
        formData = {
            title: announcement.title,
            content: announcement.content,
            published_at: toDateInputValue(announcement.published_at),
            is_active: announcement.is_active
        };
        editorSyncKey += 1;

        setTimeout(() => {
            document.querySelector('#announcement-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    function getCreatorName(announcement: Announcement) {
        const creator = Array.isArray(announcement.expand?.created_by)
            ? announcement.expand?.created_by[0]
            : announcement.expand?.created_by;
        return creator?.name || creator?.email || '-';
    }
</script>

<svelte:head>
    <title>公告事項管理 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">
                    <i class="mdi mdi-bullhorn-outline me-2"></i>公告事項管理
                </h5>
            </div>

            <div class="card-body p-4">
                {#if errorMessage}
                    <div class="alert alert-danger" role="alert">
                        <i class="mdi mdi-alert-circle me-2"></i>{errorMessage}
                    </div>
                {/if}

                {#if successMessage}
                    <div class="alert alert-success" role="alert">
                        <i class="mdi mdi-check-circle me-2"></i>{successMessage}
                    </div>
                {/if}

                <div id="announcement-form" class="card mb-4 {isEditing ? 'bg-warning-subtle border-warning' : ''}">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">{isEditing ? '編輯公告' : '新增公告'}</h6>
                        {#if isEditing}
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick={resetForm}>取消編輯</button>
                        {/if}
                    </div>
                    <div class="card-body">
                        <form
                            method="POST"
                            action={isEditing ? '?/update' : '?/create'}
                            use:enhance={() => {
                                loading = true;
                                return async ({ update }) => {
                                    loading = false;
                                    await update({ reset: false });
                                };
                            }}
                        >
                            {#if isEditing}
                                <input type="hidden" name="id" value={currentAnnouncementId} />
                            {/if}

                            <div class="row g-3">
                                <div class="col-md-8">
                                    <label for="title" class="form-label small fw-bold text-secondary">公告標題 *</label>
                                    <input
                                        id="title"
                                        name="title"
                                        class="form-control shadow-none"
                                        bind:value={formData.title}
                                        maxlength="200"
                                        required
                                    />
                                </div>
                                <div class="col-md-4">
                                    <label for="published_at" class="form-label small fw-bold text-secondary">發布日期</label>
                                    <input
                                        id="published_at"
                                        name="published_at"
                                        type="text"
                                        class="form-control shadow-none"
                                        bind:value={formData.published_at}
                                        use:flatpickr={{ dateFormat: 'Y-m-d' }}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>

                                <div class="col-12">
                                    <label for="content" class="form-label small fw-bold text-secondary">公告內容 *</label>
                                    <RichTextEditor bind:value={formData.content} syncKey={editorSyncKey} placeholder="請輸入公告內容..." />
                                    <input
                                        type="hidden"
                                        id="content"
                                        name="content"
                                        value={formData.content}
                                        required
                                    />
                                </div>

                                <div class="col-12">
                                    <div class="form-check form-switch">
                                        <input
                                            id="is_active"
                                            name="is_active"
                                            class="form-check-input"
                                            type="checkbox"
                                            bind:checked={formData.is_active}
                                        />
                                        <label for="is_active" class="form-check-label">啟用公告</label>
                                    </div>
                                </div>

                                <div class="col-12 text-end">
                                    <button type="submit" class="btn btn-primary" disabled={loading}>
                                        {#if loading}
                                            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                            處理中...
                                        {:else}
                                            <i class="mdi mdi-content-save me-2"></i>{isEditing ? '更新公告' : '新增公告'}
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">公告列表</h6>
                        <span class="badge bg-primary">{announcements.length} 筆</span>
                    </div>
                    <div class="card-body p-0">
                        {#if announcements.length === 0}
                            <div class="alert alert-info m-3 mb-3">
                                <i class="mdi mdi-information me-2"></i>目前沒有公告。
                            </div>
                        {:else}
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="ps-4">標題</th>
                                            <th>狀態</th>
                                            <th>發布日期</th>
                                            <th>建立者</th>
                                            <th>更新時間</th>
                                            <th class="pe-4 text-end">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each announcements as announcement}
                                            <tr>
                                                <td class="ps-4 fw-semibold">{announcement.title}</td>
                                                <td>
                                                    {#if announcement.is_active}
                                                        <span class="badge bg-success bg-opacity-10 text-success">啟用</span>
                                                    {:else}
                                                        <span class="badge bg-secondary bg-opacity-10 text-secondary">停用</span>
                                                    {/if}
                                                </td>
                                                <td>{announcement.published_at ? formatDate(announcement.published_at) : '-'}</td>
                                                <td>{getCreatorName(announcement)}</td>
                                                <td>{formatDate(announcement.updated)}</td>
                                                <td class="pe-4 text-end">
                                                    <button
                                                        type="button"
                                                        class="btn btn-sm btn-outline-primary me-1"
                                                        onclick={() => editAnnouncement(announcement)}
                                                    >
                                                        編輯
                                                    </button>
                                                    <form
                                                        method="POST"
                                                        action="?/delete"
                                                        class="d-inline-block"
                                                        use:enhance={({ cancel }) => {
                                                            if (!confirm(`確定要刪除公告「${announcement.title}」嗎？`)) return cancel();
                                                            loading = true;
                                                            return async ({ update }) => {
                                                                loading = false;
                                                                await update({ reset: false });
                                                            };
                                                        }}
                                                    >
                                                        <input type="hidden" name="id" value={announcement.id} />
                                                        <button type="submit" class="btn btn-sm btn-outline-danger" disabled={loading}>刪除</button>
                                                    </form>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
