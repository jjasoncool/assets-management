<script lang="ts">
    import { goto, replaceState } from '$app/navigation';
    import { page } from '$app/state';
    import { get } from 'svelte/store';
    import { getAssets, searchAssets, type Asset } from '$lib/services/assetService';
    import { logout } from '$lib/services/userService';
    import { pb } from '$lib/pocketbase';
    import { bs, Swal } from '$lib/stores';
    import Navbar from '$lib/components/Navbar.svelte';
    import BorrowForm from '$lib/components/BorrowForm.svelte';

    let { data } = $props();
    let currentUser = $derived(data?.currentUser);

    // 資產數據狀態
    let assets = $state<Asset[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let selectedAssets = $state<string[]>([]);

    // 搜尋、過濾與排序狀態
    let searchQuery = $state('');
    let statusFilter = $state('');
    let sortOrder = $state('asset_id'); // 預設排序

    // 分頁狀態
    let currentPage = $state(1);
    let perPage = 20;
    let totalItems = $state(0);
    let totalPages = $state(0);

    // Modal state
    let borrowModalElement: HTMLElement;
    let borrowModalInstance: any | null = $state(null);
    let selectedAssetForBorrow: Asset | null = $state(null);
    let bsInstance: any = null;
	bs.subscribe(value => bsInstance = value);

    // 狀態選項配置
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

    // 核心邏輯：載入資產
    async function loadAssets(page = 1) {
        try {
            loading = true;
            error = null;

            const filter = statusFilter ? `status = "${statusFilter}"` : '';

            let result;
            if (searchQuery.trim()) {
                result = await searchAssets(searchQuery.trim(), {
                    filter: filter,
                    page: page,
                    perPage: perPage,
                    expand: 'category,assigned_to'
                });
            } else {
                result = await getAssets({
                    filter: filter,
                    page: page,
                    perPage: perPage,
                    expand: 'category,assigned_to'
                });
            }

            assets = result.items.map((record: any) => ({
                ...record,
                category: record.expand?.category,
                assigned_to: record.expand?.assigned_to
            })) as unknown as Asset[];

            totalItems = result.totalItems;
            totalPages = result.totalPages;
            currentPage = result.page;
        } catch (err) {
            error = err instanceof Error ? err.message : '載入資產失敗';
        } finally {
            loading = false;
        }
    }

    // Modal handlers
    function showBorrowModal(asset: Asset) {
        selectedAssetForBorrow = asset;
        borrowModalInstance?.show();
    }

    function handleBorrowSuccess() {
        borrowModalInstance?.hide();
        get(Swal).fire({
            title: '成功',
            text: '資產借用申請成功！',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
        // Update the status of the borrowed asset in the list
        if (selectedAssetForBorrow) {
            const index = assets.findIndex(a => a.id === selectedAssetForBorrow!.id);
            if (index !== -1) {
                assets[index].status = 'borrowed'; // Or 'pending' depending on the flow
                assets = [...assets]; // Trigger reactivity
            }
        }
    }

    function handleBorrowClick(event: MouseEvent, asset: Asset) {
        event.stopPropagation();
        showBorrowModal(asset);
    }

    // 處理搜尋與過濾
    function handleSearch() {
        currentPage = 1;
        loadAssets(1);
    }

    // 分頁跳轉
    function goToPage(page: number) {
        if (page >= 1 && page <= totalPages) {
            loadAssets(page);
        }
    }

    // 取得狀態對應的 Bootstrap Badge 類別
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

    // 選擇邏輯
    function toggleAssetSelection(assetId: string) {
        selectedAssets = selectedAssets.includes(assetId)
            ? selectedAssets.filter(id => id !== assetId)
            : [...selectedAssets, assetId];
    }

    function toggleSelectAll() {
        selectedAssets = selectedAssets.length === assets.length ? [] : assets.map(a => a.id);
    }

    async function handleDelete(id: string) {
        // 從 store 獲取 Swal 實例
        const swalInstance = get(Swal);
        const result = await swalInstance.fire({
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
            try {
                await pb.collection('assets').delete(id);
                await swalInstance.fire('已刪除！', '資產已被成功刪除。', 'success');
                loadAssets(currentPage);
                selectedAssets = selectedAssets.filter(itemId => itemId !== id);
            } catch (err) {
                swalInstance.fire('錯誤', '刪除資產時發生錯誤', 'error');
            }
        }
    }

    // 處理排序
    function handleSort(field: string) {
        const newSortOrder = sortOrder === field ? `-${field}` : field;
        sortOrder = newSortOrder;
        // 使用 SvelteKit 的 replaceState 避免觸發 $effect 重新載入資料
        replaceState(`?sort=${newSortOrder}`, {});
        // 直接在瀏覽器端排序
        sortAssets();
    }

    // 在瀏覽器端排序資產
    function sortAssets() {
        if (assets.length === 0) return;

        const field = sortOrder.replace('-', '');
        const direction = sortOrder.startsWith('-') ? -1 : 1;

        assets.sort((a, b) => {
            let valueA, valueB;

            switch (field) {
                case 'asset_id':
                    valueA = a.asset_id;
                    valueB = b.asset_id;
                    break;
                case 'name':
                    valueA = a.name;
                    valueB = b.name;
                    break;
                case 'category':
                    valueA = a.category?.name || '';
                    valueB = b.category?.name || '';
                    break;
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                case 'location':
                    valueA = a.location || '';
                    valueB = b.location || '';
                    break;
                case 'assigned_to':
                    valueA = a.assigned_to?.name || a.assigned_to?.email || '';
                    valueB = b.assigned_to?.name || b.assigned_to?.email || '';
                    break;
                case 'updated':
                    valueA = new Date(a.updated).getTime();
                    valueB = new Date(b.updated).getTime();
                    break;
                default:
                    return 0;
            }

            // 確保排序的穩定性，當值相同時保持原有順序
            if (valueA === valueB) return 0;

            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return valueA.localeCompare(valueB) * direction;
            } else if (typeof valueA === 'number' && typeof valueB === 'number') {
                return (valueA - valueB) * direction;
            }

            return 0;
        });
    }

    function handleLogout() {
        logout();
        goto('/login');
    }

    $effect(() => {
        // Initialize modal
        if (borrowModalElement && bsInstance) {
            borrowModalInstance = new bsInstance.Modal(borrowModalElement);
        }

        const urlSort = page.url.searchParams.get('sort');
        if (urlSort) {
            sortOrder = urlSort;
        }
        // 使用 setTimeout 確保 DOM 完全載入後再載入資料，避免自動取消
        setTimeout(() => {
            loadAssets();
        }, 0);

        // Cleanup modal instance
        return () => {
            borrowModalInstance?.dispose();
        }
    });
</script>

<svelte:head>
    <title>資產管理 - 資產清單</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <div class="card shadow-sm bg-white bg-opacity-90 mb-4 mt-4">
            <div class="card-body p-4">
                <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                        <label for="search" class="form-label small fw-bold text-secondary">搜尋資產</label>
                        <input
                            type="text"
                            id="search"
                            class="form-control shadow-none"
                            placeholder="輸入名稱、編號或序號..."
                            value={searchQuery}
                            oninput={(e) => searchQuery = e.currentTarget.value}
                            onkeydown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div class="col-md-3">
                        <label for="status" class="form-label small fw-bold text-secondary">狀態過濾</label>
                        <select id="status" class="form-select shadow-none" value={statusFilter} onchange={(e) => { statusFilter = e.currentTarget.value; handleSearch(); }}>
                            {#each statusOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-primary w-100" onclick={handleSearch}>
                            <i class="mdi mdi-magnify"></i> 搜尋
                        </button>
                    </div>
                    <div class="col-md-3 text-md-end">
                        <a href="/assets/add" class="btn btn-success">
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
                            <th style="width: 40px;">
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    checked={selectedAssets.length === assets.length && assets.length > 0}
                                    onchange={toggleSelectAll}
                                />
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('asset_id')}>
                                資產編號
                                {#if sortOrder.includes('asset_id')}
                                    <i class="mdi {sortOrder === 'asset_id' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('name')}>
                                名稱
                                {#if sortOrder.includes('name')}
                                    <i class="mdi {sortOrder === 'name' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('category')}>
                                類別
                                {#if sortOrder.includes('category')}
                                    <i class="mdi {sortOrder === 'category' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th>品牌/型號</th>
                            <th class="cursor-pointer" onclick={() => handleSort('status')}>
                                狀態
                                {#if sortOrder.includes('status')}
                                    <i class="mdi {sortOrder === 'status' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('location')}>
                                位置
                                {#if sortOrder.includes('location')}
                                    <i class="mdi {sortOrder === 'location' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('assigned_to')}>
                                負責人
                                {#if sortOrder.includes('assigned_to')}
                                    <i class="mdi {sortOrder === 'assigned_to' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="cursor-pointer" onclick={() => handleSort('updated')}>
                                更新時間
                                {#if sortOrder.includes('updated')}
                                    <i class="mdi {sortOrder === 'updated' ? 'mdi-arrow-up' : 'mdi-arrow-down'}"></i>
                                {/if}
                            </th>
                            <th class="text-end px-4">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if loading}
                            <tr><td colspan="10" class="text-center py-5 text-muted">載入中...</td></tr>
                        {:else if assets.length === 0}
                            <tr><td colspan="10" class="text-center py-5 text-muted">找不到任何資產</td></tr>
                        {:else}
                            {#each assets as asset}
                                <tr class="cursor-pointer" onclick={() => goto(`/assets/${asset.id}/edit`)}>
                                    <td onclick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            class="form-check-input"
                                            checked={selectedAssets.includes(asset.id)}
                                            onchange={() => toggleAssetSelection(asset.id)}
                                        />
                                    </td>
                                    <td class="fw-medium">{asset.asset_id}</td>
                                    <td>{asset.name}</td>
                                    <td>{asset.category?.name || '未分類'}</td>
                                    <td>{asset.brand || ''} {asset.model || ''}</td>
                                    <td>
                                        <span class="badge rounded-pill {getStatusBadgeClass(asset.status)}">
                                            {getStatusLabel(asset.status)}
                                        </span>
                                    </td>
                                    <td>{asset.location || '-'}</td>
                                    <td>{asset.assigned_to?.name || asset.assigned_to?.email || '未指派'}</td>
                                    <td class="text-muted small">{new Date(asset.updated).toLocaleDateString('zh-TW')}</td>
                                    <td class="text-end px-4" onclick={(e) => e.stopPropagation()}>
                                        {#if asset.status === 'active'}
                                            <button onclick={(e) => handleBorrowClick(e, asset)} class="btn btn-sm btn-outline-primary me-2" title="借用">
                                                <i class="mdi mdi-hand-heart"></i> 借用
                                            </button>
                                        {/if}
                                        {#if currentUser?.role?.includes('admin')}
                                            <button
                                                class="btn btn-link text-danger p-0 shadow-none"
                                                title="刪除資產"
                                                aria-label="刪除資產"
                                                onclick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                                            >
                                                <i class="mdi mdi-delete-outline fs-5"></i>
                                            </button>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            <div class="card-footer bg-white py-3 border-0">
                <div class="d-flex justify-content-between align-items-center">
                    {#if currentUser?.role?.includes('admin')}
                        <button class="btn btn-outline-danger btn-sm" disabled={selectedAssets.length === 0}>
                            刪除所選 ({selectedAssets.length})
                        </button>
                    {/if}

                    <nav aria-label="分頁">
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item {currentPage === 1 ? 'disabled' : ''}">
                                <button class="page-link" onclick={() => goToPage(currentPage - 1)}>
                                    &larr;
                                </button>
                            </li>

                            {#each Array.from({length: totalPages}) as _, i}
                                {#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
                                    <li class="page-item {currentPage === i + 1 ? 'active' : ''}">
                                        <button class="page-link" onclick={() => goToPage(i + 1)}>{i + 1}</button>
                                    </li>
                                {:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
                                    <li class="page-item disabled"><span class="page-link">...</span></li>
                                {/if}
                            {/each}

                            <li class="page-item {currentPage === totalPages ? 'disabled' : ''}">
                                <button class="page-link" onclick={() => goToPage(currentPage + 1)}>
                                    &rarr;
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Borrow Modal -->
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
                    onsuccess={handleBorrowSuccess}
                    oncancel={() => borrowModalInstance?.hide()}
                />
            {/if}
        </div>
    </div>
</div>
