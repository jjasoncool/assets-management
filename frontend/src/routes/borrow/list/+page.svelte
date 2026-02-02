<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ListResult } from 'pocketbase';
	import Navbar from '$lib/components/Navbar.svelte';
	import { logout } from '$lib/services/userService';
	import { getBorrowRecords, type BorrowRecord } from '$lib/services/borrowService';

	let { data } = $props();
	let currentUser = $derived(data.currentUser);

	let recordsResult = $state<ListResult<BorrowRecord> | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let viewModeManual = $state<'my' | 'all' | null>(null);
	const defaultViewMode = $derived(
		data.currentUser?.role?.includes('admin') ? 'all' : 'my'
	);
	let viewMode = $derived(viewModeManual ?? defaultViewMode);

	$effect(() => {
		// When user changes, reset the manual viewMode selection
		data.currentUser;
		viewModeManual = null;
	});
	let filterStatus = $state<'pending' | 'borrowed' | 'overdue' | 'returned' | ''>('borrowed');
	let page = $state(1);
	const perPage = 10; // Adjusted for better viewing

	// A single, consolidated effect to handle all data fetching.
	// This prevents the auto-cancellation error caused by multiple effects firing on init.
	$effect(() => {
		if (!currentUser) {
			// If we know for sure they are logged out (initial data is null), redirect.
			if (data.currentUser === null) {
				goto('/login');
			}
			// Otherwise, just wait for currentUser to be populated.
			return;
		}

		// This effect will now run once on load with the correct initial `viewMode`,
		// and then re-run only when its dependencies (page, filterStatus, viewMode) change.
		fetchRecords();
	});

	async function fetchRecords() {
		loading = true;
		error = null;
		// Create a new AbortController for each request.
		const controller = new AbortController();
		const signal = controller.signal;

		try {
			if (!currentUser) return;

			let filterParts: string[] = [];

			if (filterStatus) {
				filterParts.push(`status = "${filterStatus}"`);
			}

			// In admin 'all' mode, show all. In 'my' mode, show only user's.
			// Non-admins are always in 'my' mode.
			if (viewMode === 'my' || !currentUser?.role?.includes('admin')) {
				filterParts.push(`user = "${currentUser.id}"`);
			}

			const result = await getBorrowRecords(
				{
					filter: filterParts.join(' && '),
					page,
					perPage,
					sort: '-created', // Show newest first
					expand: 'user,asset'
				},
				{ signal } // Pass the signal to the SDK
			);
			recordsResult = result as unknown as ListResult<BorrowRecord>;
		} catch (err: any) {
			if (err.name === 'AbortError' || err.name === 'ClientResponseError' && err.isAbort) {
				// Don't set error for intentional cancellations
				console.log('Request was intentionally aborted');
			} else {
				error = err.message || '無法載入借用記錄';
			}
		} finally {
			// Only set loading to false if this wasn't an aborted request
			// that is being superseded by a new one.
			if (!signal.aborted) {
				loading = false;
			}
		}
	}

	function handleLogout() {
		logout();
		goto('/login');
	}

	function toggleViewMode() {
		page = 1; // Reset to first page
		viewModeManual = viewMode === 'my' ? 'all' : 'my';
	}

	function handleFilterChange() {
		page = 1; // Reset to first page
	}

	function goToPage(newPage: number) {
		if (!recordsResult) return;
		if (newPage > 0 && newPage <= recordsResult.totalPages) {
			page = newPage;
			fetchRecords();
		}
	}

	function getStatusClass(status: string) {
		switch (status) {
			case 'borrowed':
				return 'bg-primary';
			case 'pending':
				return 'bg-warning text-dark';
			case 'overdue':
				return 'bg-danger';
			case 'returned':
				return 'bg-success';
			default:
				return 'bg-secondary';
		}
	}
</script>

<svelte:head>
	<title>借還記錄</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-4">
		<Navbar {handleLogout} {currentUser} />

		<div class="card shadow-sm bg-white bg-opacity-90">
			<div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold">
					<i class="mdi mdi-format-list-checks me-2"></i>借還記錄
				</h5>
                <div class="d-flex gap-2">
                    {#if currentUser?.role?.includes('admin')}
                    <button class="btn btn-sm btn-outline-secondary" onclick={toggleViewMode} title={viewMode === 'all' ? '僅顯示我的記錄' : '顯示所有記錄'}>
                        {#if viewMode === 'all'}
                            <i class="mdi mdi-account-outline me-1"></i>我的
                        {:else}
                            <i class="mdi mdi-account-group-outline me-1"></i>全部
                        {/if}
                    </button>
                    {/if}
                    <div style="width: 150px;">
                        <select class="form-select form-select-sm" bind:value={filterStatus} onchange={handleFilterChange}>
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
				{#if loading}
					<div class="text-center py-5">
						<div class="spinner-border text-primary" role="status">
							<span class="visually-hidden">載入中...</span>
						</div>
						<p class="mt-2">載入記錄中...</p>
					</div>
				{:else if error}
					<div class="alert alert-danger">
						<i class="mdi mdi-alert-circle-outline me-2"></i>{error}
					</div>
				{:else if !recordsResult || recordsResult.items.length === 0}
					<div class="alert alert-info text-center">
						<p class="mb-2"><i class="mdi mdi-information-outline mdi-24px"></i></p>
						找不到任何借用記錄。
						{#if !filterStatus}
							<a href="/assets" class="alert-link fw-bold">前往資產列表</a> 看看有什麼可以借用。
						{/if}
					</div>
				{:else}
					<div class="table-responsive">
						<table class="table table-hover align-middle">
							<thead class="table-light">
								<tr>
									{#if viewMode === 'all' && currentUser?.role?.includes('admin')}
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
								{#each recordsResult.items as borrow}
									<tr
										class:table-warning={borrow.status === 'pending'}
										class:table-danger={borrow.status === 'overdue'}
									>
										{#if viewMode === 'all' && currentUser?.role?.includes('admin')}
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

					<!-- Pagination -->
					<div class="d-flex justify-content-between align-items-center mt-4">
						<div>
							<small class="text-muted">
								總共 {recordsResult.totalItems} 筆，目前在第 {recordsResult.page} / {recordsResult.totalPages} 頁
							</small>
						</div>
						<nav>
							<ul class="pagination pagination-sm mb-0">
								<li class="page-item" class:disabled={!recordsResult || page <= 1}>
									<button class="page-link" onclick={() => goToPage(1)} disabled={!recordsResult || page <= 1} title="第一頁">
										<i class="mdi mdi-page-first"></i>
									</button>
								</li>
								<li class="page-item" class:disabled={!recordsResult || page <= 1}>
									<button class="page-link" onclick={() => goToPage(page - 1)} disabled={!recordsResult || page <= 1}>
										上一頁
									</button>
								</li>
								<li class="page-item" class:disabled={!recordsResult || page >= recordsResult.totalPages}>
									<button class="page-link" onclick={() => goToPage(page + 1)} disabled={!recordsResult || page >= recordsResult.totalPages}>
										下一頁
									</button>
								</li>
								<li class="page-item" class:disabled={!recordsResult || page >= recordsResult.totalPages}>
									<button class="page-link" onclick={() => { if (recordsResult) goToPage(recordsResult.totalPages); }} disabled={!recordsResult || page >= recordsResult.totalPages} title="最後一頁">
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
