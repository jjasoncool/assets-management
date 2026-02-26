<!--
    共用使用者表單元件
    - 支援新增 (isEditing = false) 與編輯 (isEditing = true) 兩種模式
    - 透過 $props 接收外部傳入的表單資料 (form)
-->
<script lang="ts">
	import type { ActionData } from '../../routes/users/add/$types';
	import TomSelect from 'tom-select';
	import 'tom-select/dist/css/tom-select.bootstrap5.css';

	let {
		form,
		isEditing = false,
		onCancel
	} = $props<{
		form?: ActionData;
		isEditing?: boolean;
		onCancel: () => void;
	}>();

	// 使用 $state 來管理表單的內部狀態，並將其初始值與 props 脫鉤
	let name = $state('');
	let email = $state('');
	let department = $state('');
	let role = $state(['user']);

	// 使用 $effect 來同步從 props 傳入的表單資料
	// 這會在元件初次掛載以及 form prop 變更時執行
	// 確保當伺服器驗證失敗並回傳舊資料時，表單能正確更新
	$effect(() => {
		name = form?.data?.name || '';
		email = form?.data?.email || '';
		department = form?.data?.department || ''; // 新增 department
		role = form?.data?.role
			? Array.isArray(form.data.role)
				? form.data.role
				: [form.data.role]
			: ['user'];
	});

	// 從 form prop 派生出錯誤訊息，這樣模板中就不會出現 'state_referenced_locally' 警告
	const formError = $derived(form?.error);
	const formErrors = $derived(form?.errors);

	let roleSelectEl: HTMLSelectElement;

	// 使用 $effect 來初始化 TomSelect
	$effect(() => {
		if (roleSelectEl) {
			const tomselect = new TomSelect(roleSelectEl, {
				plugins: ['remove_button']
			});

			// 返回一個清理函式，當元件銷毀或 roleSelectEl 變更時，銷毀 TomSelect 實例
			return () => {
				tomselect.destroy();
			};
		}
	});
</script>

<form method="POST" class="mt-4">
	<!-- 顯示後端返回的通用錯誤訊息 -->
	{#if formError}
		<div class="alert alert-danger" role="alert">
			{formError}
		</div>
	{/if}

	<!-- 姓名 -->
	<div class="mb-3">
		<label for="name" class="form-label">姓名 (Name)</label>
		<input
			type="text"
			id="name"
			name="name"
			class="form-control"
			bind:value={name}
			required
			placeholder="請輸入使用者姓名"
		/>
		{#if formErrors?.name}
			<div class="text-danger mt-1">
				<small>{formErrors.name}</small>
			</div>
		{/if}
	</div>

	<!-- Email -->
	<div class="mb-3">
		<label for="email" class="form-label">電子郵件 (Email)</label>
		<input
			type="email"
			id="email"
			name="email"
			class="form-control"
			bind:value={email}
			required
			placeholder="user@example.com"
		/>
		{#if formErrors?.email}
			<div class="text-danger mt-1">
				<small>{formErrors.email}</small>
			</div>
		{/if}
	</div>

	<!-- 部門 -->
	<div class="mb-3">
		<label for="department" class="form-label">部門 (Department)</label>
		<input
			type="text"
			id="department"
			name="department"
			class="form-control"
			bind:value={department}
			placeholder="請輸入部門名稱"
		/>
		{#if formErrors?.department}
			<div class="text-danger mt-1">
				<small>{formErrors.department}</small>
			</div>
		{/if}
	</div>

	<!-- 角色 -->
	<div class="mb-3">
		<label for="role" class="form-label">角色 (Role)</label>
		<select id="role" name="role" bind:this={roleSelectEl} bind:value={role} multiple>
			<option value="user">一般使用者 (User)</option>
			<option value="admin">管理員 (Admin)</option>
		</select>
		{#if formErrors?.role}
			<div class="text-danger mt-1">
				<small>{formErrors.role}</small>
			</div>
		{/if}
	</div>

	<!-- 密碼 -->
	<div class="mb-3">
		<label for="password" class="form-label">密碼 (Password)</label>
		<input
			type="password"
			id="password"
			name="password"
			class="form-control"
			required={!isEditing}
			placeholder={isEditing ? '留白表示不變更密碼' : ''}
		/>
		{#if formErrors?.password}
			<div class="text-danger mt-1">
				<small>{formErrors.password}</small>
			</div>
		{/if}
	</div>

	<!-- 確認密碼 -->
	<div class="mb-3">
		<label for="passwordConfirm" class="form-label">確認密碼 (Confirm Password)</label>
		<input
			type="password"
			id="passwordConfirm"
			name="passwordConfirm"
			class="form-control"
			required={!isEditing}
		/>
		{#if formErrors?.passwordConfirm}
			<div class="text-danger mt-1">
				<small>{formErrors.passwordConfirm}</small>
			</div>
		{/if}
	</div>

	<hr />

	<div class="d-flex justify-content-end">
		<button type="button" class="btn btn-secondary me-2" onclick={onCancel}>
			<i class="mdi mdi-close me-2"></i>
			取消
		</button>
		<button type="submit" class="btn btn-primary">
			<i class="mdi mdi-check me-2"></i>
			{isEditing ? '更新使用者' : '建立使用者'}
		</button>
	</div>
</form>
