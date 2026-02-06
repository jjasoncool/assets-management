<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import { bs } from '$lib/stores';
	import type { Modal } from 'bootstrap';
	import { getMaintenanceTypeLabel } from '$lib/utils/helpers';

	let { data } = $props();
	let records = $derived(data.records?.items || []);

	// Modal 狀態控制
	let selectedRecord: any = $state(null);
	let isSubmitting = $state(false);

	// Bootstrap Modal 實例
	let modalElement: HTMLDivElement;
	let modal: Modal | null = $state(null);

	// 從 store 取得 Bootstrap library
	let bsInstance: any = null;
	bs.subscribe((value) => (bsInstance = value));

	$effect(() => {
		// 當 modalElement 和 bsInstance 都準備好時，初始化 Modal
		if (modalElement && bsInstance) {
			modal = new bsInstance.Modal(modalElement, {
				keyboard: false, // 防止 ESC 鍵關閉，因為我們有 isSubmitting 狀態要處理
				backdrop: 'static' // 防止點擊背景關閉
			});
		}
		// 元件銷毀時，清理 Modal 實例
		return () => {
			modal?.dispose();
		};
	});


	// 開啟 Modal
	function openCompleteModal(record: any) {
		selectedRecord = record;
		modal?.show();
	}

	// 關閉 Modal
	function closeModal() {
		modal?.hide();
	}

	// SvelteKit form action 成功後，在 enhance 的 callback 中關閉 modal
	function onFormSuccess() {
		closeModal();
		// 等待 modal 動畫結束後再清理狀態
		setTimeout(() => {
			selectedRecord = null;
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
											{new Date(record.maintenance_date).toLocaleDateString()}
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

						<div class="mb-3">
							<label for="complete_date" class="form-label fw-bold">完工日期 <span class="text-danger">*</span></label>
							<input
								type="date"
								class="form-control"
								id="complete_date"
								name="complete_date"
								required
								value={new Date().toISOString().split('T')[0]}
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
							<button type="button" class="btn btn-light border" onclick={closeModal} disabled={isSubmitting}>取消</button>
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