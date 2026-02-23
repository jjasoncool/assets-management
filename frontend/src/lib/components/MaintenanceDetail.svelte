<script lang="ts">
    import { bs } from '$lib/stores';
    import { getPocketBaseImageUrl } from '$lib/utils/helpers';
    import { formatDate } from '$lib/utils/datetime';
    import { imageViewer } from '$lib/actions/viewer';
    import type { Modal } from 'bootstrap';

    // 內部狀態控制
    let modalElement: HTMLDivElement;
    let modal: Modal | null = $state(null);
    let bsInstance: any = null;

    let selectedRecord: any = $state(null);
    let currentToken = $state('');
    let activeSlide = $state(0);

    bs.subscribe((value) => (bsInstance = value));

    $effect(() => {
        if (modalElement && bsInstance) {
            modal = new bsInstance.Modal(modalElement, { keyboard: true, backdrop: true });
        }
        return () => modal?.dispose();
    });

    /**
     * 暴露給外部元件呼叫的方法：開啟 Modal 並載入資料
     */
    export function showModal(record: any, token: string) {
        selectedRecord = record;
        currentToken = token;
        activeSlide = 0; // 重置輪播圖到第一張
        modal?.show();
    }

    /**
     * 輪播圖切換 (上一張/下一張)
     */
    function changeSlide(direction: 'prev' | 'next', total: number) {
        if (direction === 'next') {
            activeSlide = (activeSlide + 1) % total;
        } else {
            activeSlide = (activeSlide - 1 + total) % total;
        }
    }
</script>

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
                                <span class="fw-medium">{formatDate(selectedRecord.maintenance_date)}</span>
                            </div>

                            {#if selectedRecord.complete_date}
                                <div class="mb-3">
                                    <span class="text-muted small d-block">完工日期</span>
                                    <span class="fw-medium text-success">{formatDate(selectedRecord.complete_date)}</span>
                                </div>
                            {/if}

                            <div class="mb-3">
                                <span class="text-muted small d-block">維護費用</span>
                                <span class="fw-bold text-success font-monospace fs-5">${selectedRecord.cost.toLocaleString()}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">詳細描述</span>
                                <div class="p-2 bg-light rounded text-secondary text-break" style="white-space: pre-wrap;">
                                    {selectedRecord.description || '無詳細描述'}
                                </div>
                            </div>
                        </div>

                        <div class="col-md-7">
                            <h6 class="text-uppercase text-muted small fw-bold mb-3 ls-1">
                                <i class="mdi mdi-image-multiple me-1"></i>照片 ({selectedRecord.maintenance_images?.length || 0})
                            </h6>

                            {#if selectedRecord.maintenance_images && selectedRecord.maintenance_images.length > 0}
                                <div class="carousel slide bg-dark rounded overflow-hidden position-relative" use:imageViewer>
                                    <div class="carousel-inner">
                                        {#each selectedRecord.maintenance_images as img, i}
                                            <div class="carousel-item {i === activeSlide ? 'active' : ''} transition-opacity duration-300">
                                                <div class="d-flex align-items-center justify-content-center" style="height: 350px;">
                                                    <img
                                                        src={getPocketBaseImageUrl(selectedRecord.collectionId, selectedRecord.id, img, currentToken)}
                                                        class="d-block w-100 h-100 object-fit-contain clickable-img"
                                                        alt="Maintenance Proof"
                                                        title="點擊放大檢視細節"
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

    /* 保留游標互動提示 */
    .clickable-img {
        cursor: zoom-in;
        transition: transform 0.2s ease;
    }

    .clickable-img:hover {
        transform: scale(1.02);
    }
</style>
