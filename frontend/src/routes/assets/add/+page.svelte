<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    import AssetForm from '$lib/components/AssetForm.svelte';
    import { generateAssetIdAndUpdateSequence } from '$lib/services/assetService';
    import { pb } from '$lib/pocketbase';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

    // 表單狀態
    let loading = false;
    let error: string | null = null;

    // 選項數據
    let categories: any[] = [];
    let users: any[] = [];

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

            {#if error}
                <div class="card-body p-4">
                    <div class="alert alert-danger">
                        <i class="mdi mdi-alert-circle me-2"></i>
                        {error}
                    </div>
                </div>
            {:else}
                <AssetForm
                    mode="create"
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            {/if}
        </div>
    </div>
</div>
