<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    import AssetForm from '$lib/components/AssetForm.svelte';
    import { getAsset } from '$lib/services/assetService';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

    // 獲取 URL 中的 id
    export let params: any;
    let assetId = params.id;

    // 資產數據
    let assetData: any = null;
    let loading = true;
    let error: string | null = null;

    // 載入資產數據
    async function loadAsset() {
        try {
            loading = true;
            error = null;

            const result = await getAsset(assetId);
            assetData = result;

        } catch (err) {
            error = err instanceof Error ? err.message : '載入資產失敗';
        } finally {
            loading = false;
        }
    }

    // 提交成功後的處理
    async function handleSubmit() {
        goto('/assets');
    }

    // 取消處理
    function handleCancel() {
        goto('/assets');
    }

    function handleLogout() {
        logout();
        goto('/login');
    }

    onMount(() => {
        loadAsset();
    });
</script>

<svelte:head>
    <title>編輯資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">編輯資產</h5>
            </div>

            {#if loading}
                <div class="card-body p-4 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">載入中...</span>
                    </div>
                    <p class="mt-2">載入資產數據中...</p>
                </div>
            {:else if error}
                <div class="card-body p-4">
                    <div class="alert alert-danger">
                        <i class="mdi mdi-alert-circle me-2"></i>
                        {error}
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-outline-secondary" on:click={handleCancel}>
                            <i class="mdi mdi-arrow-left me-2"></i>
                            返回列表
                        </button>
                    </div>
                </div>
            {:else if assetData}
                <AssetForm
                    mode="edit"
                    assetData={assetData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            {:else}
                <div class="card-body p-4 text-center">
                    <div class="alert alert-warning">
                        <i class="mdi mdi-alert me-2"></i>
                        找不到資產數據
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-outline-secondary" on:click={handleCancel}>
                            <i class="mdi mdi-arrow-left me-2"></i>
                            返回列表
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>