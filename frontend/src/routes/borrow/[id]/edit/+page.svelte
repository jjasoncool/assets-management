<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Navbar from '$lib/components/Navbar.svelte';
	import BorrowForm from '$lib/components/BorrowForm.svelte';
	import { getFileToken } from '$lib/utils/helpers';
	import { logger } from '$lib/utils/logger';
	import { swal } from '$lib/stores';

	// =================================================================
	// Props & Page Data
	// =================================================================
	let { data, form } = $props();
	let { record, borrowableUsers } = $derived(data);
	let currentUser = $derived($page.data.currentUser);

	// =================================================================
	// States
	// =================================================================
	let submitting = $state(false);
	let deleteForm: HTMLFormElement;

	// =================================================================
	// Image Handling
	// =================================================================
	let fileToken = $state('');
	let imageFiles = $state<File[]>([]);
	let imagePreviews = $state<string[]>([]);
	let existingImages = $state<string[]>([]);
	let imagesToDelete = $state<string[]>([]);
	let modalImageUrl = $state<string | null>(null);
	let imagePreviewModal: any; // bootstrap modal instance

	$effect(() => {
		// 取得 File Token 並初始化圖片
		async function initializeImages() {
			if (!record) return;

			const token = await getFileToken();
			fileToken = token;

			if (record.borrow_images && Array.isArray(record.borrow_images)) {
				const collectionId = record.collectionId;
				const recordId = record.id;
				const tokenQuery = fileToken ? `?token=${fileToken}` : '';

				existingImages = record.borrow_images
					.map((filename: string) => {
						return `/api/files/${collectionId}/${recordId}/${filename}${tokenQuery}`;
					})
					.filter(Boolean);
			}
		}

		initializeImages();

		// 初始化 Modal
		if (browser) {
			import('bootstrap').then(({ Modal }) => {
				const modalElement = document.getElementById('imagePreviewModal');
				if (modalElement) {
					imagePreviewModal = new Modal(modalElement);
				}
			});
		}
	});

	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			const files = Array.from(input.files);
			imageFiles = [...imageFiles, ...files];
			files.forEach((file) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						imagePreviews = [...imagePreviews, e.target.result as string];
					}
				};
				reader.readAsDataURL(file);
			});
			input.value = '';
		}
	}

	function removeNewImage(index: number) {
		imageFiles = imageFiles.filter((_, i) => i !== index);
		imagePreviews = imagePreviews.filter((_, i) => i !== index);
	}

	function removeExistingImage(index: number) {
		const imageUrlToRemove = existingImages[index];
		const filename = imageUrlToRemove.split('/').pop()?.split('?')[0];
		if (filename) {
			imagesToDelete = [...imagesToDelete, filename];
		}
		existingImages = existingImages.filter((_, i) => i !== index);
	}

	function openImageModal(imageUrl: string) {
		modalImageUrl = imageUrl.includes('?thumb=')
			? imageUrl.replace(/\?thumb=.*$/, '')
			: imageUrl;
		imagePreviewModal?.show();
	}

	// =================================================================
	// Handlers
	// =================================================================
	async function handleDelete() {
		if (!$swal) return;

		const result = await $swal.fire({
			title: '您確定要刪除嗎？',
			text: '此筆借用紀錄將被永久刪除，這個操作無法復原！',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#3085d6',
			confirmButtonText: '是的，刪除它！',
			cancelButtonText: '取消'
		});

		if (result.isConfirmed) {
			// 觸發隱藏的刪除表單提交
			deleteForm.requestSubmit();
		}
	}
</script>

<svelte:head>
	<title>編輯借用紀錄 | Asset Management</title>
</svelte:head>

<!-- [新增] 隱藏的刪除表單 -->
<form
	method="POST"
	action="?/delete"
	use:enhance={() => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'redirect') {
				await $swal?.fire('已刪除!', '該筆借用紀錄已被成功刪除。', 'success');
				await invalidateAll(); // 確保列表刷新
				goto('/borrow/list', { invalidateAll: true });
			} else if (result.type === 'failure') {
				const errorMessage = result.data?.error || '發生未知錯誤';
				await $swal?.fire('刪除失敗', errorMessage, 'error');
			}
		};
	}}
	bind:this={deleteForm}
	class="d-none"
