<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import { getMaintenanceTypeLabel } from '$lib/utils/helpers';
	import { bs } from '$lib/stores';
	import type { PageData } from './$types';
	import type { Modal } from 'bootstrap';
	import { formatDate, getCurrentZonedDateString } from '$lib/utils/datetime';

	const { data } = $props<{ data: PageData }>();
	let records = $derived(data.records?.items || []);

	// Modal 狀態控制
	let selectedRecord: any = $state(null);
	let isSubmitting = $state(false);
	let isCostSameAsEstimate = $state(true);
	let actualCost = $state(0);

	$effect(() => {
		if (isCostSameAsEstimate && selectedRecord) {
			actualCost = selectedRecord.cost;
		}
	});

	// Bootstrap Modal 實例
	let modalElement: HTMLDivElement;
	let modal: Modal | null = $state(null);
	let bsInstance: any = null;
	bs.subscribe((value) => (bsInstance = value));

	$effect(() => {
		if (modalElement && bsInstance) {
			modal = new bsInstance.Modal(modalElement);

			// 當 modal 隱藏後，清除選中的 record
			modalElement.addEventListener('hidden.bs.modal', () => {
				selectedRecord = null;
			});
		}

		return () => {
			modal?.dispose();
		};
	});

	// 手動觸發 Modal 開啟，避免 Bootstrap JS 與 Svelte 生命週期衝突
	async function openCompleteModal(record: any) {
		selectedRecord = record;
		actualCost = record.cost;
		isCostSameAsEstimate = true;

		// 等待 Svelte 更新 DOM (確保 modal 內的 {#if selectedRecord} 區塊已渲染)
		await tick();
		modal?.show();
	}

	// SvelteKit form action 成功後，在 enhance 的 callback 中關閉 modal
	function onFormSuccess() {
		modal?.hide();

		// 等待 modal 動畫結束後再清理狀態
		setTimeout(() => {
			isSubmitting = false;
		}, 300);
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
				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light text-secondary small">
							<tr>
								<th class="ps-4 py-3">開單日期</th>
								<th class="py-3">資產名稱 / 編號</th>
								<th class="py-3">維護類型</th>
								<th class="py-3">費用估算</th>
								<th class="py-3">執行人</th>
								<th class="pe-4 py-3 text-end">操作</th>
							</tr>
						</thead>
						<tbody>
							{#if records.length === 0}
								<tr>
									<td colspan="6" class="text-center py-5">
										<div class="text-success opacity-50 mb-2">
											<i class="mdi mdi-check-decagram-outline fs-1"></i>
										</div>
										<p class="text-success fw-medium mb-0">目前沒有待修資產</p>
									</td>
								</tr>
							{:else}
								{#each records as record (record.id)}
									<tr>
										<td class="ps-4 text-nowrap">
											{formatDate(record.maintenance_date)}
										</td>
										<td>
											<div class="d-flex flex-column">
												<span class="fw-bold">{record.expand?.asset?.name || 'Unknown'}</span>
												<span class="text-muted small font-monospace">
													{record.expand?.asset?.asset_id || '-'}
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
										<td class="font-monospace">${record.cost.toLocaleString()}</td>
										<td>{record.expand?.performed_by?.name || '-'}</td>

										<td class="pe-4 text-end">
											<button
												type="button"
												class="btn btn-sm btn-success text-white shadow-sm"
												onclick={() => openCompleteModal(record)}
											>
												<i class="mdi mdi-check-circle-outline me-1"></i>
												維護完成
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

<!-- Modal -->
<div class="modal fade" id="completeModal" bind:this={modalElement} tabindex="-1" aria-labelledby="completeModalLabel" aria-hidden="true">
	<div class="modal-dialog modal-dialog-centered">
		<div class="modal-content shadow">
			{#if selectedRecord}
				<div class="modal-header bg-success text-white">
					<h5 class="modal-title" id="completeModalLabel">
						<i class="mdi mdi-check-decagram me-2"></i>確認完工結案
					</h5>
					<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="關閉"></button>
				</div>

				<div class="modal-body">
					<form
						method="POST"
						action="?/complete"
						enctype="multipart/form-data"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update, result }) => {
								await update();
								isSubmitting = false;
								if (result.type === 'success') {
									onFormSuccess();
								}
							};
						}}
					>
						<input type="hidden" name="record_id" value={selectedRecord.id} />
						<input type="hidden" name="asset_id" value={selectedRecord.asset} />
						<input type="hidden" name="estimated_cost" value={selectedRecord.cost} />

						<div class="alert alert-light border mb-3">
							<div class="d-flex justify-content-between mb-1">
								<span class="text-muted small">資產名稱:</span>
								<span class="fw-bold">{selectedRecord.expand?.asset?.name}</span>
							</div>
							<div class="d-flex justify-content-between">
								<span class="text-muted small">維護類型:</span>
								<span>{getMaintenanceTypeLabel(selectedRecord.maintenance_type)}</span>
							</div>
						</div>

						<div class="mb-3 border rounded p-3 bg-light">
							<p class="mb-2 small text-muted">
								費用估算: <span class="fw-bold font-monospace">${selectedRecord.cost.toLocaleString()}</span>
							</p>

							<div class="form-check form-switch mb-2">
								<input
									class="form-check-input"
									type="checkbox"
									role="switch"
									id="cost_is_same"
									name="cost_is_same"
									bind:checked={isCostSameAsEstimate}
								/>
								<label class="form-check-label" for="cost_is_same">實際花費與估算相符</label>
							</div>

							<div class="">
								<label for="actual_cost" class="form-label small fw-bold"
									>實際花費金額 <span class="text-danger">*</span></label
								>
								<input
									type="number"
									class="form-control"
									id="actual_cost"
									name="actual_cost"
									required
									bind:value={actualCost}
									disabled={isCostSameAsEstimate}
								/>
							</div>
						</div>

						<div class="mb-3">
							<label for="complete_date" class="form-label fw-bold">完工日期 <span class="text-danger">*</span></label>
							<input
								type="date"
								class="form-control"
								id="complete_date"
								name="complete_date"
								required
								value={getCurrentZonedDateString()}
							/>
						</div>

						<div class="mb-3">
							<label for="proof_images" class="form-label fw-bold">完工證明照片</label>
							<input
								type="file"
								class="form-control"
								id="proof_images"
								name="proof_images"
								multiple
								accept="image/*"
							/>
							<div class="form-text text-success">
								<i class="mdi mdi-information-outline"></i>
								系統將會把照片<b>附加 (Append)</b> 到維護紀錄中。
							</div>
						</div>

						<div class="d-flex justify-content-end gap-2 mt-4">
							<button type="button" class="btn btn-light border" data-bs-dismiss="modal" disabled={isSubmitting}>取消</button>
							<button type="submit" class="btn btn-success text-white" disabled={isSubmitting}>
								{#if isSubmitting}
									<span class="spinner-border spinner-border-sm me-2"></span>處理中...
								{:else}
									<i class="mdi mdi-check me-1"></i> 確認結案
								{/if}
							</button>
						</div>
					</form>
				</div>
			{/if}
		</div>
	</div>
</div>
