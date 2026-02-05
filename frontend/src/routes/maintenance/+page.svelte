<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	// Svelte 5 Runes
	let { data } = $props();
	let records = $derived(data.records?.items || []);
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
								<tr>
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