<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { goto } from '$app/navigation';

	// Svelte 5 Runes
	let { data } = $props();
	let assets = $derived(data.assets?.items || []);

	// 狀態設定
	const statusConfig: Record<string, { label: string; class: string; icon: string }> = {
		// [修正] 改為 maintenance 以對應資料庫
		maintenance: {
			label: '維修中',
			class: 'bg-warning text-dark',
			icon: 'mdi-wrench'
		},
		broken: {
			label: '已損壞',
			class: 'bg-danger text-white',
			icon: 'mdi-alert-circle'
		}
	};

	function getStatus(status: string) {
		return statusConfig[status] || {
			label: status,
			class: 'bg-secondary text-white',
			icon: 'mdi-help-circle'
		};
	}
</script>

<svelte:head>
	<title>維修進行中 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-warning">
			<div class="card-header bg-warning bg-opacity-10 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold text-warning-emphasis">
					<i class="mdi mdi-progress-wrench me-2"></i>維修進行中
				</h5>

				<div class="d-flex gap-2">
					<a href="/maintenance" class="btn btn-outline-dark btn-sm bg-white">
						<i class="mdi mdi-history me-1"></i>
						返回歷史紀錄
					</a>
					<a href="/maintenance/create" class="btn btn-primary btn-sm">
						<i class="mdi mdi-plus me-1"></i> 新增維護單
					</a>
				</div>
			</div>

			<div class="card-body p-0">
				{#if assets.length > 0}
					<div class="px-4 py-2 bg-light border-bottom text-muted small">
						待處理案件：{assets.length} 件
					</div>
				{/if}

				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light text-secondary small">
							<tr>
								<th class="ps-4 py-3">資產編號</th>
								<th class="py-3">資產名稱</th>
								<th class="py-3">資產類別</th>
								<th class="py-3">當前狀態</th>
								<th class="py-3">存放位置</th>
								<th class="pe-4 py-3 text-end">快速操作</th>
							</tr>
						</thead>
						<tbody>
							{#if assets.length === 0}
								<tr>
									<td colspan="6" class="text-center py-5">
										<div class="text-success opacity-50 mb-2">
											<i class="mdi mdi-check-decagram-outline fs-1"></i>
										</div>
										<p class="text-success fw-medium mb-0">目前沒有待修資產</p>
									</td>
								</tr>
							{:else}
								{#each assets as asset (asset.id)}
									{@const status = getStatus(asset.status)}

									<tr class="cursor-pointer" onclick={() => goto(`/assets/${asset.id}/edit`)}>
										<td class="ps-4 font-monospace fw-medium">
											{asset.asset_id}
										</td>
										<td>
											<div class="d-flex flex-column">
												<span class="fw-bold text-dark">{asset.name}</span>
												{#if asset.expand?.assigned_to}
													<span class="text-muted small">
														{asset.expand.assigned_to.name}
													</span>
												{/if}
											</div>
										</td>
										<td>
											<span class="badge bg-light text-secondary border fw-normal">
												{asset.expand?.category?.name || '未分類'}
											</span>
										</td>
										<td>
											<span class={`badge ${status.class}`}>
												<i class={`mdi ${status.icon} me-1`}></i>
												{status.label}
											</span>
										</td>
										<td>{asset.location || '-'}</td>
										<td class="pe-4 text-end" onclick={(e) => e.stopPropagation()}>
											<button
												class="btn btn-sm btn-outline-success bg-white"
												title="完成維護並結案"
												onclick={() => goto(`/assets/${asset.id}/edit?returnTo=maintenance/in-progress`)}
											>
												<i class="mdi mdi-check me-1"></i> 結案
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
	}
</style>