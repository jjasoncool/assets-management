<script lang="ts">
    import { goto } from '$app/navigation';
    import Navbar from '$lib/components/Navbar.svelte';
    import AssetForm from '$lib/components/AssetForm.svelte';
    // 接收 Server Load 的資料 (data.asset 等) 與 Action 結果 (form)
    let { data, form } = $props();
</script>

<svelte:head>
    <title>編輯資產</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90">
            <div class="card-header bg-white bg-opacity-90 py-3">
                <h5 class="card-title mb-0 fw-bold">編輯資產</h5>
            </div>

            <AssetForm
                mode="edit"
                form={form}
                assetData={data.asset}
                users={data.borrowableUsers}
                categories={data.categories}
                currentUser={data.currentUser}
                fileToken={data.fileToken}
                onCancel={() => goto('/assets')}
            />
        </div>
    </div>
</div>
