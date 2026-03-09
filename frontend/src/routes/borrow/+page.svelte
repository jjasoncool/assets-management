<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import BorrowForm from '$lib/components/BorrowForm.svelte';
	import { onDestroy } from 'svelte';
	import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
	import { logger } from '$lib/utils/logger';
	import type { Asset } from '$lib/types';
	import { swal, type SweetAlertResult } from '$lib/stores';

	// =================================================================
	// Props & Page Data
	// =================================================================
	let { data, form } = $props();
	let { borrowableUsers, borrowableAssets, currentUser } = $derived(data);

	// =================================================================
	// States
	// =================================================================
	let submitting = $state(false);
	let error = $derived(form?.error || data.error || null);

	// =================================================================
	// Tom Select & Scanner Integration
	// =================================================================
	let tomSelectInstance = $state<any>(null);
	let tomselectReady = $state(false);
	let isScanning = $state(false);
	let scanner: Html5QrcodeScanner | null = null;

	// Tom Select 動態載入與初始化
	function useTomSelect(node: HTMLSelectElement) {
		let ts: any;
		import('tom-select').then(({ default: TomSelect }) => {
			ts = new TomSelect(node, {
				create: false,
				maxOptions: null,
				placeholder: '請搜尋或選擇要借用的資產 (可多選)...',
				plugins: ['remove_button'],
				searchField: ['text'],
				sortField: [{ field: 'text', direction: 'asc' }]
			});
			tomSelectInstance = ts;
			tomselectReady = true;
		});

		return {
			destroy() {
				// 當頁面銷毀時，同時銷毀 Tom Select 實例以釋放記憶體
				ts?.destroy();
				tomSelectInstance = null;
				tomselectReady = false;
			}
		};
	}

	// QR Code 掃描成功回呼：暫停掃描 -> 加入資產 -> 詢問是否繼續
	async function onScanSuccess(decodedText: string) {
		if (!$swal || !scanner || scanner.getState() !== Html5QrcodeScannerState.SCANNING) {
			return;
		}

		// 1. 立即暫停掃描器
		scanner.pause(true);

		// 2. 解析 QR Code 資料 (格式: "資產編號|其他資料" 或純資產編號)
		const assetIdentifier = decodedText.split('|')[0].trim();
		const asset = borrowableAssets.find((a: Asset) => a.asset_id === assetIdentifier);
		let swalConfig;

		// 3. 根據掃描結果準備提示訊息
		if (asset && tomSelectInstance) {
			const selectedItems = tomSelectInstance.items || [];

			if (!selectedItems.includes(asset.id)) {
				// 3a. 成功加入新資產
				tomSelectInstance.addItem(asset.id);
				swalConfig = {
					icon: 'success' as const,
					title: '已成功加入清單',
					text: `資產 ${asset.name} (${asset.asset_id}) 已加入借用清單。`
				};
			} else {
				// 3b. 資產已存在
				swalConfig = {
					icon: 'info' as const,
					title: '資產已在清單中',
					text: `資產 ${asset.name} (${asset.asset_id}) 無須重複加入。`
				};
			}
			tomSelectInstance.focus();
		} else {
			// 3c. 找不到資產或 TomSelect 未初始化
			swalConfig = {
				icon: 'warning' as const,
				title: '無法加入',
				text: `資產 ID "${assetIdentifier}" 不存在於可借用清單中，或資產不存在。`
			};
		}

		// 4. 顯示互動式對話框，讓使用者選擇繼續或停止
		await $swal
			.fire({
				...swalConfig,
				confirmButtonText: '繼續掃描',
				showCancelButton: true,
				cancelButtonText: '停止掃描'
			})
			.then((result: SweetAlertResult) => {
				if (result.isConfirmed) {
					// 5a. 使用者選擇繼續，恢復掃描
					if (scanner?.getState() === Html5QrcodeScannerState.PAUSED) {
						scanner.resume();
					}
				} else if (result.dismiss === $swal.DismissReason.cancel) {
					// 5b. 使用者選擇停止，清理掃描器
					stopScan();
				}
			});
	}

	function onScanFailure(error: any) {
		// 掃描失敗回呼會頻繁觸發，我們只在除錯時啟用日誌
		// logger.warn(`掃描失敗:`, error);
	}

	// 啟動 QR Code 掃描器
	function startScan() {
		isScanning = true;
		// 使用 setTimeout 確保目標 <div> 已被渲染到 DOM 中
		setTimeout(() => {
			const readerElement = document.getElementById('qr-reader');
			if (readerElement) {
				scanner = new Html5QrcodeScanner(
					'qr-reader',
					{ fps: 10, qrbox: { width: 250, height: 250 }, facingMode: 'environment' } as any,
					false
				);
				scanner.render(onScanSuccess, onScanFailure);
			}
		}, 100);
	}

	// 停止 QR Code 掃描器
	function stopScan() {
		if (scanner?.getState() === Html5QrcodeScannerState.SCANNING) {
			scanner.clear().catch((error) => logger.error('停止掃描失敗:', error));
		}
		isScanning = false;
	}

	// 組件銷毀時自動清理掃描器
	onDestroy(() => {
		if (scanner?.getState() === Html5QrcodeScannerState.SCANNING) {
			scanner.clear().catch((err) => logger.warn('銷毀組件時自動停止掃描失敗(可忽略):', err));
		}
	});

	// =================================================================
	// Handlers
	// =================================================================
	function handleSuccess() {
		goto('/borrow/list');
	}
