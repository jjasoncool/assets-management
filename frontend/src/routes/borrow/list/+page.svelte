<script lang="ts">
    import { goto } from '$app/navigation';
    // 改用 $app/state 引入 page 和 navigating
    import { page, navigating } from '$app/state';
    import Navbar from '$lib/components/Navbar.svelte';
    import { bs } from '$lib/stores';
    import type { Modal } from 'bootstrap';
    // [關鍵] 確保 helpers.ts 裡面有這些函式
    import { getFileToken, getPocketBaseImageUrl } from '$lib/utils/helpers';

    let { data } = $props();
    // 使用 $derived 獲取資料
    let currentUser = $derived(data.currentUser);
    let recordsResult = $derived(data.recordsResult);
    let currentViewMode = $derived(data.viewMode);
    let currentFilterStatus = $derived(data.filterStatus);
    let currentPage = $derived(data.page);

    // 載入狀態邏輯更新
    // 在 $app/state 中，navigating 是一個物件。
    // 當沒有導航時，navigating.to 為 undefined/null。
    // 因此檢查 !!navigating.to 或是 Boolean(navigating.to) 才是正確判斷是否在導航中的方式。
    let isLoading = $derived(Boolean(navigating.to));

    // [UI 狀態控制]
    let selectedRecord = $state<any>(null);
    let fileToken = $state('');
    let activeSlide = $state(0);
    let activeImageTab = $state<'borrow' | 'return'>('borrow');
    // [Svelte 5] 使用 $derived 自動計算圖片
    let currentImages = $derived(
        selectedRecord
            ? (activeImageTab === 'borrow' ? (selectedRecord.borrow_images || []) : (selectedRecord.return_images || []))
            : []
    );
    // Bootstrap Modal 實例
    let modalElement: HTMLDivElement;
    let modal: Modal | null = $state(null);
    $effect(() => {
        if (modalElement && $bs) {
            modal = new $bs.Modal(modalElement, { keyboard: true, backdrop: true });
        }
        return () => modal?.dispose();
    });

    function updateQueryParams(newParams: { page?: number, status?: string, viewMode?: string }) {
        // page 現在是響應式物件，直接使用 page.url (不需要 $page)
        const url = new URL(page.url);
        if (newParams.page !== undefined) {
            url.searchParams.set('page', newParams.page.toString());
        }

        if (newParams.status !== undefined) {
            if (newParams.status) url.searchParams.set('status', newParams.status);
            else url.searchParams.delete('status');
        }

        if (newParams.viewMode !== undefined) {
            url.searchParams.set('viewMode', newParams.viewMode);
        }

        goto(url, { keepFocus: true });
    }

    function toggleViewMode() {
		const newMode = currentViewMode === 'my' ? 'all' : 'my';
        updateQueryParams({ viewMode: newMode, page: 1 });
    }

    function handleFilterChange(event: Event) {
        const select = event.currentTarget as HTMLSelectElement;
        updateQueryParams({ status: select.value, page: 1 });
    }

    function goToPage(newPage: number) {
        if (!recordsResult) return;
        if (newPage > 0 && newPage <= recordsResult.totalPages) {
            updateQueryParams({ page: newPage });
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

    // Action: 開啟 Modal 並獲取 Token
    async function openRecordModal(record: any) {
        selectedRecord = record;
        activeSlide = 0;
        activeImageTab = 'borrow';
        modal?.show();

        // 使用共用函式獲取 Token
        fileToken = await getFileToken();
    }

    // Action: 輪播圖切換
    function changeSlide(direction: 'prev' | 'next', total: number) {
        if (direction === 'next') {
            activeSlide = (activeSlide + 1) % total;
        } else {
            activeSlide = (activeSlide - 1 + total) % total;
        }
    }
</script>

<svelte:head>
    <title>借還記錄</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar/>

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4">
            <div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0 fw-bold">
                    <i class="mdi mdi-format-list-checks me-2"></i>借還記錄
                </h5>
                <div class="d-flex gap-2">
                    															{#if currentUser?.role?.includes('admin')}
                    																<button
                    																	class="btn btn-sm btn-info"
                    																	onclick={toggleViewMode}
                    																	title={currentViewMode === 'all' ? '僅顯示我的記錄' : '顯示所有記錄'}
                    																>                            {#if currentViewMode === 'all'}
                                <i class="mdi mdi-account-outline me-1"></i>我的
                            {:else}
                                <i class="mdi mdi-account-group-outline me-1"></i>全部
                            {/if}
                        </button>
                    {/if}
                    <div style="width: 150px;">
                        <select
                            class="form-select form-select-sm"
                            value={currentFilterStatus}
                            onchange={handleFilterChange}
                        >
                            <option value="">所有狀態</option>
                            <option value="pending">待審核</option>
                            <option value="borrowed">借用中</option>
                            <option value="overdue">已逾期</option>
                            <option value="returned">已歸還</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card-body p-4">
                {#if isLoading}
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">載入中...</span>
                        </div>
                        <p class="mt-2">載入記錄中...</p>
                    </div>
				{:else if !recordsResult || recordsResult.items.length === 0}
                    <div class="alert alert-info text-center">
                        <p class="mb-2"><i class="mdi mdi-information-outline mdi-24px"></i></p>
                        找不到任何借用記錄。
                        {#if !currentFilterStatus}
                            <a href="/assets" class="alert-link fw-bold">前往資產列表</a> 看看有什麼可以借用。
                        {/if}
                    </div>
                {:else}
                    <div class="px-2 py-2 bg-light border-bottom text-muted small mb-2">
                        <i class="mdi mdi-information-outline me-1"></i>
                        <span class="text-primary opacity-75">點擊列表可查看詳細內容與照片</span>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    {#if currentViewMode === 'all' && currentUser?.role?.includes('admin')}
                                        <th>借用人</th>
                                    {/if}
                                    <th>資產名稱</th>
                                    <th>借用日期</th>
                                    <th>預計歸還</th>
                                    <th class="text-center">狀態</th>
                                    <th class="text-end">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each recordsResult.items as borrow (borrow.id)}
                                    <tr
                                        class:table-warning={borrow.status === 'pending'}
                                        class:table-danger={borrow.status === 'overdue'}
                                        class="cursor-pointer"
                                        role="button"
                                        tabindex="0"
                                        onclick={() => openRecordModal(borrow)}
                                        onkeydown={(e) => e.key === 'Enter' && openRecordModal(borrow)}
                                    >
                                        {#if currentViewMode === 'all' && currentUser?.role?.includes('admin')}
											<td>{borrow.expand?.user?.name || borrow.expand?.user?.email}</td>
                                        {/if}
                                        <td>
                                            <a
                                                href={`/assets?search=${borrow.expand?.asset?.asset_id}`}
                                                onclick={(e) => e.stopPropagation()}
                                                class="text-decoration-none fw-bold"
                                            >
                                                {borrow.expand?.asset?.name}
                                            </a>
                                            <small class="d-block text-muted">{borrow.expand?.asset?.asset_id}</small>
                                        </td>
                                        <td>{new Date(borrow.borrow_date).toLocaleDateString()}</td>
                                        <td>{new Date(borrow.expected_return_date).toLocaleDateString()}</td>
                                        <td class="text-center">
                                            <span class="badge {getStatusClass(borrow.status)}">{borrow.status}</span>
                                        </td>
                                        <td class="text-end">
                                            {#if (borrow.status === 'borrowed' || borrow.status === 'overdue') && (borrow.user === currentUser?.id || currentUser?.role?.includes('admin'))}
                                                <a
                                                    href="/return?recordId={borrow.id}"
                                                    class="btn btn-sm btn-outline-primary"
                                                    onclick={(e) => e.stopPropagation()}
                                                >
                                                    <i class="mdi mdi-undo-variant me-1"></i> 歸還
                                                </a>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-4">
                        <div>
                            <small class="text-muted">
                                總共 {recordsResult.totalItems} 筆，目前在第 {recordsResult.page} / {recordsResult.totalPages} 頁
                            </small>
                        </div>
                        <nav>
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item" class:disabled={currentPage <= 1}>
                                    <button
                                        class="page-link"
                                        onclick={() => goToPage(1)}
                                        disabled={currentPage <= 1}
                                        title="第一頁"
                                    >
                                        <i class="mdi mdi-page-first"></i>
                                    </button>
                                </li>
                                <li class="page-item" class:disabled={currentPage <= 1}>
                                    <button
                                        class="page-link"
                                        onclick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage <= 1}
                                    >
                                        上一頁
                                    </button>
                                </li>
                                <li class="page-item" class:disabled={currentPage >= recordsResult.totalPages}>
                                    <button
                                        class="page-link"
                                        onclick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage >= recordsResult.totalPages}
                                    >
                                        下一頁
                                    </button>
                                </li>
                                <li class="page-item" class:disabled={currentPage >= recordsResult.totalPages}>
                                    <button
                                        class="page-link"
                                        onclick={() => goToPage(recordsResult.totalPages)}
                                        disabled={currentPage >= recordsResult.totalPages}
                                        title="最後一頁"
                                    >
                                        <i class="mdi mdi-page-last"></i>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

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
                                <span class="fw-medium">{new Date(selectedRecord.borrow_date).toLocaleDateString()}</span>
                            </div>

                            <div class="mb-3">
                                <span class="text-muted small d-block">預計歸還</span>
                                <span class="fw-medium">{new Date(selectedRecord.expected_return_date).toLocaleDateString()}</span>
                            </div>

                            {#if selectedRecord.return_date}
                                <div class="mb-3">
                                    <span class="text-muted small d-block">實際歸還</span>
                                    <span class="fw-medium text-success">{new Date(selectedRecord.return_date).toLocaleDateString()}</span>
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

                            {#if currentImages.length > 0}
                                <div class="carousel slide bg-dark rounded overflow-hidden position-relative">
                                    <div class="carousel-inner">
                                        {#each currentImages as img, i}
											<div class="carousel-item {i === activeSlide ? 'active' : ''} transition-opacity duration-300">
                                                <div class="d-flex align-items-center justify-content-center" style="height: 350px;">
                                                    <img
                                                        src={getPocketBaseImageUrl(selectedRecord.collectionId, selectedRecord.id, img, fileToken)}
                                                        class="d-block w-100 h-100 object-fit-contain"
                                                        alt="Proof"
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

    .cursor-pointer {
        cursor: pointer;
    }
    .cursor-pointer:hover {
        background-color: rgba(var(--bs-dark-rgb), 0.03) !important;
    }
</style>
