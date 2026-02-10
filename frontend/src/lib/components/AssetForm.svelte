<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { Swal } from '$lib/stores';
	import BorrowForm from './BorrowForm.svelte';
	import { logger } from '$lib/utils/logger';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';

	// Svelte 5 Props: 定義接收的資料型別，users 和 categories 改由外部傳入
	let {
		mode,
		assetData = undefined,
		form = undefined,
		users = [],        // 由 Server Load 傳入
		categories = [],   // 由 Server Load 傳入
		currentUser = undefined, // 接收 currentUser
		fileToken = '',    // [新增] 接收 fileToken
		onCancel
	} = $props<{
		mode: 'create' | 'edit',
		assetData?: any,
		form?: any,
		users?: any[],
		categories?: any[],
		currentUser?: any,
		fileToken?: string, // [新增]
		onCancel?: () => void
	}>();

	// Form state
	let loading = $state(false);
	let error = $state<string | null>(null);

	// 監聽 Server 回傳的 Action Result (主要處理錯誤顯示)
	$effect(() => {
		// 如果後端回傳 fail(400, { error: ... })，這裡會收到 { error: '...' }
		if (form?.error) {
			error = form.error;
			loading = false;
		}
	});

	// Modal state
	let borrowModalElement = $state<HTMLElement>();
	let borrowModalInstance: any | null = $state(null);
	let modalImageUrl = $state<string | null>(null);

	// Form data
	let formData = $state({
		name: '',
		brand: '',
		model: '',
		serial_number: '',
		purchase_date: '',
		purchase_price: undefined as number | undefined,
		warranty_years: undefined as number | undefined,
		location: '',
		department: '',
		category: '',
		assigned_to: '',
		confidentiality_score: undefined as number | undefined,
		integrity_score: undefined as number | undefined,
		availability_score: undefined as number | undefined,
		status: 'active',
		notes: ''
	});

	// statusOptions 保持不變
	const statusOptions = [
		{ value: 'active', label: '正常' },
		{ value: 'inactive', label: '停用' },
		{ value: 'maintenance', label: '維護中' },
		{ value: 'retired', label: '已報廢' },
		{ value: 'lost', label: '遺失' },
		{ value: 'stolen', label: '失竊' },
		{ value: 'borrowed', label: '借出中' }
	];

	// Image uploads
	let imageFiles = $state<File[]>([]);
	let imagePreviews = $state<string[]>([]);
	let existingImages = $state<string[]>([]);
	let imagesToDelete = $state<string[]>([]);

	// Initialization
	$effect(() => {
		if (browser) {
			import('bootstrap').then(({ Modal }) => {
				if (borrowModalElement) {
					borrowModalInstance = new Modal(borrowModalElement);
				}
			});
		}

		// 初始化邏輯：移除客戶端撈取，僅處理編輯模式的資料回填
		async function init() {
			try {
				if (mode === 'edit' && assetData) {
					await initializeEditForm();
				}
			} catch (err) {
				logger.error('Failed to initialize form:', err);
				error = err instanceof Error ? err.message : '初始化失敗';
			}
		}
		init();

		return () => {
			borrowModalInstance?.dispose();
			if (browser) {
				const backdrop = document.querySelector('.modal-backdrop');
				if (backdrop) backdrop.remove();
				document.body.classList.remove('modal-open');
				document.body.style.overflow = '';
				document.body.style.paddingRight = '';
			}
		}
	});

	// Modal handlers
	function showBorrowModal() {
		borrowModalInstance?.show();
	}

	function handleBorrowSuccess() {
		borrowModalInstance?.hide();
		$Swal.fire({
			title: '成功',
			text: '資產借用申請成功！',
			icon: 'success',
			timer: 2000,
			showConfirmButton: false
		});
		formData.status = 'borrowed';
		if(assetData) {
			assetData.status = 'borrowed';
		}
	}

	// Initialize form for editing
	async function initializeEditForm() {
		let formattedPurchaseDate = '';
		if (assetData.purchase_date) {
			try {
				const date = new Date(assetData.purchase_date);
				if (!isNaN(date.getTime())) {
					formattedPurchaseDate = date.toISOString().split('T')[0];
				}
			} catch (e) {
				logger.error('Date formatting error:', e);
			}
		}

		formData.name = assetData.name || '';
		formData.brand = assetData.brand || '';
		formData.model = assetData.model || '';
		formData.serial_number = assetData.serial_number || '';
		formData.purchase_date = formattedPurchaseDate;
		formData.purchase_price = assetData.purchase_price !== undefined ? assetData.purchase_price : undefined;
		formData.warranty_years = assetData.warranty_years !== undefined ? assetData.warranty_years : undefined;
		formData.location = assetData.location || '';
		formData.department = assetData.department || '';
		// 修正：處理關聯欄位可能是物件或 ID 字串的情況
		formData.category = typeof assetData.category === 'object' ? assetData.category?.id : assetData.category || '';
		formData.assigned_to = typeof assetData.assigned_to === 'object' ? assetData.assigned_to?.id : assetData.assigned_to || '';

		formData.confidentiality_score = assetData.confidentiality_score !== undefined ? assetData.confidentiality_score : undefined;
		formData.integrity_score = assetData.integrity_score !== undefined ? assetData.integrity_score : undefined;
		formData.availability_score = assetData.availability_score !== undefined ? assetData.availability_score : undefined;
		formData.status = assetData.status || 'active';
		formData.notes = assetData.notes || '';

		if (assetData.images && Array.isArray(assetData.images)) {
			// [修改] 使用 Token 組合 URL
			const collectionId = assetData.collectionId || 'assets';
			const recordId = assetData.id;
			const tokenQuery = fileToken ? `?token=${fileToken}` : '';

			existingImages = assetData.images.map((filename: string) => {
				return `/api/files/${collectionId}/${recordId}/${filename}${tokenQuery}`;
			}).filter(Boolean);
		}
	}

	// Handle image uploads
	function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			const files = Array.from(input.files);
			const validFiles = files.filter(file => {
				const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
				return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024; // 5MB
			});
			if (validFiles.length !== files.length) {
				alert('部分檔案不符合要求：僅支援 JPG、PNG、GIF、WebP 格式，且單檔不得超過 5MB');
			}

			imageFiles = [...imageFiles, ...validFiles];
			validFiles.forEach(file => {
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

	// Remove a newly uploaded image
	function removeNewImage(index: number) {
		imageFiles = imageFiles.filter((_, i) => i !== index);
		imagePreviews = imagePreviews.filter((_, i) => i !== index);
	}

	// Remove an existing image
	function removeExistingImage(index: number) {
		const imageUrlToRemove = existingImages[index];
		// Extract filename from URL
		const filename = imageUrlToRemove.split('/').pop()?.split('?')[0];
		if (filename) {
			imagesToDelete = [...imagesToDelete, filename];
		}
		existingImages = existingImages.filter((_, i) => i !== index);
	}

	function openImageModal(imageUrl: string) {
		// [修改] 移除 ?thumb= 參數以便在 Modal 顯示原圖
		modalImageUrl = imageUrl.includes('?thumb=') ? imageUrl.replace('?thumb=200x200', '') : imageUrl;
	}

	// --- Input handlers and formatters ---
    const totalRiskScore = $derived(Math.round((formData.confidentiality_score || 0) + (formData.integrity_score || 0) + (formData.availability_score || 0)));
    const progressWidth = $derived(Math.round((totalRiskScore / 21) * 100));
    const progressBarClass = $derived(totalRiskScore <= 7 ? 'bg-primary' : totalRiskScore <= 14 ? 'bg-warning' : 'bg-danger');

    function handleScoreInput(event: Event, field: 'confidentiality_score' | 'integrity_score' | 'availability_score') {
        const input = event.target as HTMLInputElement;
        let value = handleIntegerInput(event);
        if (value !== undefined) {
            const clampedValue = Math.max(0, Math.min(value, 7));
            if (clampedValue !== value) {
                value = clampedValue;
                input.value = value.toString();
            }
        }
        formData[field] = value;
    }

    function formatPrice(value: number | undefined | null): string {
        if (value === undefined || value === null) return '';
        return value.toLocaleString('en-US');
    }

    function handleIntegerInput(e: Event): number | undefined {
        const input = e.currentTarget as HTMLInputElement;
        const value = input.value;
        const sanitized = value.replace(/[^\d]/g, '');
        if (value !== sanitized) {
            const start = input.selectionStart || 0;
            const diff = value.length - sanitized.length;
            input.value = sanitized;
            input.selectionStart = Math.max(0, start - diff);
            input.selectionEnd = Math.max(0, start - diff);
        }
        if (sanitized === '') return undefined;
        return parseInt(sanitized, 10);
    }

    function handlePriceInput(e: Event) {
        formData.purchase_price = handleIntegerInput(e);
    }

    function formatPriceOnBlur(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        input.value = formatPrice(formData.purchase_price);
    }

    function validateForm(): string[] {
        const errors: string[] = [];
        if (!formData.name.trim()) errors.push('請輸入資產名稱');
        if (!formData.category) errors.push('請選擇資產類別。如果沒有適當的類別，請聯繫管理員新增所需類別。');
        if (imageFiles.length + existingImages.length > 10) errors.push('最多只能上傳 10 張圖片');
        return errors;
    }

</script>

<form
	method="POST"
	action={mode === 'create' ? '?/create' : '?/update'}
	use:enhance={({ cancel, formData: formPayload }) => {
		error = null;
		const validationErrors = validateForm();
		if (validationErrors.length > 0) {
			error = validationErrors.join('；');
			cancel();
			return;
		}

		loading = true;

		// [修改] 處理圖片上傳 (原子化操作: 同時處理刪除與新增)

		// 1. 強制移除 'images' 欄位，避免覆蓋(Replace)行為
		formPayload.delete('images');
		formPayload.delete('images+'); // 預防性清除
		// 不需要刪除 'images-'，因為我們要 append 它

		// 2. 處理待刪除的圖片 (僅在編輯模式)
		if (mode === 'edit' && imagesToDelete.length > 0) {
			for (const filename of imagesToDelete) {
				// 使用 'images-' 告訴 PocketBase 移除這些特定檔案
				formPayload.append('images-', filename);
			}
		}

		// 3. 處理新增的圖片
		if (imageFiles.length > 0) {
			// 編輯模式用 'images+' (附加)，新增模式用 'images' (設定)
			const imageField = mode === 'edit' ? 'images+' : 'images';
			for (const file of imageFiles) {
				formPayload.append(imageField, file);
			}
		}

		// 確保數值欄位正確傳遞 (避免 undefined)
		if (formData.purchase_price !== undefined) formPayload.set('purchase_price', formData.purchase_price.toString());
		if (formData.confidentiality_score !== undefined) formPayload.set('confidentiality_score', formData.confidentiality_score.toString());
        if (formData.integrity_score !== undefined) formPayload.set('integrity_score', formData.integrity_score.toString());
        if (formData.availability_score !== undefined) formPayload.set('availability_score', formData.availability_score.toString());

		return async ({ result, update }) => {
			loading = false;
			// 攔截 redirect (新增成功) 或 success (編輯成功)
			// 先顯示 SweetAlert，再執行 update() 讓 SvelteKit 進行跳轉或更新頁面
			if (result.type === 'redirect' || result.type === 'success') {
				await $Swal.fire({
					title: '成功！',
					text: mode === 'create' ? '資產新增成功！' : '資產更新成功！',
					icon: 'success',
					timer: 1500,
					showConfirmButton: false
				});
				await update();
			} else {
				// 失敗情況，執行 update 以顯示錯誤 (透過上方的 $effect)
				await update();
			}
		};
	}}
	enctype="multipart/form-data"
>
    {#if mode === 'edit' && assetData?.id}
		<input type="hidden" name="id" value={assetData.id} />
	{/if}

	<input type="hidden" name="total_risk_score" value={totalRiskScore} />

	<div class="card-body p-4">
		{#if error}
			<div class="alert alert-danger alert-dismissible fade show" role="alert">
				<i class="mdi mdi-alert-circle me-2"></i>
				{error}
				<button type="button" class="btn-close" onclick={() => error = null} aria-label="Close"></button>
			</div>
		{/if}

		<div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="name" class="form-label small fw-bold text-secondary">資產名稱 *</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    class="form-control shadow-none"
                    bind:value={formData.name}
                    placeholder="請輸入資產名稱"
                />
            </div>
            <div class="col-md-6">
                <label for="category" class="form-label small fw-bold text-secondary">資產類別 *</label>
                <select
                    id="category"
                    name="category"
                    class="form-select shadow-none"
                    bind:value={formData.category}
                >
                    <option value="">請選擇資產類別</option>
                    {#each categories as cat}
                        <option value={cat.id}>{cat.name} ({cat.prefix})</option>
                    {/each}
                </select>
            </div>
            <div class="col-md-4">
                <label for="brand" class="form-label small fw-bold text-secondary">品牌</label>
                <input
                    type="text"
                    id="brand"
                    name="brand"
                    class="form-control shadow-none"
                    bind:value={formData.brand}
                    placeholder="例如：Dell、HP、Apple"
                />
            </div>
            <div class="col-md-4">
                <label for="model" class="form-label small fw-bold text-secondary">型號</label>
                <input
                    type="text"
                    id="model"
                    name="model"
                    class="form-control shadow-none"
                    bind:value={formData.model}
                    placeholder="例如：Latitude 7420"
                />
            </div>
            <div class="col-md-4">
                <label for="serial_number" class="form-label small fw-bold text-secondary">序號</label>
                <input
                    type="text"
                    id="serial_number"
                    name="serial_number"
                    class="form-control shadow-none"
                    bind:value={formData.serial_number}
                    placeholder="S/N 號碼"
                />
            </div>
        </div>
		<div class="row g-3 mb-4">
            <div class="col-md-4">
                <label for="purchase_date" class="form-label small fw-bold text-secondary">購買日期</label>
                <input
                    type="date"
                    id="purchase_date"
                    name="purchase_date"
                    class="form-control shadow-none"
                    bind:value={formData.purchase_date}
                />
            </div>
            <div class="col-md-4">
                <label for="purchase_price" class="form-label small fw-bold text-secondary">購買價格</label>
                <div class="input-group">
                    <span class="input-group-text">NT$</span>
                    <input
                        type="text"
                        inputmode="numeric"
                        id="purchase_price_display"
                        class="form-control shadow-none"
                        value={formatPrice(formData.purchase_price)}
                        oninput={handlePriceInput}
                        onblur={formatPriceOnBlur}
                        placeholder="0"
                    />
					<input type="hidden" name="purchase_price" value={formData.purchase_price ?? ''} />
                </div>
            </div>
            <div class="col-md-4">
                <label for="warranty_years" class="form-label small fw-bold text-secondary">保固年數</label>
                <input
                    type="number"
                    id="warranty_years"
                    name="warranty_years"
                    class="form-control shadow-none"
                    value={formData.warranty_years ?? ''}
                    oninput={(e) => {
                        formData.warranty_years = handleIntegerInput(e);
                    }}
                    placeholder="0"
                    min="0"
                    step="1"
                />
            </div>
        </div>
		<div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="location" class="form-label small fw-bold text-secondary">位置</label>
                <input
                    type="text"
                    id="location"
                    name="location"
                    class="form-control shadow-none"
                    bind:value={formData.location}
                    placeholder="例如：辦公室、倉庫"
                />
            </div>
            <div class="col-md-6">
                <label for="department" class="form-label small fw-bold text-secondary">部門</label>
                <input
                    type="text"
                    id="department"
                    name="department"
                    class="form-control shadow-none"
                    bind:value={formData.department}
                    placeholder="例如：資訊部、財務部"
                />
            </div>
        </div>
		<div class="row g-3 mb-4">
            <div class="col-md-6">
                <label for="assigned_to" class="form-label small fw-bold text-secondary">負責人</label>
                <select
                    id="assigned_to"
                    name="assigned_to"
                    class="form-select shadow-none"
                    bind:value={formData.assigned_to}
                >
                    <option value="">請選擇負責人</option>
                    {#each users as user}
                        <option value={user.id}>{user.name || user.email}</option>
                    {/each}
                </select>
            </div>
            <div class="col-md-6">
                <label for="status" class="form-label small fw-bold text-secondary">狀態</label>
                <select
                    id="status"
                    name="status"
                    class="form-select shadow-none"
                    bind:value={formData.status}
                >
                    {#each statusOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>
		<div class="row g-3 mb-4">
            <div class="col-md-12 mb-2">
                <div class="alert alert-info small p-2 mb-0">
                    <i class="mdi mdi-information-outline me-1"></i>
                    說明：0 不適用 | 1 普通 | 3 內部使用 | 5-7 機密
                </div>
            </div>
            <div class="col-md-4">
                <label for="confidentiality_score" class="form-label small fw-bold text-secondary">機密性分數 (0-7)</label>
                <input
                    type="number"
                    id="confidentiality_score"
                    name="confidentiality_score"
                    class="form-control shadow-none"
                    value={formData.confidentiality_score ?? ''}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    oninput={(e) => handleScoreInput(e, 'confidentiality_score')}
                />
            </div>
            <div class="col-md-4">
                <label for="integrity_score" class="form-label small fw-bold text-secondary">完整性分數 (0-7)</label>
                <input
                    type="number"
                    id="integrity_score"
                    name="integrity_score"
                    class="form-control shadow-none"
                    value={formData.integrity_score ?? ''}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    oninput={(e) => handleScoreInput(e, 'integrity_score')}
                />
            </div>
            <div class="col-md-4">
                <label for="availability_score" class="form-label small fw-bold text-secondary">可用性分數 (0-7)</label>
                <input
                    type="number"
                    id="availability_score"
                    name="availability_score"
                    class="form-control shadow-none"
                    value={formData.availability_score ?? ''}
                    placeholder="0-7"
                    min="0"
                    max="7"
                    step="1"
                    oninput={(e) => handleScoreInput(e, 'availability_score')}
                />
            </div>
            <div class="col-md-12">
                    <div class="alert alert-light small">
                        風險總分：{totalRiskScore} / 21
                        <div class="progress mt-2" style="height: 8px">
                            <div
                                class="progress-bar {progressBarClass}"
                                style="width: {progressWidth}%"
                                role="progressbar"
                                aria-valuenow={progressWidth}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            ></div>
                        </div>
                    </div>
            </div>
        </div>
		<div class="row mb-4">
            <div class="col-12">
                <label for="assetImages" class="form-label small fw-bold text-secondary">資產圖片</label>
                <div class="input-group">
                    <input
                        type="file"
                        id="assetImages"
                        name="images"
                        class="form-control shadow-none"
                        accept="image/*"
                        multiple
                        onchange={handleImageUpload}
                    />
                </div>
                <div class="form-text">
                    支援 JPG、PNG、GIF、WebP 格式，單檔最大 5MB，最多 10 張
                </div>
            </div>
            <div class="col-12">
                <div class="row g-2 mt-2">
                    {#each existingImages as image, index}
                        <div class="col-md-2 col-3">
                            <div class="position-relative">
                                <div class="ratio ratio-1x1 w-100">
                                <button
                                    type="button"
                                    class="img-button"
                                    style="border: none; background: none; padding: 0; cursor: pointer;"
                                    aria-label="查看現有圖片"
                                    data-bs-toggle="modal"
                                    data-bs-target="#imagePreviewModal"
                                    onclick={() => openImageModal(image)}
                                >
                                    <img
                                        src={image}
                                        class="img-thumbnail w-100 h-100 object-fit-cover"
                                        alt="現有圖片"
                                    />
                                </button>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                                    style="transform: translate(25%, -25%);"
                                    onclick={(e) => { e.stopPropagation(); removeExistingImage(index); }}
                                    aria-label="刪除現有圖片"
                                    title="刪除現有圖片"
                                >
                                    <span class="visually-hidden">刪除現有圖片</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    {/each}

                    {#each imagePreviews as preview, index}
                        <div class="col-md-2 col-3">
                            <div class="position-relative">
                                <div class="ratio ratio-1x1 w-100">
                                <button
                                    type="button"
                                    class="img-button"
                                    style="border: none; background: none; padding: 0; cursor: pointer;"
                                    aria-label="查看新上傳的圖片"
                                    data-bs-toggle="modal"
                                    data-bs-target="#imagePreviewModal"
                                    onclick={() => openImageModal(preview)}
                                >
                                    <img
                                        src={preview}
                                        class="img-thumbnail w-100 h-100 object-fit-cover"
                                        alt="預覽"
                                    />
                                </button>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                                    style="transform: translate(25%, -25%);"
                                    onclick={(e) => { e.stopPropagation(); removeNewImage(index); }}
                                    aria-label="刪除新上傳的圖片"
                                    title="刪除新上傳的圖片"
                                >
                                    <span class="visually-hidden">刪除新上傳的圖片</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
		<div class="row mb-4">
            <div class="col-12">
                <label for="notes" class="form-label small fw-bold text-secondary">備註</label>
                <textarea
                    id="notes"
                    name="notes"
                    class="form-control shadow-none"
                    bind:value={formData.notes}
                    rows="3"
                    placeholder="其他補充說明..."
                ></textarea>
            </div>
        </div>

		<div class="row">
			<div class="col-12">
				<div class="d-flex justify-content-between">
					<div>
						<button type="button" class="btn btn-outline-secondary" onclick={onCancel}>
							<i class="mdi mdi-arrow-left me-2"></i>
							返回列表
						</button>
						{#if mode === 'edit' && formData.status === 'active'}
							<button type="button" class="btn btn-info ms-2" onclick={showBorrowModal}>
								<i class="mdi mdi-hand-heart me-2"></i>
								借用此資產
							</button>
						{/if}
					</div>

					<button type="submit" class="btn btn-primary" disabled={loading}>
						{#if loading}
							<span class="spinner-border spinner-border-sm me-2" role="status"></span>
							{mode === 'create' ? '新增中...' : '更新中...'}
						{:else}
							<i class="mdi {mode === 'create' ? 'mdi-plus' : 'mdi-content-save'} me-2"></i>
							{mode === 'create' ? '新增資產' : '更新資產'}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</form>

<div class="modal fade" id="imagePreviewModal" tabindex="-1" aria-labelledby="imagePreviewModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="imagePreviewModalLabel">圖片預覽</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: 85vh;">
                <div class="text-center">
                    {#if modalImageUrl}
                        <img src={modalImageUrl} class="img-fluid" style="max-width: 100%; height: auto;" alt="圖片預覽" />
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="borrowModal" tabindex="-1" aria-labelledby="borrowModalLabel" aria-hidden="true" bind:this={borrowModalElement}>
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="borrowModalLabel">
                    <i class="mdi mdi-hand-heart me-2"></i>資產借用登記
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            {#if assetData}
                <BorrowForm
                    asset={assetData}
                    borrowableUsers={users}
                    currentUser={currentUser}
                    onsuccess={handleBorrowSuccess}
                    oncancel={() => borrowModalInstance?.hide()}
                />
            {/if}
        </div>
    </div>
</div>