></form>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-sm-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4">
			<div class="card-header bg-white bg-opacity-90 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold">
					<i class="mdi mdi-pencil me-2"></i>編輯借用紀錄
				</h5>
				<a href="/borrow/list" class="btn btn-outline-secondary btn-sm bg-white">
					<i class="mdi mdi-arrow-left me-1"></i> 取消返回
				</a>
			</div>

			<div class="card-body p-4">
				<form
					method="POST"
					action="?/update"
					use:enhance={({ formData: formPayload }) => {
						submitting = true;

						// 清理舊的圖片欄位，避免衝突
						formPayload.delete('borrow_images');
						formPayload.delete('borrow_images+');
						formPayload.delete('borrow_images-');

						// 處理待刪除的圖片
						if (imagesToDelete.length > 0) {
							for (const filename of imagesToDelete) {
								formPayload.append('borrow_images-', filename);
							}
						}

						// 處理新增的圖片 (使用附加模式)
						if (imageFiles.length > 0) {
							for (const file of imageFiles) {
								formPayload.append('borrow_images+', file);
							}
						}

						return async ({ result }) => {
							submitting = false;
							if (result.type === 'redirect') {
								await $swal?.fire({
									title: '成功!',
									text: '借用紀錄已成功更新。',
									icon: 'success',
									timer: 1500,
									showConfirmButton: false
								});
								await invalidateAll();
								goto('/borrow/list');
							}
							// 錯誤會由 'form' prop 自動反應，不需手動處理
						};
					}}
					enctype="multipart/form-data"
				>
					{#if form?.data?.error}
						<div class="alert alert-danger">{form.data.error}</div>
					{/if}

					<!-- 顯示資產資訊 (不可編輯) -->
					<div class="mb-4">
						<h6 class="form-label fw-bold">借用資產</h6>
						<div class="card bg-light">
							<div class="card-body">
								<h6 class="card-title fw-bold mb-1">
									{record.expand?.asset?.name || 'N/A'}
								</h6>
								<p class="card-text text-muted small mb-0">
									資產編號: {record.expand?.asset?.asset_id || 'N/A'}
								</p>
							</div>
						</div>
					</div>

					<!-- 共通的借用表單欄位 (借用人、預計歸還日期、備註) -->
					<BorrowForm {currentUser} {borrowableUsers} borrowRecord={record} />

					<!-- 圖片管理 -->
					<div class="mb-3">
						<label for="images" class="form-label fw-bold">借用時照片 (選填)</label>
						<input
							type="file"
							class="form-control"
							id="images"
							name="borrow_images"
							accept="image/*"
							multiple
							onchange={handleImageUpload}
						/>
						<div class="form-text">您可以新增或移除照片。</div>
					</div>

					<div class="row g-2 mt-2">
						<!-- 現有圖片 -->
						{#each existingImages as image, index}
							<div class="col-md-2 col-3">
								<div class="position-relative">
									<button
										type="button"
										class="ratio ratio-1x1 w-100 border-0 p-0"
										onclick={() => openImageModal(image)}
									>
										<img
											src={image}
											class="img-thumbnail w-100 h-100 object-fit-cover"
											alt="現有圖片"
										/>
									</button>
									<button
										type="button"
										class="btn btn-danger btn-sm position-absolute top-0 end-0"
										style="transform: translate(25%, -25%);"
										onclick={() => removeExistingImage(index)}
										title="刪除此圖片"
									>
										&times;
									</button>
								</div>
							</div>
						{/each}

						<!-- 新增預覽 -->
						{#each imagePreviews as preview, index}
							<div class="col-md-2 col-3">
								<div class="position-relative">
									<button
										type="button"
										class="ratio ratio-1x1 w-100 border-0 p-0"
										onclick={() => openImageModal(preview)}
									>
										<img
											src={preview}
											class="img-thumbnail w-100 h-100 object-fit-cover"
											alt="新圖片預覽"
										/>
									</button>
									<button
										type="button"
										class="btn btn-danger btn-sm position-absolute top-0 end-0"
										style="transform: translate(25%, -25%);"
										onclick={() => removeNewImage(index)}
										title="移除此圖片"
									>
										&times;
									</button>
								</div>
							</div>
						{/each}
					</div>

					<!-- 提交按鈕 -->
					<div class="d-flex justify-content-between align-items-center mt-4 pt-4 border-top">
						<!-- 刪除按鈕 -->
						<button
							type="button"
							class="btn btn-outline-danger"
							onclick={handleDelete}
							disabled={submitting}
						>
							<i class="mdi mdi-delete-forever me-1"></i>
							刪除紀錄
						</button>
						<div class="d-flex gap-2">
							<a href="/borrow/list" class="btn btn-light border">取消</a>
							<button type="submit" class="btn btn-primary" disabled={submitting}>
								{#if submitting}
									<span
										class="spinner-border spinner-border-sm me-1"
										role="status"
										aria-hidden="true"
									></span>
									更新中...
								{:else}
									<i class="mdi mdi-check me-1"></i>儲存變更
								{/if}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<!-- 圖片預覽 Modal -->
<div class="modal fade" id="imagePreviewModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog modal-dialog-centered modal-lg">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">圖片預覽</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body text-center">
				{#if modalImageUrl}
					<img src={modalImageUrl} class="img-fluid" alt="圖片預覽" />
				{/if}
			</div>
		</div>
	</div>
</div>
