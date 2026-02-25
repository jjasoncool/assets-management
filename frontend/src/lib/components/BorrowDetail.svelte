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
    let activeImageTab = $state<'borrow' | 'return'>('borrow');
    
    // [Viewer.js] 使用 $derived 自動計算圖片
    let currentImages = $derived(
        selectedRecord
            ? (activeImageTab === 'borrow' ? (selectedRecord.borrow_images || []) : (selectedRecord.return_images || []))
            : []
    );

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
        activeImageTab = 'borrow'; // 重置 Tab 到借出照片
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
    
    function getStatusClass(status: string) {
        switch (status) {
            case 'borrowed': return 'bg-primary';
            case 'pending': return 'bg-warning text-dark';
            case 'overdue': return 'bg-danger';
            case 'returned': return 'bg-success';
            default: return 'bg-secondary';
        }
    }
</script>

<div class="modal fade" id="borrowDetailModal" bind:this={modalElement} tabindex="-1" aria-labelledby="borrowDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow border-0">
            {#if selectedRecord}
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="borrowDetailModalLabel">
                        <i class="mdi mdi-clipboard-text-search-outline me-2"></i>借用紀錄詳情
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body p-4">
                    <div class="row g-4">
                        <div class="col-md-5 border-end">
                            <h6 class="text-uppercase text-muted small fw-bold mb-3 ls-1">基本資訊</h6>

                            <div class="mb-3">
                                <span class="text-muted small d-block">資產資訊</span>
								<span class="fw-bold fs-5">{selectedRecord.expand?.asset?.name || 'Unknown'}</span>
                                <br>
                                <small class="font-monospace text-muted">{selectedRecord.expand?.asset?.asset_id}</small>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">借用人</span>
                                <span class="fw-medium">{selectedRecord.expand?.user?.name || selectedRecord.expand?.user?.email}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">目前狀態</span>
                                <span class="badge {getStatusClass(selectedRecord.status)} fs-6 mt-1">{selectedRecord.status}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">借用日期</span>
                                <span class="fw-medium">{formatDate(selectedRecord.borrow_date)}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">預計歸還</span>
                                <span class="fw-medium">{formatDate(selectedRecord.expected_return_date)}</span>
                            </div>

                            {#if selectedRecord.return_date}
                                <div class="mb-3">
                                    <span class="text-muted small d-block">實際歸還</span>
                                    <span class="fw-medium text-success">{formatDate(selectedRecord.return_date)}</span>
                                </div>
                            {/if}
                        </div>

                        <div class="col-md-7">
                            <ul class="nav nav-tabs mb-3">
                                <li class="nav-item">
                                    <button
										class="nav-link {activeImageTab === 'borrow' ? 'active' : ''}"
                                        onclick={() => { activeImageTab = 'borrow'; activeSlide = 0; }}
                                        type="button"
                                    >
                                        借出時照片 ({selectedRecord.borrow_images?.length || 0})
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button
										class="nav-link {activeImageTab === 'return' ? 'active' : ''}"
                                        onclick={() => { activeImageTab = 'return'; activeSlide = 0; }}
                                        type="button"
                                    >
                                        歸還時照片 ({selectedRecord.return_images?.length || 0})
                                    </button>
                                </li>
                            </ul>

                            {#key currentImages}
                                {#if currentImages.length > 0}
                                    <div class="carousel slide bg-dark rounded overflow-hidden position-relative" use:imageViewer>
                                        <div class="carousel-inner">
                                            {#each currentImages as img, i}
                                                <div class="carousel-item {i === activeSlide ? 'active' : ''} transition-opacity duration-300">
                                                    <div class="d-flex align-items-center justify-content-center" style="height: 350px;">
                                                        <img
                                                            src={getPocketBaseImageUrl(selectedRecord.collectionId, selectedRecord.id, img, currentToken)}
                                                            class="d-block w-100 h-100 object-fit-contain clickable-img"
                                                            alt="Proof"
                                                            title="點擊放大檢視細節"
                                                        >
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>

                                        {#if currentImages.length > 1}
                                            <button class="carousel-control-prev" type="button" onclick={() => changeSlide('prev', currentImages.length)}>
                                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                                <span class="visually-hidden">Previous</span>
                                            </button>
                                            <button class="carousel-control-next" type="button" onclick={() => changeSlide('next', currentImages.length)}>
                                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                                <span class="visually-hidden">Next</span>
                                            </button>
                                        {/if}
                                    </div>

                                    {#if currentImages.length > 1}
                                        <div class="d-flex justify-content-center gap-2 mt-3">
                                            {#each currentImages as _, i}
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
                                        <p class="mt-2 mb-0">無{activeImageTab === 'borrow' ? '借出' : '歸還'}照片</p>
                                    </div>
                                {/if}
                            {/key}
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
    .modal-body {
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .clickable-img {
        cursor: zoom-in;
    }
</style>
