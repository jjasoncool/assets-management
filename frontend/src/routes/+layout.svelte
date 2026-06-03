<script lang="ts">
    import '../styles/global.css';
    import '../styles/tooplate.css';
    import 'bootstrap/dist/css/bootstrap.min.css';
    import '@mdi/font/css/materialdesignicons.min.css';
    import 'tom-select/dist/css/tom-select.bootstrap5.css';

    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { pb } from '$lib/pocketbase';
    import { bs, swal } from '$lib/stores';
    import type { Announcement } from '$lib/types';

    // 1. Svelte 5: 使用 $props 接收 server 傳來的資料
    let { data, children } = $props<{
        data: { currentUser: any, token: string, announcements?: Announcement[] },
        children: any
    }>();

    let SweetAlert = $state<any>(null);
    let announcementCheckKey = $state('');

    function getAnnouncementVersion(announcements: Announcement[]) {
        return announcements.map((announcement) => `${announcement.id}:${announcement.updated}`).join('|');
    }

    function formatAnnouncementDate(value?: string) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    function escapeHtml(value: string) {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function buildAnnouncementsHtml(announcements: Announcement[]) {
        const accordionItems = announcements.map((announcement, index) => {
            const collapseId = `announcement-collapse-${announcement.id}`;
            const headingId = `announcement-heading-${announcement.id}`;
            const publishedAt = formatAnnouncementDate(announcement.published_at || announcement.updated);
            const title = escapeHtml(announcement.title);

            return `
                <div class="accordion-item text-start">
                    <h2 class="accordion-header" id="${headingId}">
                        <button
                            class="accordion-button ${index === 0 ? '' : 'collapsed'}"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#${collapseId}"
                            aria-expanded="${index === 0 ? 'true' : 'false'}"
                            aria-controls="${collapseId}"
                        >
                            <span class="fw-semibold">${title}</span>
                            ${publishedAt ? `<span class="badge bg-light text-secondary border ms-2">${publishedAt}</span>` : ''}
                        </button>
                    </h2>
                    <div
                        id="${collapseId}"
                        class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
                        aria-labelledby="${headingId}"
                    >
                        <div class="accordion-body announcement-content">
                            ${announcement.content}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="accordion" id="announcementsAccordion">
                ${accordionItems}
            </div>
            <div class="form-check text-start mt-3">
                <input class="form-check-input" type="checkbox" id="dismissAnnouncements" checked>
                <label class="form-check-label" for="dismissAnnouncements">
                    不要再顯示，除非公告有更新
                </label>
            </div>
            <style>
                .swal2-html-container { text-align: initial; }
                .announcement-content { max-height: 260px; overflow-y: auto; }
                .announcement-content p:last-child { margin-bottom: 0; }
            </style>
        `;
    }

    async function showAnnouncementsIfNeeded(Swal: any) {
        const announcements = data.announcements || [];
        if (!browser || !data.currentUser || announcements.length === 0) return;

        const version = getAnnouncementVersion(announcements);
        const storageKey = `announcements:dismissed:${data.currentUser.id}`;
        const currentCheckKey = `${data.currentUser.id}:${version}`;

        if (announcementCheckKey === currentCheckKey) return;
        announcementCheckKey = currentCheckKey;

        if (localStorage.getItem(storageKey) === version) return;

        const result = await Swal.fire({
            title: '最新公告',
            html: buildAnnouncementsHtml(announcements),
            width: 720,
            confirmButtonText: '我知道了',
            didOpen: () => {
                const bootstrap = $bs;
                if (!bootstrap) return;
                document.querySelectorAll('#announcementsAccordion .collapse').forEach((element) => {
                    new bootstrap.Collapse(element, { toggle: false });
                });
            },
            preConfirm: () => {
                const dismissCheckbox = document.getElementById('dismissAnnouncements') as HTMLInputElement | null;
                return {
                    shouldDismiss: Boolean(dismissCheckbox?.checked)
                };
            }
        });

        if (result.isConfirmed && result.value?.shouldDismiss) {
            localStorage.setItem(storageKey, version);
        }
    }

    // 2. Svelte 5: 使用 $effect 替代 $:
    // 這是 "Hydration" (注水) 過程：
    // 伺服器從 httpOnly Cookie 讀出 Token -> 傳給前端 -> 前端設定給 pb SDK
    $effect(() => {
        if (browser && data.token && data.currentUser) {
            // 讓前端的 pb 實例知道現在是誰登入
            // 這樣在前端 call pb.files.getUrl() 時才會有正確的權限
            pb.authStore.save(data.token, data.currentUser);
        } else if (browser) {
            pb.authStore.clear();
        }
    });

    $effect(() => {
        if (!browser || !SweetAlert || !data.currentUser || !data.announcements?.length) return;
        showAnnouncementsIfNeeded(SweetAlert);
    });

    onMount(async () => {
        // 動態載入 UI 庫
        if (browser) {
            const [bootstrapModule, sweetalert2Module] = await Promise.all([
                import('bootstrap'),
                import('sweetalert2')
            ]);
            bs.set(bootstrapModule);
            swal.set(sweetalert2Module.default);
            SweetAlert = sweetalert2Module.default;
        }
    });
</script>

{@render children()}