</script>

<svelte:head>
	<title>新增借用紀錄 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-sm-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4">
			<div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold">
					<i class="mdi mdi-plus-box-outline me-2"></i>新增借用紀錄
				</h5>
				<a href="/borrow/list" class="btn btn-outline-secondary btn-sm bg-white">
					<i class="mdi mdi-arrow-left me-1"></i> 取消返回
				</a>
			</div>

			<div class="card-body p-4">
				{#if data.error && !form?.error}
					<div class="alert alert-danger">{data.error}</div>
				{/if}

				<form
					method="POST"
					action="?/create"
					enctype="multipart/form-data"
					use:enhance={() => {
						submitting = true;
						return async ({ result }) => {
							if (result.type === 'success') {
								handleSuccess();
							}
							submitting = false;
						};
					}}
				>
					{#if form?.error}
						<div class="alert alert-danger">{form.error}</div>
					{/if}

					<!-- QR Code 掃描區域 -->
					<div class="text-center mb-4 border-bottom pb-4">
						{#if isScanning}
							<div
								id="qr-reader"
								style="max-width: 500px; margin: auto; border-radius: 8px; overflow: hidden;"
							></div>
							<button type="button" class="btn btn-outline-danger mt-3" onclick={stopScan}>
								<i class="mdi mdi-close me-1"></i>停止掃描
							</button>
						{:else}
							<button
								type="button"
								class="btn btn-info"
								onclick={startScan}
								disabled={!tomselectReady}
							>
								{#if tomselectReady}
									<i class="mdi mdi-qrcode-scan me-1"></i>掃描資產 QR Code
								{:else}
									<span class="spinner-border spinner-border-sm me-2" role="status"></span>
									載入中...
								{/if}
							</button>
						{/if}
					</div>

					<div class="mb-3">
						<label for="asset_ids" class="form-label fw-bold">選擇資產 <span class="text-danger">*</span></label>
						<select id="asset_ids" name="asset_ids" multiple use:useTomSelect>
							{#each borrowableAssets || [] as asset (asset.id)}
								<option value={asset.id}>{asset.name} ({asset.asset_id})</option>
							{/each}
							{#if (borrowableAssets || []).length === 0}
								<option value="" disabled>目前沒有可借用的資產</option>
							{/if}
						</select>
						<div class="form-text">可多選或使用掃碼批次加入。僅列出 "Active" 且 "可借用" 的資產。</div>
					</div>

					<hr class="my-4" />

					<!-- 共通的借用表單欄位 (借用人、預計歸還日期、備註) -->
					<BorrowForm {currentUser} {borrowableUsers} />

					<!-- 提交按鈕 -->
					<div class="d-flex justify-content-end gap-2 mt-4">
						<a href="/borrow/list" class="btn btn-light border">取消</a>
						<button type="submit" class="btn btn-primary" disabled={submitting}>
							{#if submitting}
								<span
									class="spinner-border spinner-border-sm me-1"
									role="status"
									aria-hidden="true"
								></span>
								處理中...
							{:else}
								<i class="mdi mdi-check me-1"></i>確認借用
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
