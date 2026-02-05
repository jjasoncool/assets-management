<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte'; // [NEW] 引入 untrack
	import Navbar from '$lib/components/Navbar.svelte';

	let { data, form } = $props();

	let currentUser = $derived(data.currentUser);
	let borrowedAssets = $derived(data.borrowedAssets);
	let serverError = $derived(data.error);
	let assetIdFromQuery = $derived(data.assetIdFromQuery);

	// [FIX] 使用 untrack 包裹初始值邏輯，消除 "state_referenced_locally" 警告
	// 這明確告訴編譯器：我們只在初始化時讀取這些值一次
	let selectedRecordId = $state(
		untrack(() => form?.selectedRecordId || data.selectedRecordId || '')
	);

	// [NEW] 使用 $effect 確保當 form (提交結果) 或 data (網址參數) 改變時，
	// selectedRecordId 會跟著更新 (例如：從別的頁面導航過來，或提交失敗後)
	$effect(() => {
		const incomingId = form?.selectedRecordId || data.selectedRecordId;
		if (incomingId) {
			selectedRecordId = incomingId;
		}
	});

	let submitting = $state(false);
	let displayError = $derived(form?.message || serverError);
</script>

<svelte:head>
	<title>歸還資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-4">
		<Navbar />

		<div class="card shadow-sm mt-4">
			<div class="card-header bg-white py-3">
				<h5 class="mb-0 card-title fw-bold"><i class="mdi mdi-undo-variant me-2"></i>歸還資產</h5>
			</div>
			<div class="card-body">
				<div class="row justify-content-center">
					<div class="col-lg-8 col-xl-6">
						{#if displayError}
							<div class="alert alert-danger alert-dismissible fade show" role="alert">
								<i class="mdi mdi-alert-circle me-2"></i>{displayError}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>
						{/if}

						{#if !borrowedAssets || borrowedAssets.length === 0}
							<div class="alert alert-warning text-center">
								<p class="mb-2"><i class="mdi mdi-information-outline mdi-24px"></i></p>
								目前沒有可歸還的資產。
								<div class="mt-3">
									<a href="/borrow/list" class="btn btn-outline-secondary">查看借用記錄</a>
								</div>
							</div>
						{:else}
							<form
								method="POST"
								enctype="multipart/form-data"
								use:enhance={() => {
									submitting = true;
									return async ({ update }) => {
										await update(); // 等待 Server 回應並更新頁面
										submitting = false;
									};
								}}
							>
								<div class="mb-3">
									<label for="assetSelect" class="form-label fw-bold">要歸還的資產</label>
									<select
										id="assetSelect"
										name="recordId"
										class="form-select"
										bind:value={selectedRecordId}
										required
										disabled={!!assetIdFromQuery}
									>
										{#if !assetIdFromQuery}
											<option value="" disabled selected>請選擇...</option>
										{/if}
										{#each borrowedAssets as record}
											<option value={record.id}>
												{record.expand?.asset?.name}
												(應還: {new Date(record.expected_return_date).toLocaleDateString()})
											</option>
										{/each}
									</select>

									{#if assetIdFromQuery}
										<input type="hidden" name="recordId" value={selectedRecordId} />
										{#if borrowedAssets[0]}
											<div class="form-text">
												<i class="mdi mdi-account me-1"></i>
												借用人: {borrowedAssets[0].expand?.user?.name || borrowedAssets[0].expand?.user?.email}
											</div>
										{/if}
									{/if}
								</div>

								<div class="mb-4">
									<label for="images" class="form-label fw-bold">歸還時照片 (建議)</label>
									<input
										type="file"
										class="form-control"
										id="images"
										name="returnImages"
										accept="image/*"
										multiple
									/>
									<div class="form-text">建議拍攝資產歸還時的狀況，以保障雙方權益。</div>
								</div>

								<div class="d-flex justify-content-end gap-2">
									<a href="/borrow/list" class="btn btn-secondary">取消</a>
									<button type="submit" class="btn btn-primary" disabled={submitting}>
										{#if submitting}
											<span
												class="spinner-border spinner-border-sm me-1"
												role="status"
												aria-hidden="true"
											></span>
											處理中...
										{:else}
											<i class="mdi mdi-check me-1"></i>確認歸還
										{/if}
									</button>
								</div>
							</form>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>