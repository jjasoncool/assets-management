<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    import { createAsset, getAssets } from '$lib/services/assetService';
    import { pb } from '$lib/pocketbase';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

    // 表單狀態
    let loading = false;
    let error: string | null = null;
    let success: string | null = null;

    // 表單數據
    let formData = {
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
    };

    // 選項數據
    let categories: any[] = [];
    let users: any[] = [];

    // 狀態選項
    const statusOptions = [
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '停用' },
        { value: 'maintenance', label: '維護中' },
        { value: 'retired', label: '已報廢' },
        { value: 'lost', label: '遺失' },
        { value: 'stolen', label: '失竊' },
        { value: 'borrowed', label: '借出中' }
    ];

    // 圖片上傳
    let imageFiles: File[] = [];
    let imagePreviews: string[] = [];

    // 初始化
    onMount(async () => {
        try {
            // 獲取類別列表
            const categoryResult = await pb.collection('asset_categories').getList(1, 50, {
                sort: 'name'
            });
            categories = categoryResult.items;

            // 獲取用戶列表
            const userResult = await pb.collection('users').getList(1, 100, {
                sort: 'name'
            });
            users = userResult.items;
        } catch (err) {
            error = err instanceof Error ? err.message : '載入選項失敗';
        }
    });

    // 處理圖片上傳
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

            // 生成預覽
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        imagePreviews = [...imagePreviews, e.target.result as string];
                    }
                };
                reader.readAsDataURL(file);
            });

            // 清空 input，允許重複選擇相同檔案
            input.value = '';
        }
    }

    // 刪除圖片
    function removeImage(index: number) {
        imageFiles = imageFiles.filter((_, i) => i !== index);
        imagePreviews = imagePreviews.filter((_, i) => i !== index);
    }

    // 計算風險分數
    function calculateRiskScore() {
        const c = formData.confidentiality_score || 0;
        const i = formData.integrity_score || 0;
        const a = formData.availability_score || 0;
        return Math.round((c + i + a) / 3 * 100) / 100;
    }

    // 驗證表單
    function validateForm(): string[] {
        const errors: string[] = [];

        if (!formData.name.trim()) {
            errors.push('請輸入資產名稱');
        }

        if (!formData.category) {
            errors.push('請選擇資產類別。如果沒有適當的類別，請聯繫管理員新增所需類別。');
        }

        if (formData.purchase_price !== undefined && formData.purchase_price < 0) {
            errors.push('購買價格不能為負數');
        }

        if (formData.warranty_years !== undefined && formData.warranty_years < 0) {
            errors.push('保固年數不能為負數');
        }

        if (formData.confidentiality_score !== undefined && (formData.confidentiality_score < 0 || formData.confidentiality_score > 5)) {
            errors.push('機密性分數必須在 0-5 之間');
        }

        if (formData.integrity_score !== undefined && (formData.integrity_score < 0 || formData.integrity_score > 5)) {
            errors.push('完整性分數必須在 0-5 之間');
        }

        if (formData.availability_score !== undefined && (formData.availability_score < 0 || formData.availability_score > 5)) {
            errors.push('可用性分數必須在 0-5 之間');
        }

        if (imageFiles.length > 10) {
            errors.push('最多只能上傳 10 張圖片');
        }

        return errors;
    }

    // 提交表單
    async function handleSubmit() {
        try {
            loading = true;
            error = null;
            success = null;

            const validationErrors = validateForm();
            if (validationErrors.length > 0) {
                error = validationErrors.join('；');
                return;
            }

            // 準備表單數據
            const submitData: any = {
                name: formData.name.trim(),
                brand: formData.brand.trim(),
                model: formData.model.trim(),
                serial_number: formData.serial_number.trim(),
                purchase_date: formData.purchase_date || undefined,
                purchase_price: formData.purchase_price,
                warranty_years: formData.warranty_years,
                location: formData.location.trim(),
                department: formData.department.trim(),
                category: formData.category,
                assigned_to: formData.assigned_to || undefined,
                confidentiality_score: formData.confidentiality_score,
                integrity_score: formData.integrity_score,
                availability_score: formData.availability_score,
                total_risk_score: calculateRiskScore(),
                status: formData.status,
                notes: formData.notes.trim()
            };

            // 如果有圖片，使用 FormData
            let result;
            if (imageFiles.length > 0) {
                const formDataObj = new FormData();
                Object.entries(submitData).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        formDataObj.append(key, String(value));
                    }
                });
                imageFiles.forEach(file => {
                    formDataObj.append('images', file);
                });

                result = await pb.collection('assets').create(formDataObj);
            } else {
                result = await createAsset(submitData);
            }

            success = '資產新增成功！';
            // 重置表單
            formData = {
                name: '',
                brand: '',
                model: '',
                serial_number: '',
                purchase_date: '',
                purchase_price: undefined,
                warranty_years: undefined,
                location: '',
                department: '',
                category: '',
                assigned_to: '',
                confidentiality_score: undefined,
                integrity_score: undefined,
                availability_score: undefined,
                status: 'active',
                notes: ''
            };
            imageFiles = [];
            imagePreviews = [];

            // 3 秒後跳轉到資產列表
            setTimeout(() => {
                goto('/assets');
            }, 3000);

        } catch (err) {
            error = err instanceof Error ? err.message : '新增資產失敗';
        } finally {
            loading = false;
        }
    }

    function handleLogout() {
        logout();
        goto('/login');
    }
</script>

