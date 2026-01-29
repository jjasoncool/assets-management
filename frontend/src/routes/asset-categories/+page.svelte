<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    import {
        getAssetCategories,
        createAssetCategory,
        updateAssetCategory,
        deleteAssetCategory
    } from '$lib/services/assetService';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

// 表單狀態
let loading = true; // 初始設定為 true，避免閃爍效果
let error: string | null = null;
let success: string | null = null;

// 編輯突顯狀態
let isEditingHighlighted = false;

// 資產類別數據
let categories: any[] = [];
let isEditing = false;
let currentCategoryId = '';

    // 表單數據
    let formData = {
        name: '',
        prefix: '',
        next_sequence: 1,
        description: ''
    };

    // 初始化
    onMount(async () => {
        await loadCategories();
    });

// 載入資產類別列表
async function loadCategories() {
    try {
        loading = true;
        error = null;

        const result = await getAssetCategories({ sort: 'name' });
        categories = result.items;
    } catch (err) {
        error = err instanceof Error ? err.message : '載入資產類別失敗';
    } finally {
        loading = false;
    }
}

    // 新增資產類別
    async function handleSubmit() {
        try {
            loading = true;
            error = null;
            success = null;

            // 驗證表單
            if (!formData.name.trim()) {
                error = '請輸入類別名稱';
                return;
            }

            if (!formData.prefix.trim()) {
                error = '請輸入類別前綴';
                return;
            }

            if (formData.prefix.length !== 2) {
                error = '類別前綴必須為 2 個字元';
                return;
            }

// 準備表單數據 - 使用 JSON 對象（與官方文檔一致）
const submitData: any = {
    name: formData.name.trim(),
    prefix: formData.prefix.trim().toUpperCase(),
    description: formData.description.trim()
};

// 只有在新增時才包含 next_sequence，編輯時不更新 next_sequence
if (!isEditing) {
    submitData.next_sequence = formData.next_sequence;
}

            if (isEditing) {
                // 編輯現有類別
                await updateAssetCategory(currentCategoryId, submitData);
                success = '資產類別更新成功！';
            } else {
                // 新增類別
                await createAssetCategory(submitData);
                success = '資產類別新增成功！';
            }

            // 重置表單
            resetForm();
            await loadCategories();

        } catch (err) {
            error = err instanceof Error ? err.message : isEditing ? '更新資產類別失敗' : '新增資產類別失敗';
            console.error('API 錯誤:', err);
        } finally {
            loading = false;
        }
    }

// 重置表單
function resetForm() {
    formData = {
        name: '',
        prefix: '',
        next_sequence: 1,
        description: ''
    };
    isEditing = false;
    isEditingHighlighted = false;
    currentCategoryId = '';
}

