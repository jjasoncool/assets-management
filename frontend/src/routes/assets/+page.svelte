<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import Navbar from '$lib/components/Navbar.svelte';
    import BorrowForm from '$lib/components/BorrowForm.svelte';
    import { bs, Swal } from '$lib/stores';
    import type { PageData } from './$types';

    // 1. 接收 Server 資料
    // 這裡暫時用 form?: any 防止 ActionData 型別報錯
    let { data, form } = $props<{ data: PageData, form?: any }>();

    // 使用 $derived 連動資料 (Single Source of Truth)
    let currentUser = $derived(data.currentUser);
    let assets = $derived(data.assets?.items || []);
    let totalPages = $derived(data.assets?.totalPages || 0);
    let currentPage = $derived(data.assets?.page || 1);
    let totalItems = $derived(data.assets?.totalItems || 0);

    // 從 Server 回傳或 URL 取得當前排序
    let currentSort = $derived(data.currentSort || 'asset_id');

    // URL 參數狀態 (初始化 UI 顯示用)
    let searchQuery = $state(page.url.searchParams.get('search') || '');
    let statusFilter = $state(page.url.searchParams.get('status') || '');
    let categoryFilter = $state(page.url.searchParams.get('category') || '');

    // 當 URL 變更時，同步更新 UI 的顯示狀態
    // This ensures that when filters are loaded from sessionStorage via goto(),
    // the input fields and select boxes reflect the current state.
    $effect(() => {
        searchQuery = page.url.searchParams.get('search') || '';
        statusFilter = page.url.searchParams.get('status') || '';
        categoryFilter = page.url.searchParams.get('category') || '';
    });

    // 選擇狀態
    let selectedAssets = $state<string[]>([]);

    // Modal 相關
    let borrowModalElement: HTMLElement;
    let borrowModalInstance: any | null = $state(null);
    let selectedAssetForBorrow: any | null = $state(null);

    // Store 訂閱
    let bsInstance: any = null;
    let SwalInstance: any = null;
    bs.subscribe(value => bsInstance = value);
    Swal.subscribe(value => SwalInstance = value);

    const statusOptions = [
        { value: '', label: '全部狀態' },
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '停用' },
        { value: 'maintenance', label: '維護中' },
        { value: 'retired', label: '已報廢' },
        { value: 'lost', label: '遺失' },
        { value: 'stolen', label: '失竊' },
        { value: 'borrowed', label: '借出中' }
    ];

    // --- Filter 持久化 ---
    $effect(() => {
        if (typeof sessionStorage !== 'undefined') {
            const assetFilters = sessionStorage.getItem('assetFilters');
            if (page.url.search) {
                sessionStorage.setItem('assetFilters', page.url.search);
            } else if (assetFilters) {
                goto('/assets' + assetFilters, { replaceState: true });
            }
        }
    });

    // --- 核心導航邏輯 ---

    function updateParams() {
        // 使用 page.url
        const params = new URLSearchParams(page.url.searchParams);

        if (searchQuery) params.set('search', searchQuery);
        else params.delete('search');

        if (statusFilter) params.set('status', statusFilter);
        else params.delete('status');

        if (categoryFilter) params.set('category', categoryFilter);
        else params.delete('category');

        params.set('page', '1'); // 搜尋條件變更時重置回第一頁
        goto(`?${params.toString()}`);
    }

    function clearFilters() {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('assetFilters');
        }
        searchQuery = '';
        statusFilter = '';
        categoryFilter = '';
        goto('/assets', { replaceState: true });
    }

    // 排序邏輯
    function handleSort(field: string) {
        // 使用 page.url
        const params = new URLSearchParams(page.url.searchParams);

        if (currentSort === field) {
            params.set('sort', `-${field}`);
        } else if (currentSort === `-${field}`) {
            params.set('sort', field);
        } else {
            params.set('sort', field);
        }

        params.set('page', '1');
        goto(`?${params.toString()}`);
    }

    function goToPage(p: number) {
        if (p >= 1 && p <= totalPages) {
            // 使用 page.url
            const params = new URLSearchParams(page.url.searchParams);
            params.set('page', p.toString());
            goto(`?${params.toString()}`);
        }
    }

    // --- 刪除邏輯 (Server Action) ---
    let deleteForm: HTMLFormElement;
    let deleteId = $state('');

    async function confirmDelete(id: string) {
        const result = await SwalInstance?.fire({
            title: '確定要刪除此資產？',
            text: "此操作無法復原！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '確認刪除',
            cancelButtonText: '取消'
        });

        if (result.isConfirmed) {
            deleteId = id;
            setTimeout(() => deleteForm.requestSubmit(), 0);
        }
    }

    // --- 借用 Modal 邏輯 ---
    function openBorrowModal(event: MouseEvent, asset: any) {
        event.stopPropagation();
        selectedAssetForBorrow = asset;
        borrowModalInstance?.show();
    }

    function handleBorrowSuccess() {
        borrowModalInstance?.hide();
        SwalInstance?.fire('成功', '資產借用申請成功！', 'success');
    }

    // --- 選擇邏輯 (保留 UI 互動) ---
    function toggleAssetSelection(assetId: string) {
        if (selectedAssets.includes(assetId)) {
            selectedAssets = selectedAssets.filter(id => id !== assetId);
        } else {
            selectedAssets = [...selectedAssets, assetId];
        }
    }

    function toggleSelectAll() {
        if (assets.length > 0 && assets.every((a: any) => selectedAssets.includes(a.id))) {
            const currentPageIds = assets.map((a: any) => a.id);
            selectedAssets = selectedAssets.filter(id => !currentPageIds.includes(id));
        } else {
            const newIds = assets.map((a: any) => a.id).filter((id: string) => !selectedAssets.includes(id));
            selectedAssets = [...selectedAssets, ...newIds];
        }
    }

    // --- Helper functions ---
    function getStatusBadgeClass(status: string) {
        const classes: Record<string, string> = {
            active: 'text-bg-success',
            inactive: 'text-bg-secondary',
            maintenance: 'text-bg-warning',
            retired: 'text-bg-dark',
            lost: 'text-bg-danger',
            stolen: 'text-bg-danger',
            borrowed: 'text-bg-info'
        };
        return classes[status] || 'text-bg-secondary';
    }

    function getStatusLabel(status: string) {
        return statusOptions.find(opt => opt.value === status)?.label || status;
    }

    $effect(() => {
        if (borrowModalElement && bsInstance) {
            borrowModalInstance = new bsInstance.Modal(borrowModalElement);
        }
        return () => borrowModalInstance?.dispose();
    });
