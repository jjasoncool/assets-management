<script lang="ts">
    import { goto } from '$app/navigation';
    import { logout } from '$lib/services/userService';
    import Navbar from '$lib/components/Navbar.svelte';
    import AssetForm from '$lib/components/AssetForm.svelte';

    // 由 layout 提供的使用者資料
    export let data: any;
    let currentUser = data?.currentUser;

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

            <AssetForm
                mode="create"
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />
        </div>
    </div>
</div>
