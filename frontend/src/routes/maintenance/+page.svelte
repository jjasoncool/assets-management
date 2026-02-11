<script lang="ts">
    import Navbar from '$lib/components/Navbar.svelte';
    import { bs } from '$lib/stores';
    import type { Modal } from 'bootstrap';
    import { getFileToken, getPocketBaseImageUrl } from '$lib/utils/helpers';

    // Svelte 5 Runes: Props & Derived
    let { data } = $props();
    let records = $derived(data.records?.items || []);

    // [State] UI 狀態控制
    let selectedRecord = $state<any>(null);
    let fileToken = $state('');

    // [State] 圖片輪播控制 (不依賴 bootstrap.js，改由 Svelte 控制 index)
    let activeSlide = $state(0);

    // Bootstrap Modal 實例
    let modalElement: HTMLDivElement;
    let modal: Modal | null = $state(null);
    let bsInstance: any = null;

    bs.subscribe((value) => (bsInstance = value));

    $effect(() => {
        if (modalElement && bsInstance) {
            modal = new bsInstance.Modal(modalElement, { keyboard: true, backdrop: true });
        }
        return () => modal?.dispose();
    });

    /**
     * Action: 開啟 Modal 並獲取 Token
     */
    async function openRecordModal(record: any) {
        selectedRecord = record;
        activeSlide = 0; // 重置輪播圖到第一張
        modal?.show();

        fileToken = await getFileToken();
    }

    /**
     * Action: 輪播圖切換 (上一張/下一張)
     */
    function changeSlide(direction: 'prev' | 'next', total: number) {
        if (direction === 'next') {
            activeSlide = (activeSlide + 1) % total;
        } else {
            activeSlide = (activeSlide - 1 + total) % total;
        }
    }
</script>

