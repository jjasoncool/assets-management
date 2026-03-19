<script lang="ts">
	import type { BorrowRecord, User } from '$lib/types';
	import { formatDate } from '$lib/utils/datetime';
	import { flatpickr } from '$lib/actions/flatpickr';

	// =================================================================
	// Props
	// =================================================================
	let {
		currentUser,
		borrowableUsers = [],
		borrowRecord = null
	} = $props<{
		currentUser: User | null;
		borrowableUsers?: User[];
		borrowRecord?: BorrowRecord | null;
	}>();

	// =================================================================
	// States
	// =================================================================
	let expectedReturnDate = $state('');
	let remark = $state('');
	let selectedUser = $state('');

	// =================================================================
	// Effects & Derived Logic
	// =================================================================
	// 當 borrowRecord 傳入時 (編輯模式)，或在新建模式下，初始化欄位
	$effect(() => {
		if (borrowRecord) {
			// 編輯模式：從紀錄中帶入資料
			// PocketBase 日期格式為 'YYYY-MM-DD HH:mm:ss.sssZ'，我們只需要 'YYYY-MM-DD'
			expectedReturnDate = borrowRecord.expected_return_date.split(' ')[0];
			remark = borrowRecord.remark || '';
			selectedUser = borrowRecord.user;
		} else {
			// 新增模式：設定預設值
			const defaultDate = new Date();
			defaultDate.setDate(defaultDate.getDate() + 7);
			expectedReturnDate = formatDate(defaultDate);
			selectedUser = currentUser?.id || '';
		}
	});

	// [新增] 動態計算 flatpickr 的選項
	let flatpickrOptions = $derived.by(() => {
		const options: Record<string, any> = {
			minDate: 'today'
		};

		if (!borrowRecord) {
			// 新增模式：限制最大日期為三個月後
			const maxDate = new Date();
			maxDate.setMonth(maxDate.getMonth() + 3);
			options.maxDate = maxDate;
		} else {
			// 編輯模式：不限制最小日期
			options.minDate = undefined;
		}
		return options;
	});
</script>

<!--
  這是一個 "Dumb Component"，僅包含借用表單的共通欄位。
  它不包含 <form> 標籤或提交邏輯，以便能被彈性地組合在不同的父層表單中。
-->

<!-- 借用人欄位 -->
<div class="mb-3">
	<label for="user" class="form-label fw-bold">借用人</label>
	{#if borrowableUsers && borrowableUsers.length > 1 && !borrowRecord}
		<!-- 只有在「新增模式」且有多個可選使用者時，才顯示下拉選單 -->
		<select name="user" id="user" class="form-select" bind:value={selectedUser}>
			{#each borrowableUsers as user}
				<option value={user.id} selected={user.id === currentUser?.id}>
					{user.name || user.email}
				</option>
			{/each}
		</select>
	{:else}
		<!-- 編輯模式或只有單一使用者時，顯示為不可編輯的欄位 -->
		<input type="hidden" name="user" value={selectedUser} />
		<input
			type="text"
			class="form-control"
			value={borrowRecord?.expand?.user?.name || currentUser?.name || '未知使用者'}
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
		use:flatpickr={flatpickrOptions}
		required
	/>
</div>

<!-- 事由 -->
<div class="mb-3">
	<label for="remark" class="form-label fw-bold">事由 <span class="text-danger">*</span></label>
	<textarea
		class="form-control"
		id="remark"
		name="remark"
		rows="5"
		required
		placeholder="請填寫借用事由，例如：專案開發、客戶展示..."
		bind:value={remark}
	></textarea>
</div>

<!-- 上傳圖片 (僅在新增模式下顯示) -->
{#if !borrowRecord}
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
{/if}