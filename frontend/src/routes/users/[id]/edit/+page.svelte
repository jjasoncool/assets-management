<script lang="ts">
	import { goto } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import UserForm from '$lib/components/UserForm.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// 從 props 派生出響應式變數，避免在後續邏輯中直接引用 props，從而解決 'state_referenced_locally' 警告
	const serverData = $derived(data.form); // 來自 load 函數的初始資料
	const actionData = $derived(form?.data); // 來自 action 的返回資料 (成功或失敗)
	const actionErrors = $derived(form?.errors);
	const actionError = $derived(form?.error);

	// 合併資料來源：優先使用 action 返回的資料 (使用者提交失敗後的舊輸入)，如果沒有，則使用從伺服器載入的初始資料
	const mergedData = $derived({
		data: {
			name: actionData?.name || serverData?.name || '',
			email: actionData?.email || serverData?.email || '',
			department: actionData?.department || serverData?.department || '',
			role: actionData?.role || serverData?.role || ['user']
		},
		errors: actionErrors,
		error: actionError
	});
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
				<UserForm form={mergedData} isEditing={true} onCancel={() => goto('/users')} />
			</div>
		</div>
	</div>
</div>
