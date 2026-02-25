<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { Html5QrcodeScanner } from 'html5-qrcode';
	import TomSelect from 'tom-select';
	import type { BorrowRecord } from '$lib/types';
	import { logger } from '$lib/utils/logger';
	import { formatDate } from '$lib/utils/datetime';

	let { data, form } = $props();

	let currentUser = $derived(data.currentUser);
	let borrowedAssets = $derived(data.borrowedAssets);
	let serverError = $derived(data.error);
	let assetIdFromQuery = $derived(data.assetIdFromQuery);

	let selectedRecordId = $state(
		untrack(() => form?.selectedRecordId || data.selectedRecordId || '')
	);

	$effect(() => {
		const incomingId = form?.selectedRecordId || data.selectedRecordId;
		if (incomingId) {
			selectedRecordId = incomingId;
		}
	});

	let submitting = $state(false);
	let displayError = $derived(form?.message || serverError);

	// --- Tom Select ---
	let tomselect: TomSelect | null = null;
	let tomselectEl: HTMLInputElement | undefined = $state();

	onMount(() => {
		if (tomselectEl) {
			tomselect = new TomSelect(tomselectEl, {
				maxItems: 1,
				options: borrowedAssets.map((record: BorrowRecord) => ({
					value: record.id,
					text: `${record.expand?.asset?.asset_id || 'N/A'} - ${record.expand?.asset?.name} (應還: ${formatDate(
						record.expected_return_date
					)})`
				})),
				create: false,
				allowEmptyOption: true,
				placeholder: assetIdFromQuery ? undefined : '請選擇或搜尋要歸還的資產...',
				valueField: 'value',
				labelField: 'text',
				searchField: ['text'],
				onChange: (value: string) => {
					selectedRecordId = value;
				}
			});

			if (selectedRecordId) {
				tomselect.setValue(selectedRecordId, true); // silent=true, 不觸發 onchange
			}

			if (assetIdFromQuery) {
				tomselect.disable();
			}
		}
	});

	// --- QR Scanner ---
	let isScanning = $state(false);
	let scanner: Html5QrcodeScanner | null = null;

	function onScanSuccess(decodedText: string) {
		console.log(`Code matched = ${decodedText}`);
		if (scanner) {
			scanner.clear().then(() => {
				isScanning = false;
				if (tomselect) {
					// 將掃描到的文字（可能帶有 |）作為搜尋關鍵字
					const searchText = decodedText.replace(/\|/g, ' ');
					tomselect.setTextboxValue(searchText);
					tomselect.open(); // 打開下拉選單顯示搜尋結果
					tomselect.focus();
				}
			});
		}
	}

	function onScanFailure(error: any) {
		// 此回呼會頻繁觸發，我們不在此顯示錯誤，只在需要除錯時打開日誌
		logger.warn(`Code scan error:`, error);
	}

	function startScan() {
		isScanning = true;
		// 使用 setTimeout 確保目標 <div> 已被渲染到 DOM 中
		setTimeout(() => {
			const readerElement = document.getElementById('qr-reader');
			if (readerElement) {
				scanner = new Html5QrcodeScanner(
					'qr-reader',
					{
						fps: 10,
						qrbox: { width: 250, height: 250 },
						// @ts-ignore - facingMode is a valid experimental configuration
						facingMode: 'environment'
					},
					/* verbose= */ false
				);
				scanner.render(onScanSuccess, onScanFailure);
			}
		}, 100);
	}

	function stopScan() {
		if (scanner) {
			scanner
				.clear()
				.then(() => {
					isScanning = false;
				})
				.catch((error) => {
					console.error('Failed to clear scanner.', error);
					isScanning = false; // 確保UI狀態被更新
				});
		}
	}

	// 元件銷毀時，確保清理掃描器以釋放相機資源
	onDestroy(() => {
		if (scanner) {
			scanner.clear().catch((err) => {
				// It might fail if camera is already released, which is fine on destroy
				console.log('Ignoring scanner clear error on destroy:', err);
			});
		}
		tomselect?.destroy();
	});
</script>

<svelte:head>
	<title>歸還資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-sm-4">
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
							<div class="text-center mb-4 border-bottom pb-4">
								{#if isScanning}
									<div id="qr-reader" style="max-width: 500px; margin: auto; border-radius: 8px; overflow: hidden;"></div>
									<button type="button" class="btn btn-outline-danger mt-3" onclick={stopScan}>
										<i class="mdi mdi-close me-1"></i>取消掃描
									</button>
								{:else}
									<button type="button" class="btn btn-info" onclick={startScan}>
										<i class="mdi mdi-qrcode-scan me-1"></i>掃描資產 QR Code
									</button>
								{/if}
							</div>

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
									<label for="tom-select-asset" class="form-label fw-bold">要歸還的資產</label>

									<input
										type="text"
										id="tom-select-asset"
										name="recordId"
										bind:this={tomselectEl}
										required
										disabled={!!assetIdFromQuery}
									/>

									{#if assetIdFromQuery}
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
