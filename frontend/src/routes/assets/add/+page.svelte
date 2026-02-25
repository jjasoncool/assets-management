<script lang="ts">
    import { goto } from '$app/navigation';
    import Navbar from '$lib/components/Navbar.svelte';
    import AssetForm from '$lib/components/AssetForm.svelte';

    // 接收 Server 傳來的資料 (包含 borrowableUsers, categories, currentUser)
    let { data, form } = $props();
    // 這裡我們直接使用 data 裡的資料
</script>

<svelte:head>
    <title>新增資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">新增資產</h5>
            </div>

            <AssetForm
                mode="create"
                form={form}
                users={data.borrowableUsers}
                categories={data.categories}
                onCancel={() => goto('/assets')}
            />
        </div>
    </div>
</div>