<svelte:head>
    <title>維護紀錄總覽 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
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

            <div class="card-body p-0">
                {#if records.length > 0}
                    <div class="px-4 py-2 bg-light border-bottom text-muted small">
                        已歸檔歷史紀錄：{records.length} 筆
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
                                        <p class="text-muted mb-0">目前尚無歷史維護紀錄</p>
                                    </td>
                                </tr>
                            {/if}

                            {#each records as record (record.id)}
                                <tr
                                    class="cursor-pointer"
                                    role="button"
                                    tabindex="0"
                                    onclick={() => openRecordModal(record)}
                                    onkeydown={(e) => e.key === 'Enter' && openRecordModal(record)}
                                >
                                    <td class="ps-4 text-nowrap fw-medium">
                                        {new Date(record.maintenance_date).toLocaleDateString()}
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
                                        {#if record.maintenance_type === 'preventive'}
                                            <span class="badge bg-success bg-opacity-10 text-success">預防性</span>
                                        {:else if record.maintenance_type === 'corrective'}
                                            <span class="badge bg-danger bg-opacity-10 text-danger">修復性</span>
                                        {:else}
                                            <span class="badge bg-secondary bg-opacity-10 text-secondary">
                                                {record.maintenance_type}
                                            </span>
                                        {/if}
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

<!-- Detail Modal -->
<div class="modal fade" id="detailModal" bind:this={modalElement} tabindex="-1" aria-labelledby="detailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow border-0">
            {#if selectedRecord}
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="detailModalLabel">
                        <i class="mdi mdi-clipboard-text-search-outline me-2"></i>維護紀錄詳情
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body p-4">
                    <div class="row g-4">
                        <div class="col-md-5 border-end">
                            <h6 class="text-uppercase text-muted small fw-bold mb-3 ls-1">基本資訊</h6>

                            <div class="mb-3">
                                <span class="text-muted small d-block">資產名稱</span>
                                <span class="fw-bold fs-5">{selectedRecord.expand?.asset?.name || 'Unknown'}</span>
                                <br>
                                <small class="font-monospace text-muted">{selectedRecord.expand?.asset?.asset_id}</small>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">維護日期</span>
                                <span class="fw-medium">{new Date(selectedRecord.maintenance_date).toLocaleDateString()}</span>
                            </div>

                            {#if selectedRecord.complete_date}
                                <div class="mb-3">
                                    <span class="text-muted small d-block">完工日期</span>
                                    <span class="fw-medium text-success">{new Date(selectedRecord.complete_date).toLocaleDateString()}</span>
                                </div>
                            {/if}

                            <div class="mb-3">
                                <span class="text-muted small d-block">維護費用</span>
                                <span class="fw-bold text-success font-monospace fs-5">${selectedRecord.cost.toLocaleString()}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">詳細描述</span>
                                <div class="p-2 bg-light rounded text-secondary" style="white-space: pre-wrap;">
                                    {selectedRecord.description || '無詳細描述'}
                                </div>
                            </div>
                        </div>

                        <div class="col-md-7">
                            <h6 class="text-uppercase text-muted small fw-bold mb-3 ls-1">
                                <i class="mdi mdi-image-multiple me-1"></i>照片 ({selectedRecord.maintenance_images?.length || 0})
                            </h6>

                            {#if selectedRecord.maintenance_images && selectedRecord.maintenance_images.length > 0}
                                <div class="carousel slide bg-dark rounded overflow-hidden position-relative">

                                    <div class="carousel-inner">
                                        {#each selectedRecord.maintenance_images as img, i}
                                            <div class="carousel-item {i === activeSlide ? 'active' : ''} transition-opacity duration-300">
                                                <div class="d-flex align-items-center justify-content-center" style="height: 350px;">
                                                    <img
                                                        src={getPocketBaseImageUrl(selectedRecord.collectionId, selectedRecord.id, img, fileToken)}
                                                        class="d-block w-100 h-100 object-fit-contain"
                                                        alt="Maintenance Proof"
                                                    >
                                                </div>
                                            </div>
                                        {/each}
                                    </div>

                                    {#if selectedRecord.maintenance_images.length > 1}
                                        <button
                                            class="carousel-control-prev"
                                            type="button"
                                            onclick={() => changeSlide('prev', selectedRecord.maintenance_images.length)}
                                        >
                                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                            <span class="visually-hidden">Previous</span>
                                        </button>
                                        <button
                                            class="carousel-control-next"
                                            type="button"
                                            onclick={() => changeSlide('next', selectedRecord.maintenance_images.length)}
                                        >
                                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                            <span class="visually-hidden">Next</span>
                                        </button>
                                    {/if}
                                </div>

                                {#if selectedRecord.maintenance_images.length > 1}
                                    <div class="d-flex justify-content-center gap-2 mt-3">
                                        {#each selectedRecord.maintenance_images as _, i}
                                            <button
                                                type="button"
                                                class="btn btn-sm rounded-circle p-0 border-0 {i === activeSlide ? 'bg-primary' : 'bg-secondary opacity-25'}"
                                                style="width: 8px; height: 8px;"
                                                onclick={() => activeSlide = i}
                                                aria-label="Slide {i + 1}"
                                            ></button>
                                        {/each}
                                    </div>
                                {/if}

                            {:else}
                                <div class="d-flex flex-column align-items-center justify-content-center bg-light rounded border border-dashed text-muted" style="height: 300px;">
                                    <i class="mdi mdi-image-off-outline" style="font-size: 4rem;"></i>
                                    <p class="mt-2 mb-0">未上傳照片</p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">關閉</button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* 確保 Modal 內容在小螢幕時可以滾動 */
    .modal-body {
        max-height: 80vh;
        overflow-y: auto;
    }

    /* BS5 預設沒有 hover pointer utility，手動補上 */
    .cursor-pointer {
        cursor: pointer;
    }
    /* 增加 hover 回饋感 */
    .cursor-pointer:hover {
        background-color: rgba(var(--bs-dark-rgb), 0.03) !important;
    }
</style>