<svelte:head>
    <title>新增資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">新增資產</h5>
            </div>

            <div class="card-body p-4">
                {#if error}
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-alert-circle me-2"></i>
                        {error}
                        <button type="button" class="btn-close" on:click={() => error = null}></button>
                    </div>
                {/if}

                {#if success}
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-check-circle me-2"></i>
                        {success}
                        <button type="button" class="btn-close" on:click={() => success = null}></button>
                    </div>
                {/if}

                <form on:submit|preventDefault={handleSubmit}>
                    <!-- 基本資訊 -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label for="name" class="form-label small fw-bold text-secondary">資產名稱 *</label>
                            <input
                                type="text"
                                id="name"
                                class="form-control shadow-none"
                                bind:value={formData.name}
                                placeholder="請輸入資產名稱"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="category" class="form-label small fw-bold text-secondary">資產類別 *</label>
                            <select
                                id="category"
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
                                class="form-control shadow-none"
                                bind:value={formData.serial_number}
                                placeholder="設備序列號碼"
                            />
                        </div>
                    </div>

                    <!-- 購買資訊 -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label for="purchase_date" class="form-label small fw-bold text-secondary">購買日期</label>
                            <input
                                type="date"
                                id="purchase_date"
                                class="form-control shadow-none"
                                bind:value={formData.purchase_date}
                            />
                        </div>
                        <div class="col-md-4">
                            <label for="purchase_price" class="form-label small fw-bold text-secondary">購買價格</label>
                            <input
                                type="number"
                                id="purchase_price"
                                class="form-control shadow-none"
                                bind:value={formData.purchase_price}
                                placeholder="0"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div class="col-md-4">
                            <label for="warranty_years" class="form-label small fw-bold text-secondary">保固年數</label>
                            <input
                                type="number"
                                id="warranty_years"
                                class="form-control shadow-none"
                                bind:value={formData.warranty_years}
                                placeholder="0"
                                min="0"
                                step="0.1"
                            />
                        </div>
                    </div>

                    <!-- 位置與部門 -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label for="location" class="form-label small fw-bold text-secondary">位置</label>
                            <input
                                type="text"
                                id="location"
                                class="form-control shadow-none"
                                bind:value={formData.location}
                                placeholder="例如：辦公室 A、倉庫 B"
                            />
                        </div>
                        <div class="col-md-6">
                            <label for="department" class="form-label small fw-bold text-secondary">部門</label>
                            <input
                                type="text"
                                id="department"
                                class="form-control shadow-none"
                                bind:value={formData.department}
                                placeholder="例如：IT 部、業務部"
                            />
                        </div>
                    </div>

                    <!-- 負責人 -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label for="assigned_to" class="form-label small fw-bold text-secondary">負責人</label>
                            <select
                                id="assigned_to"
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
                                class="form-select shadow-none"
                                bind:value={formData.status}
                            >
                                {#each statusOptions as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- 風險評估 -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label for="confidentiality_score" class="form-label small fw-bold text-secondary">機密性分數 (0-5)</label>
                            <input
                                type="number"
                                id="confidentiality_score"
                                class="form-control shadow-none"
                                bind:value={formData.confidentiality_score}
                                placeholder="0-5"
                                min="0"
                                max="5"
                                step="0.1"
                            />
                        </div>
                        <div class="col-md-4">
                            <label for="integrity_score" class="form-label small fw-bold text-secondary">完整性分數 (0-5)</label>
                            <input
                                type="number"
                                id="integrity_score"
                                class="form-control shadow-none"
                                bind:value={formData.integrity_score}
                                placeholder="0-5"
                                min="0"
                                max="5"
                                step="0.1"
                            />
                        </div>
                        <div class="col-md-4">
                            <label for="availability_score" class="form-label small fw-bold text-secondary">可用性分數 (0-5)</label>
                            <input
                                type="number"
                                id="availability_score"
                                class="form-control shadow-none"
                                bind:value={formData.availability_score}
                                placeholder="0-5"
                                min="0"
                                max="5"
                                step="0.1"
                            />
                        </div>
                        <div class="col-md-12">
                            <div class="alert alert-light small">
                                風險總分：{calculateRiskScore()} / 5.0
                                <div class="progress mt-2" style="height: 8px">
                                    <div
                                        class="progress-bar"
                                        style="width: {Math.round(calculateRiskScore() / 5 * 100)}%"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 圖片上傳 -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <label class="form-label small fw-bold text-secondary">資產圖片</label>
                            <div class="input-group">
                                <input
                                    type="file"
                                    class="form-control shadow-none"
                                    accept="image/*"
                                    multiple
                                    on:change={handleImageUpload}
                                />
                            </div>
                            <div class="form-text">
                                支援 JPG、PNG、GIF、WebP 格式，單檔最大 5MB，最多 10 張
                            </div>
                        </div>

                        <div class="col-12">
                            <div class="row g-2 mt-2">
                                {#each imagePreviews as preview, index}
                                    <div class="col-md-3">
                                        <div class="position-relative">
                                            <img
                                                src={preview}
                                                class="img-thumbnail w-100"
                                                style="height: 120px; object-fit: cover;"
                                                alt="預覽"
                                            />
                                            <button
                                                type="button"
                                                class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                                                on:click={() => removeImage(index)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <!-- 備註 -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <label for="notes" class="form-label small fw-bold text-secondary">備註</label>
                            <textarea
                                id="notes"
                                class="form-control shadow-none"
                                bind:value={formData.notes}
                                rows="3"
                                placeholder="其他補充說明..."
                            ></textarea>
                        </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div class="row">
                        <div class="col-12">
                            <div class="d-flex justify-content-between">
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    on:click={() => goto('/assets')}
                                >
                                    <i class="mdi mdi-arrow-left me-2"></i>
                                    返回列表
                                </button>

                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    disabled={loading}
                                >
                                    {#if loading}
                                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                        新增中...
                                    {:else}
                                        <i class="mdi mdi-plus me-2"></i>
                                        新增資產
                                    {/if}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
