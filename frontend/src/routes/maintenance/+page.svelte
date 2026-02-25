<script lang="ts">
    import Navbar from '$lib/components/Navbar.svelte';
    import MaintenanceDetail from '$lib/components/MaintenanceDetail.svelte';
    import { getFileToken, getMaintenanceTypeInfo } from '$lib/utils/helpers';
    import { formatDate } from '$lib/utils/datetime';
    import { bs } from '$lib/stores';

    // Svelte 5 Runes: Props & Derived
    let { data } = $props();
    let records = $derived(
        data.records?.items.map((r: any) => ({
            ...r,
            typeInfo: getMaintenanceTypeInfo(r.maintenance_type)
        })) || []
    );
    let status = $derived(data.status); // 獲取當前的篩選狀態

    // Detail Modal 元件參考
    let detailModal: ReturnType<typeof MaintenanceDetail>;

    // 初始化 Tooltip
    $effect(() => {
        let bsInstance: any = null;
        const unsubscribe = bs.subscribe(value => bsInstance = value);

        if (bsInstance) {
            const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
                return new bsInstance.Tooltip(tooltipTriggerEl);
            });

            return () => {
                tooltipList.forEach(tooltip => tooltip.dispose());
            };
        }
        
        return unsubscribe;
    });

    /**
     * Action: 開啟 Modal 並獲取 Token
     */
    async function openRecordModal(record: any) {
        const fileToken = await getFileToken();
        // 呼叫子元件的 showModal 方法
        detailModal?.showModal(record, fileToken);
    }
</script>

<svelte:head>
    <title>維護紀錄總覽 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4">
            <div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0 fw-bold">
                    <i class="mdi mdi-history me-2"></i>維護紀錄中心
                </h5>

                <div class="d-flex gap-2">
                    <a href="/maintenance/in-progress" class="btn btn-outline-secondary btn-sm bg-white">
                        <i class="mdi mdi-progress-wrench me-1 text-warning"></i>
                        查看進行中案件
                    </a>
                    <a href="/maintenance/create" class="btn btn-primary btn-sm">
                        <i class="mdi mdi-plus me-1"></i> 新增維護單
                    </a>
                </div>
            </div>

            <ul class="nav nav-tabs px-4 pt-2 border-bottom-0" role="tablist">
                <li class="nav-item" role="presentation">
                    <a
                        class="nav-link"
                        class:active={status === 'completed'}
                        href="/maintenance"
                        aria-current={status === 'completed' ? 'page' : undefined}
                    >
                        <i class="mdi mdi-check-circle-outline me-1"></i>
                        已完成紀錄
                    </a>
                </li>
                <li class="nav-item" role="presentation">
                    <a
                        class="nav-link"
                        class:active={status === 'all'}
                        href="/maintenance?status=all"
                        aria-current={status === 'all' ? 'page' : undefined}
                    >
                        <i class="mdi mdi-format-list-bulleted me-1"></i>
                        所有紀錄
                    </a>
                </li>
            </ul>

            <div class="card-body p-0">
                {#if records.length > 0}
                    <div class="px-4 py-2 bg-light border-bottom text-muted small">
                        {status === 'all' ? '所有歷史紀錄' : '已歸檔的完成紀錄'}：{records.length} 筆
                        <span class="ms-2 text-primary opacity-75">(點擊列表可查看詳情與照片)</span>
                    </div>
                {/if}

                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light text-secondary small">
                            <tr>
                                <th class="ps-4 py-3">維護日期</th>
                                <th class="py-3">資產名稱</th>
                                <th class="py-3">維護類型</th>
                                <th class="py-3">費用</th>
                                <th class="py-3">執行人員</th>
                                <th class="py-3">維護內容描述</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#if records.length === 0}
                                <tr>
                                    <td colspan="6" class="text-center py-5">
                                        <div class="text-muted opacity-25 mb-2">
                                            <i class="mdi mdi-clipboard-text-off-outline fs-1"></i>
                                        </div>
                                        <p class="text-muted mb-0">
                                            {#if status === 'all'}
                                                目前尚無任何維護紀錄
                                            {:else}
                                                目前尚無已完成的維護紀錄
                                            {/if}
                                        </p>
                                    </td>
                                </tr>
                            {/if}

                            {#each records as record (record.id)}
                                <tr
                                    class="cursor-pointer"
                                    class:table-warning={status === 'all' && !record.complete_date}
                                    role="button"
                                    tabindex="0"
                                    onclick={() => openRecordModal(record)}
                                    onkeydown={(e) => e.key === 'Enter' && openRecordModal(record)}
                                >
                                    <td class="ps-4 text-nowrap fw-medium">
                                        {formatDate(record.maintenance_date)}
                                    </td>
                                    <td>
                                        <div class="d-flex flex-column">
                                            <span class="fw-bold text-dark">
                                                {record.expand.asset?.name || '未知資產'}
                                            </span>
                                            <span class="text-muted small font-monospace">
                                                {record.expand.asset?.asset_id || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            class={record.typeInfo.className}
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            title={record.typeInfo.description}
                                        >
                                            {record.typeInfo.label || '其他'}
                                        </span>
                                    </td>
                                    <td class="font-monospace fw-bold">
                                        ${record.cost.toLocaleString()}
                                    </td>
                                    <td>
                                        {record.expand.performed_by?.name || 'N/A'}
                                    </td>
                                    <td class="text-muted text-truncate" style="max-width: 280px;" title={record.description}>
                                        {record.description}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card-footer bg-white py-2 text-end">
                <small class="text-muted">僅顯示最近 20 筆資料</small>
            </div>
        </div>
    </div>
</div>

<MaintenanceDetail bind:this={detailModal} />

<style>
    /* BS5 預設沒有 hover pointer utility，手動補上 */
    .cursor-pointer {
        cursor: pointer;
    }
    /* 增加 hover 回饋感 */
    .cursor-pointer:hover {
        background-color: rgba(var(--bs-dark-rgb), 0.03) !important;
    }
</style>
