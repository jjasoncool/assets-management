<script lang="ts">
    import { goto } from '$app/navigation';
    import Navbar from '$lib/components/Navbar.svelte';
    import UserForm from '$lib/components/UserForm.svelte';
    import type { PageData, ActionData } from './$types';

    // 解構取得 load 回傳的 data，以及 action 回傳的 form
    let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
    <title>編輯使用者 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-primary">
            <div
                class="card-header bg-primary bg-opacity-10 py-3 d-flex justify-content-between align-items-center"
            >
                <h5 class="card-title mb-0 fw-bold text-primary-emphasis">
                    <i class="mdi mdi-account-edit me-2"></i>
                    編輯使用者
                </h5>
                <a href="/users" class="btn btn-outline-secondary btn-sm">
                    <i class="mdi mdi-arrow-left me-1"></i>
                    返回列表
                </a>
            </div>
            <div class="card-body p-4">
                <UserForm
                    {form}
                    initialData={data.user}
                    isEditing={true}
                    onCancel={() => goto('/users')}
                />
            </div>
        </div>
    </div>
</div>
