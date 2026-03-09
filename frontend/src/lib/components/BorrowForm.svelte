<script lang="ts">
	import type { User } from '$lib/types';
	import { formatDate } from '$lib/utils/datetime';
	import { flatpickr } from '$lib/actions/flatpickr';

	// =================================================================
	// Props
	// =================================================================
	let {
		currentUser,
		borrowableUsers = [],
		expectedReturnDate = ''
	} = $props<{
		currentUser: User | null;
		borrowableUsers?: User[];
		expectedReturnDate?: string;
	}>();

	// =================================================================
	// Effects & Derived Logic
	// =================================================================
	// 計算預設歸還日期 (預設 7 天後), 如果外部沒有傳入值
	$effect(() => {
		if (!expectedReturnDate) {
			const defaultDate = new Date();
			defaultDate.setDate(defaultDate.getDate() + 7);
			expectedReturnDate = formatDate(defaultDate);
		}
	});
</script>

<!--
  這是一個 "Dumb Component"，僅包含借用表單的共通欄位。
  它不包含 <form> 標籤或提交邏輯，以便能被彈性地組合在不同的父層表單中。
-->

<!-- 借用人欄位 -->
<div class="mb-3">
	<label for="user" class="form-label fw-bold">借用人</label>
	{#if borrowableUsers && borrowableUsers.length > 1}
		<select name="user" id="user" class="form-select">
			{#each borrowableUsers as user}
				<option value={user.id} selected={user.id === currentUser?.id}>
					{user.name || user.email}
				</option>
			{/each}
		</select>
	{:else}
		<input type="hidden" name="user" value={currentUser?.id} />
		<input
			type="text"
			class="form-control"
			value={currentUser?.name || currentUser?.email || '未知使用者'}
			disabled
			readonly
		/>
	{/if}
</div>

<!-- 預計歸還日期 -->
<div class="mb-3">
	<label for="returnDate" class="form-label fw-bold"
		>預計歸還日期 <span class="text-danger">*</span></label
	>
	<input
		type="text"
		class="form-control"
		id="returnDate"
		name="expected_return_date"
		bind:value={expectedReturnDate}
		use:flatpickr={{
			minDate: 'today'
		}}
		required
	/>
</div>

<!-- 上傳圖片 -->
<div class="mb-3">
	<label for="images" class="form-label fw-bold">借用時照片 (選填)</label>
	<input
		type="file"
		class="form-control"
		id="images"
		name="borrow_images"
		accept="image/*"
		multiple
	/>
	<div class="form-text">建議拍攝資產現況，以保障雙方權益。</div>
</div>