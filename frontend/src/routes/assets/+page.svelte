<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    // 假設 Asset 類型與 Service 已定義
    import { getAssets, searchAssets, type Asset } from '$lib/services/assetService';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

    // 資產數據狀態
    let assets: Asset[] = [];
    let loading = true;
    let error: string | null = null;
    let selectedAssets: string[] = [];

    // 搜尋與分頁狀態
    let searchQuery = '';
    let statusFilter = '';
    let currentPage = 1;
    let perPage = 20;
    let totalItems = 0;
    let totalPages = 0;

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

            let filter = statusFilter ? `status = "${statusFilter}"` : '';

            let result;
            if (searchQuery.trim()) {
                result = await searchAssets(searchQuery.trim(), {
                    filter: filter,
                    page: page,
                    perPage: perPage,
                    sort: '-updated',
                    expand: 'category,assigned_to'
                });
            } else {
                result = await getAssets({
                    filter: filter,
                    page: page,
                    perPage: perPage,
                    sort: '-updated',
                    expand: 'category,assigned_to'
                });
            }

            // PocketBase 將關聯資料放在 'expand' 屬性中。
            // 這裡我們將 expand 內的資料映射回主物件，以符合 Asset 介面定義並讓表格正確顯示。
            assets = result.items.map((record: any) => ({
                ...record,
                // 如果有 expand.category，就用它覆蓋原本只是 ID 的 category 欄位
                category: record.expand?.category,
                // 同理，處理 assigned_to 讓負責人也能正確顯示
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

    function handleLogout() {
        logout();
        goto('/login');
    }

    onMount(() => loadAssets());
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
                            bind:value={searchQuery}
                            on:keydown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div class="col-md-3">
                        <label for="status" class="form-label small fw-bold text-secondary">狀態過濾</label>
                        <select id="status" class="form-select shadow-none" bind:value={statusFilter} on:change={handleSearch}>
                            {#each statusOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-primary w-100" on:click={handleSearch}>
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
                        <tr>
                            <th style="width: 40px;">
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    checked={selectedAssets.length === assets.length && assets.length > 0}
                                    on:change={toggleSelectAll}
                                />
                            </th>
                            <th>資產編號</th>
                            <th>名稱</th>
                            <th>類別</th>
                            <th>品牌/型號</th>
                            <th>狀態</th>
                            <th>位置</th>
                            <th>負責人</th>
                            <th>更新時間</th>
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
                                <tr class="cursor-pointer" on:click={() => goto(`/assets/${asset.id}`)}>
                                    <td on:click|stopPropagation>
                                        <input
                                            type="checkbox"
                                            class="form-check-input"
                                            checked={selectedAssets.includes(asset.id)}
                                            on:change={() => toggleAssetSelection(asset.id)}
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
                                    <td class="text-end px-4">
                                        <button class="btn btn-link text-danger p-0 shadow-none" title="刪除資產" aria-label="刪除資產">
                                            <i class="mdi mdi-delete-outline fs-5"></i>
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            <div class="card-footer bg-white py-3 border-0">
                <div class="d-flex justify-content-between align-items-center">
                    <button class="btn btn-outline-danger btn-sm" disabled={selectedAssets.length === 0}>
                        刪除所選 ({selectedAssets.length})
                    </button>

                    <nav aria-label="分頁">
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item {currentPage === 1 ? 'disabled' : ''}">
                                <button class="page-link" on:click={() => goToPage(currentPage - 1)}>
                                    &larr;
                                </button>
                            </li>

                            {#each Array.from({length: totalPages}) as _, i}
                                {#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
                                    <li class="page-item {currentPage === i + 1 ? 'active' : ''}">
                                        <button class="page-link" on:click={() => goToPage(i + 1)}>{i + 1}</button>
                                    </li>
                                {:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
                                    <li class="page-item disabled"><span class="page-link">...</span></li>
                                {/if}
                            {/each}

                            <li class="page-item {currentPage === totalPages ? 'disabled' : ''}">
                                <button class="page-link" on:click={() => goToPage(currentPage + 1)}>
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
