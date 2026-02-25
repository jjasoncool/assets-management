<script lang="ts">
    import { enhance } from '$app/forms';
    import Navbar from '$lib/components/Navbar.svelte';
    import type { PageData, ActionData } from './$types';

    // 1. 修正：引入 PageData 與 ActionData 型別，解決 categories 找不到的問題
    let { data, form } = $props<{ data: PageData, form: ActionData }>();

    // 2. 使用 derived 取得資料
    let categories = $derived(data.categories || []);
    let currentUser = $derived(data.currentUser);

    // 3. 狀態管理
    let loading = $state(false);
    let isEditing = $state(false);
    let isEditingHighlighted = $state(false);
    let currentCategoryId = $state('');

    // 表單數據
    let formData = $state({
        name: '',
        prefix: '',
        next_sequence: 1,
        description: ''
    });

    // 處理 Action 回傳的結果
    let errorMessage = $derived(form?.error);
    let successMessage = $derived(form?.success ? form?.message : null);

    // 當 Action 失敗時回填資料；成功時重置
    $effect(() => {
        if (form?.values && !form.success) {
            formData = { ...formData, ...form.values };
        }
        if (form?.success) {
            resetForm();
        }
    });

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

    // 進入編輯模式
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

        setTimeout(() => {
            const formCard = document.querySelector('.card.mb-4');
            if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
</script>

<svelte:head>
    <title>資產類別管理</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">資產類別管理</h5>
            </div>

            <div class="card-body p-4">
                {#if errorMessage}
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-alert-circle me-2"></i>
                        {errorMessage}
                    </div>
                {/if}

                {#if successMessage}
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="mdi mdi-check-circle me-2"></i>
                        {successMessage}
                    </div>
                {/if}

                <div class="card mb-4 {isEditingHighlighted ? 'bg-warning-subtle border border-warning' : ''}">
                    <div class="card-header bg-light">
                        <h6 class="mb-0 fw-bold">{isEditing ? '編輯資產類別' : '新增資產類別'}</h6>
                    </div>
                    <div class="card-body">
                        <form
                            method="POST"
                            action={isEditing ? '?/update' : '?/create'}
                            use:enhance={() => {
                                loading = true;
                                return async ({ update }) => {
                                    await update();
                                    loading = false;
                                };
                            }}
                        >
                            {#if isEditing}
                                <input type="hidden" name="id" value={currentCategoryId} />
                            {/if}

                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label for="name" class="form-label small fw-bold text-secondary">類別名稱 *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
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
                                            name="prefix"
                                            class="form-control shadow-none text-uppercase"
                                            bind:value={formData.prefix}
                                            placeholder="2 個字元"
                                            maxlength="2"
                                            required
                                        />
                                        <span class="input-group-text">例如：NB、PC</span>
                                    </div>
                                </div>

                                {#if !isEditing}
                                    <div class="col-12">
                                        <label for="next_sequence" class="form-label small fw-bold text-secondary">起始序號</label>
                                        <input
                                            type="number"
                                            id="next_sequence"
                                            name="next_sequence"
                                            class="form-control shadow-none"
                                            bind:value={formData.next_sequence}
                                            min="1"
                                        />
                                        <div class="form-text">設定該類別資產的第一個流水號 (預設為 1)</div>
                                    </div>
                                {/if}

                                <div class="col-12">
                                    <label for="description" class="form-label small fw-bold text-secondary">描述</label>
                                    <textarea
                                        id="description"
                                        name="description"
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
                                                disabled={loading}
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

                <div class="card">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">現有資產類別</h6>
                        <span class="badge bg-primary">{categories.length} 個類別</span>
                    </div>
                    <div class="card-body">
                        {#if categories.length === 0}
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

                                                        <form
                                                            method="POST"
                                                            action="?/delete"
                                                            use:enhance={({ cancel }) => {
                                                                if(!confirm('確定要刪除這個資產類別嗎？刪除後無法恢復，並可能影響現有資產。')) return cancel();
                                                                loading = true;
                                                                return async ({ update }) => {
                                                                    await update();
                                                                    loading = false;
                                                                };
                                                            }}
                                                            style="display: inline;"
                                                        >
                                                            <input type="hidden" name="id" value={category.id} />
                                                            <button
                                                                type="submit"
                                                                class="btn btn-sm btn-outline-danger"
                                                                aria-label={"刪除類別 " + category.name}
                                                                disabled={loading}
                                                            >
                                                                <i class="mdi mdi-delete me-1" aria-hidden="true"></i>
                                                                刪除
                                                            </button>
                                                        </form>
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