<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import { getCurrentZonedDateString } from '$lib/utils/datetime';

	// Svelte 5 Runes: 接收 PageData 和 ActionData (form)
	let { data, form } = $props();

	// [修正] 使用 $state() 來宣告響應式變數
	let isSubmitting = $state(false);

	// [新增] 過濾資產列表：僅允許狀態為 'active' 的資產進行維護
	// 這樣可以排除 borrowed, lost, retired, maintenance 等狀態
	let availableAssets = $derived(
		(data.assets || []).filter((asset: any) => asset.status === 'active')
	);

	// 定義維護類型選項
	const maintenanceTypes = [
		{ value: 'preventive', label: '預防性維護 (Preventive)' },
		{ value: 'corrective', label: '修復性維護 (Corrective)' },
		{ value: 'inspection', label: '例行檢查 (Inspection)' }
	];
</script>

<svelte:head>
	<title>新增維護單 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4">
			<div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold">
					<i class="mdi mdi-plus-box-outline me-2"></i>填寫維護單
				</h5>
				<a href="/maintenance" class="btn btn-outline-secondary btn-sm bg-white">
					<i class="mdi mdi-arrow-left me-1"></i> 取消返回
				</a>
			</div>

			<div class="card-body p-4">
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
					enctype="multipart/form-data"
				>
					{#if form?.error}
						<div class="alert alert-danger alert-dismissible fade show" role="alert">
							<i class="mdi mdi-alert-circle me-2"></i>
							{form.error}
							<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
						</div>
					{/if}

					<div class="row g-4">
						<div class="col-md-6">
							<div class="mb-3">
								<label for="asset" class="form-label fw-bold">選擇資產 <span class="text-danger">*</span></label>
								<select class="form-select" id="asset" name="asset" required>
									<option value="" disabled selected>請選擇要維護的資產...</option>

									{#each availableAssets as asset}
										<option value={asset.id}>
											{asset.name} ({asset.asset_id})
										</option>
									{/each}

									{#if availableAssets.length === 0}
										<option value="" disabled>沒有可用的 Active 資產</option>
									{/if}
								</select>
								<div class="form-text">僅顯示狀態為 Active 的資產。</div>
							</div>

							<div class="mb-3">
								<label for="maintenance_type" class="form-label fw-bold">維護類型</label>
								<select class="form-select" id="maintenance_type" name="maintenance_type">
									{#each maintenanceTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<div class="row">
								<div class="col-md-6 mb-3">
									<label for="maintenance_date" class="form-label fw-bold">維護日期 <span class="text-danger">*</span></label>
									<input
										type="date"
										class="form-control"
										id="maintenance_date"
										name="maintenance_date"
										required
										value={getCurrentZonedDateString()}
									/>
								</div>
								<div class="col-md-6 mb-3">
									<label for="cost" class="form-label fw-bold">預估維護費用</label>
									<div class="input-group">
										<span class="input-group-text">$</span>
										<input
											type="number"
											step="0.01"
											class="form-control"
											id="cost"
											name="cost"
											required
											value="0"
										/>
									</div>
								</div>
							</div>
						</div>

						<div class="col-md-6">
							<div class="mb-3">
								<label for="description" class="form-label fw-bold">維護內容描述</label>
								<textarea
									class="form-control"
									id="description"
									name="description"
									rows="5"
									placeholder="請詳細描述維護的過程、更換的零件或檢查的項目..."
								></textarea>
							</div>

							<div class="mb-3">
								<label for="maintenance_images" class="form-label fw-bold">相關圖片</label>
								<input
									type="file"
									class="form-control"
									id="maintenance_images"
									name="maintenance_images"
									multiple
									accept="image/*"
								/>
								<div class="form-text">支援上傳 JPG, PNG 格式，可多選。</div>
							</div>
						</div>
					</div>

					<hr class="my-4" />

					<div class="d-flex justify-content-end gap-2">
						<a href="/maintenance" class="btn btn-light border">取消</a>
						<button type="submit" class="btn btn-primary px-4" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
								儲存中...
							{:else}
								<i class="mdi mdi-content-save-outline me-1"></i> 新增記錄
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
