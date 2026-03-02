<script lang="ts">
    import { goto } from '$app/navigation';
    import Navbar from '$lib/components/Navbar.svelte';
    import UserForm from '$lib/components/UserForm.svelte';
    import type { ActionData } from './$types';

    // 從伺服器接收表單操作的數據
    let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
    <title>新增使用者 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-sm-4">
        <Navbar />

        <div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-primary">
            <div
                class="card-header bg-primary bg-opacity-10 py-3 d-flex justify-content-between align-items-center"
            >
                <h5 class="card-title mb-0 fw-bold text-primary-emphasis">
                    <i class="mdi mdi-account-plus me-2"></i>
                    新增使用者
                </h5>
                <a href="/users" class="btn btn-outline-secondary btn-sm">
                    <i class="mdi mdi-arrow-left me-1"></i>
                    返回列表
                </a>
            </div>
            <div class="card-body p-4">
                <UserForm {form} isEditing={false} onCancel={() => goto('/users')} />
            </div>
        </div>
    </div>
</div>