</script>

<svelte:head>
    <title>資產管理 - 資產清單</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <form
            method="POST"
            action="?/delete"
            bind:this={deleteForm}
            use:enhance={() => {
                return async ({ result, update }) => {
                    await update();
                    if (result.type === 'success') {
                        SwalInstance?.fire('已刪除！', '資產已被成功刪除。', 'success');
                        selectedAssets = selectedAssets.filter(id => id !== deleteId);
                    } else {
                        SwalInstance?.fire('錯誤', '刪除失敗', 'error');
                    }
                };
            }}
        >
            <input type="hidden" name="id" value={deleteId}>
        </form>

        <div class="card shadow-sm bg-white bg-opacity-90 mb-4 mt-4">
            <div class="card-body p-4">
                <div class="row g-3 align-items-end">
                    <div class="col-md-3">
                        <label for="search" class="form-label small fw-bold text-secondary">搜尋資產</label>
                        <input
                            type="text"
                            id="search"
                            class="form-control shadow-none"
                            placeholder="關鍵字..."
                            bind:value={searchQuery}
                            onkeydown={(e) => e.key === 'Enter' && updateParams()}
                        />
                    </div>
                    <div class="col-md-3">
                        <label for="category" class="form-label small fw-bold text-secondary">類別</label>
                        <select id="category" class="form-select shadow-none"
                            bind:value={categoryFilter}
                            onchange={updateParams}>
                            <option value="">全部</option>
                            {#if data.categories}
                                {#each data.categories as category}
                                    <option value={category.id}>{category.name}</option>
                                {/each}
                            {/if}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label for="status" class="form-label small fw-bold text-secondary">狀態</label>
                        <select id="status" class="form-select shadow-none"
                            bind:value={statusFilter}
                            onchange={updateParams}>
                            <option value="">全部</option>
                            {#each statusOptions.slice(1) as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="col-md-1">
                        <button class="btn btn-primary w-100" type="button" onclick={updateParams}>
                            <i class="mdi mdi-magnify"></i> 搜尋
                        </button>
                    </div>
                     <div class="col-md-2">
                        <button class="btn btn-outline-danger w-100" type="button" onclick={clearFilters}>
                            清除過濾條件
                        </button>
                    </div>
                    <div class="col-md-1 text-md-end">
                        <a href="/assets/add" class="btn btn-success w-100">
                            <i class="mdi mdi-plus"></i> 新增資產
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">資產清單</h5>
            </div>
             <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light text-muted">
                        <tr class="user-select-none">
                            <th style="width: 40px;" class="d-none d-lg-table-cell">
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    checked={assets.length > 0 && assets.every((a: any) => selectedAssets.includes(a.id))}
                                    onchange={toggleSelectAll}
                                />
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('asset_id')}>
                                資產編號
                                {#if currentSort === 'asset_id'} <i class="mdi mdi-arrow-up text-primary"></i> {/if}
                                {#if currentSort === '-asset_id'} <i class="mdi mdi-arrow-down text-primary"></i> {/if}
                            </th>
                            <th class="cursor-pointer d-none d-lg-table-cell" onclick={() => handleSort('name')}>
                                名稱
                                {#if currentSort === 'name'} <i class="mdi mdi-arrow-up text-primary"></i> {/if}
                                {#if currentSort === '-name'} <i class="mdi mdi-arrow-down text-primary"></i> {/if}
                            </th>
                            <th class="d-none d-lg-table-cell">類別</th>
                            <th>品牌/型號</th>
                            <th>狀態</th>
                            <th class="d-none d-lg-table-cell">位置</th>
                            <th class="d-none d-lg-table-cell">保管人</th>
                            <th class="cursor-pointer d-none d-lg-table-cell" onclick={() => handleSort('created')}>
                                建立日期
                                {#if currentSort === 'created'} <i class="mdi mdi-arrow-up text-primary"></i> {/if}
                                {#if currentSort === '-created'} <i class="mdi mdi-arrow-down text-primary"></i> {/if}
                            </th>
                            <th class="text-end px-2 px-lg-4">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if assets.length === 0}
                            <tr><td colspan="10" class="text-center py-5 text-muted">找不到任何資產</td></tr>
                        {:else}
                            {#each assets as asset}
                                <tr class="cursor-pointer" onclick={() => goto(`/assets/${asset.id}/edit`)}>
                                    <td onclick={(e) => e.stopPropagation()} class="d-none d-lg-table-cell">
                                        <input
                                            type="checkbox"
                                            class="form-check-input"
                                            checked={selectedAssets.includes(asset.id)}
                                            onchange={() => toggleAssetSelection(asset.id)}
                                        />
                                    </td>
                                    <td class="fw-medium">{asset.asset_id}</td>
                                    <td class="d-none d-lg-table-cell">{asset.name}</td>
                                    <td class="d-none d-lg-table-cell">{asset.expand?.category?.name || '未分類'}</td>
                                    <td>{asset.brand || ''} {asset.model || ''}</td>
                                    <td>
                                        <span class="badge rounded-pill {getStatusBadgeClass(asset.status)}">
                                            {getStatusLabel(asset.status)}
                                        </span>
                                    </td>
                                    <td class="d-none d-lg-table-cell">{asset.location || '-'}</td>
                                    <td class="d-none d-lg-table-cell">{asset.expand?.assigned_to?.name || asset.expand?.assigned_to?.email || '未指派'}</td>
                                    <td class="text-muted small d-none d-lg-table-cell">{new Date(asset.created).toLocaleDateString()}</td>
                                    <td class="text-end px-2 px-lg-4" onclick={(e) => e.stopPropagation()}>
                                        <div style="white-space: nowrap;">
                                            {#if asset.status === 'active' && asset.is_lendable}
                                                <button onclick={(e) => openBorrowModal(e, asset)} class="btn btn-sm btn-outline-primary me-2" title="借用">
                                                    <i class="mdi mdi-hand-heart"></i><span class="d-none d-sm-inline"> 借用</span>
                                                </button>
                                            {/if}
                                            {#if currentUser?.role?.includes('admin')}
                                                <button
                                                    class="btn btn-link text-danger p-0 shadow-none"
                                                    title="刪除"
                                                    onclick={(e) => { e.stopPropagation(); confirmDelete(asset.id); }}
                                                >
                                                    <i class="mdi mdi-delete-outline fs-5"></i>
                                                </button>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
             </div>

             <div class="card-footer bg-white py-3 border-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                         {#if currentUser?.role?.includes('admin')}
                            <button class="btn btn-outline-danger btn-sm me-2 d-none d-lg-inline-block" disabled={selectedAssets.length === 0}>
                                刪除所選 ({selectedAssets.length})
                            </button>
                        {/if}
                        <span class="small text-muted ms-2">
                            總共 {totalItems} 筆
                        </span>
                    </div>

                    <nav aria-label="分頁">
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item {currentPage === 1 ? 'disabled' : ''}">
                                <button class="page-link" onclick={() => goToPage(currentPage - 1)}>&larr;</button>
                            </li>
                            {#each Array.from({length: totalPages}) as _, i}
                                <li class="page-item {currentPage === i + 1 ? 'active' : ''}">
                                    <button class="page-link" onclick={() => goToPage(i + 1)}>{i + 1}</button>
                                </li>
                            {/each}
                            <li class="page-item {currentPage === totalPages ? 'disabled' : ''}">
                                <button class="page-link" onclick={() => goToPage(currentPage + 1)}>&rarr;</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="borrowModal" tabindex="-1" aria-labelledby="borrowModalLabel" aria-hidden="true" bind:this={borrowModalElement}>
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="borrowModalLabel">
                    <i class="mdi mdi-hand-heart me-2"></i>資產借用登記
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            {#if selectedAssetForBorrow}
                <BorrowForm
                    asset={selectedAssetForBorrow}
                    borrowableUsers={data.borrowableUsers}
                    currentUser={currentUser}
                    onsuccess={handleBorrowSuccess}
                    oncancel={() => borrowModalInstance?.hide()}
                />
            {/if}
        </div>
    </div>
</div>

<style>
    @media (max-width: 991.98px) {
        /*
         * On small screens (<lg), some columns are hidden. We target
         * the visible 'Status' and 'Actions' columns to control their width.
         *
         * The full table has 10 columns.
         * '操作' (Actions) is the last child, so nth-last-child(1) is correct.
         * '狀態' (Status) is the 6th child, so nth-last-child(5) is correct (10 - 6 + 1).
        */
        .table th:nth-last-child(1),
        .table td:nth-last-child(1) {
            width: 85px; /* 操作 */
            min-width: 85px;
        }

        .table th:nth-last-child(5),
        .table td:nth-last-child(5) {
            width: 75px; /* 狀態 */
        }
    }
</style>