// 編輯類別
function editCategory(category: any) {
    isEditing = true;
    isEditingHighlighted = true;
    currentCategoryId = category.id;
    formData = {
        name: category.name,
        prefix: category.prefix,
        next_sequence: category.next_sequence || 1,
        description: category.description || ''
    };

    // 滾動到表單區域
    setTimeout(() => {
        const formCard = document.querySelector('.card.mb-4');
        if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

    // 刪除類別
    async function deleteCategory(categoryId: string) {
        if (confirm('確定要刪除這個資產類別嗎？刪除後無法恢復，並可能影響現有資產。')) {
            try {
                loading = true;
                error = null;
                success = null;

                await deleteAssetCategory(categoryId);
                success = '資產類別刪除成功！';
                await loadCategories();
            } catch (err) {
                error = err instanceof Error ? err.message : '刪除資產類別失敗';
            } finally {
                loading = false;
            }
        }
    }

    function handleLogout() {
        logout();
        goto('/login');
    }
</script>

<svelte:head>
    <title>資產類別管理</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">資產類別管理</h5>
            </div>

            <div class="card-body p-4">
                {#if error}
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-alert-circle me-2"></i>
                        {error}
                        <button type="button" class="btn-close" onclick={() => error = null} aria-label="Close"></button>
                    </div>
                {/if}

                {#if success}
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-check-circle me-2"></i>
                        {success}
                        <button type="button" class="btn-close" onclick={() => success = null} aria-label="Close"></button>
                    </div>
                {/if}

                <!-- 表單區域 -->
                <div class="card mb-4 {isEditingHighlighted ? 'bg-warning-subtle border border-warning' : ''}">
                    <div class="card-header bg-light">
                        <h6 class="mb-0 fw-bold">{isEditing ? '編輯資產類別' : '新增資產類別'}</h6>
                    </div>
                    <div class="card-body">
                        <form onsubmit={handleSubmit}>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label for="name" class="form-label small fw-bold text-secondary">類別名稱 *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        class="form-control shadow-none"
                                        bind:value={formData.name}
                                        placeholder="例如：筆記型電腦、桌上型電腦"
                                        required
                                    />
                                </div>
                                <div class="col-md-6">
                                    <label for="prefix" class="form-label small fw-bold text-secondary">類別前綴 *</label>
                                    <div class="input-group">
                                        <input
                                            type="text"
                                            id="prefix"
                                            class="form-control shadow-none text-uppercase"
                                            bind:value={formData.prefix}
                                            placeholder="2 個字元"
                                            maxlength="2"
                                            required
                                        />
                                        <span class="input-group-text">例如：NB、PC</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label for="description" class="form-label small fw-bold text-secondary">描述</label>
                                    <textarea
                                        id="description"
                                        class="form-control shadow-none"
                                        bind:value={formData.description}
                                        rows="2"
                                        placeholder="類別描述（可選）"
                                    ></textarea>
                                </div>
                                <div class="col-12">
                                    <div class="d-flex justify-content-end">
                                        {#if isEditing}
                                        <button
                                            type="button"
                                            class="btn btn-outline-secondary me-2"
                                            onclick={resetForm}
                                        >
                                            <i class="mdi mdi-cancel me-2" aria-hidden="true"></i>
                                            取消
                                        </button>
                                        {/if}
                                        <button
                                            type="submit"
                                            class="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {#if loading}
                                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                處理中...
                                            {:else}
                                                {#if isEditing}
                                                    <i class="mdi mdi-content-save me-2" aria-hidden="true"></i>
                                                    更新類別
                                                {:else}
                                                    <i class="mdi mdi-plus me-2" aria-hidden="true"></i>
                                                    新增類別
                                                {/if}
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 類別列表 -->
                <div class="card">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">現有資產類別</h6>
                        <span class="badge bg-primary">{categories.length} 個類別</span>
                    </div>
                    <div class="card-body">
                    {#if loading}
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">載入中...</span>
                            </div>
                            <p class="mt-2">載入資產類別中...</p>
                        </div>
                    {:else if categories.length === 0}
                        <div class="alert alert-info mb-0">
                            <i class="mdi mdi-information me-2"></i>
                            目前沒有資產類別，請新增一個。
                        </div>
                    {:else}
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>類別名稱</th>
                                            <th style="width: 80px;">前綴</th>
                                            <th class="text-center" style="width: 150px;">下一個序號</th>
                                            <th>描述</th>
                                            <th class="w-auto">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each categories as category}
                                            <tr>
                                                <td class="align-middle">{category.name}</td>
                                                <td class="align-middle">
                                                    <span class="badge bg-secondary">{category.prefix}</span>
                                                </td>
                                                <td class="align-middle text-center">{category.next_sequence}</td>
                                                <td class="align-middle">{category.description || '-'}</td>
                                                <td class="align-middle w-auto">
                                                    <div class="d-flex gap-2 justify-content-end">
                                                    <button
                                                        type="button"
                                                        class="btn btn-sm btn-outline-primary"
                                                        onclick={() => editCategory(category)}
                                                        aria-label={"編輯類別 " + category.name}
                                                    >
                                                        <i class="mdi mdi-pencil me-1" aria-hidden="true"></i>
                                                        編輯
                                                    </button>
                                                    <button
                                                        type="button"
                                                        class="btn btn-sm btn-outline-danger"
                                                        onclick={() => deleteCategory(category.id)}
                                                        aria-label={"刪除類別 " + category.name}
                                                    >
                                                        <i class="mdi mdi-delete me-1" aria-hidden="true"></i>
                                                        刪除
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>