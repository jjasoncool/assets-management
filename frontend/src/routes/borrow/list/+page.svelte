<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/stores';
	import { navigating } from '$app/stores';
	import Navbar from '$lib/components/Navbar.svelte';
    // [已移除] import { logout } ... (改由 Navbar 內部的 Form Action 處理)

	let { data } = $props();

	let currentUser = $derived(data.currentUser);
	let recordsResult = $derived(data.recordsResult);
	let currentViewMode = $derived(data.viewMode);
	let currentFilterStatus = $derived(data.filterStatus);
	let currentPage = $derived(data.page);

	let isLoading = $derived(!!$navigating);

    // [已移除] function handleLogout() ...

	function updateQueryParams(newParams: { page?: number, status?: string, viewMode?: string }) {
		const url = new URL($pageStore.url);

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
							class="btn btn-sm btn-outline-secondary"
							onclick={toggleViewMode}
							title={currentViewMode === 'all' ? '僅顯示我的記錄' : '顯示所有記錄'}
						>
							{#if currentViewMode === 'all'}
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
									>
										{#if currentViewMode === 'all' && currentUser?.role?.includes('admin')}
											<td>{borrow.expand?.user?.name || borrow.expand?.user?.email}</td>
										{/if}
										<td>
											<a href={`/assets?search=${borrow.expand?.asset?.asset_id}`}>{borrow.expand?.asset?.name}</a>
											<small class="d-block text-muted">{borrow.expand?.asset?.asset_id}</small>
										</td>
										<td>{new Date(borrow.borrow_date).toLocaleDateString()}</td>
										<td>{new Date(borrow.expected_return_date).toLocaleDateString()}</td>
										<td class="text-center">
											<span class="badge {getStatusClass(borrow.status)}">{borrow.status}</span>
										</td>
										<td class="text-end">
											{#if (borrow.status === 'borrowed' || borrow.status === 'overdue') && (borrow.user === currentUser?.id || currentUser?.role?.includes('admin'))}
												<a href="/return?recordId={borrow.id}" class="btn btn-sm btn-outline-primary">
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