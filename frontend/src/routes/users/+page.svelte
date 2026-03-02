<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { pb } from '$lib/pocketbase';
	import type { ActionData, PageData } from './$types';
	import { formatDate } from '$lib/utils/datetime';
	import type { User } from '$lib/types';
	import { enhance } from '$app/forms';

	let { data } = $props<{ data: PageData }>();
	// 修正 #1: ActionData 在初始時可能為 undefined
	let form: ActionData | undefined = $state();

	let users = $derived(data.users as User[]);

	// 用於追蹤每個使用者重設密碼按鈕的狀態
	// key: userId, value: { sending: boolean, sent: boolean }
	let resetStatus = $state<Record<string, { sending: boolean; sent: boolean }>>({});

	// 初始化所有按鈕狀態
	$effect(() => {
		users.forEach((user) => {
			if (!resetStatus[user.id]) {
				resetStatus[user.id] = { sending: false, sent: false };
			}
		});
	});
</script>

<svelte:head>
	<title>使用者管理 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-sm-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-primary">
			<div
				class="card-header bg-primary bg-opacity-10 py-3 d-flex justify-content-between align-items-center"
			>
				<h5 class="card-title mb-0 fw-bold text-primary-emphasis">
					<i class="mdi mdi-account-group me-2"></i>使用者管理
				</h5>
				<a href="/users/add" class="btn btn-primary btn-sm">
					<i class="mdi mdi-plus me-1"></i> 新增使用者
				</a>
			</div>

			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light text-secondary small">
							<tr>
								<th class="ps-4 py-3">名稱</th>
								<th class="py-3">Email</th>
								<th class="py-3">部門</th>
								<th class="py-3">角色</th>
								<th class="py-3">建立時間</th>
								<th class="py-3">最後修改</th>
								<th class="pe-4 py-3 text-end">操作</th>
							</tr>
						</thead>
						<tbody>
							{#if !users || users.length === 0}
								<tr>
									<td colspan="7" class="text-center py-5">
										<div class="text-muted opacity-50 mb-2">
											<i class="mdi mdi-account-multiple-outline fs-1"></i>
										</div>
										<p class="text-muted fw-medium mb-0">沒有找到使用者資料</p>
									</td>
								</tr>
							{:else}
								{#each users as user (user.id)}
									<tr>
										<td class="ps-4">
											<div class="d-flex align-items-center">
												{#if user.avatar}
													<img
														src={pb.files.getURL(user, user.avatar, {
															thumb: '100x100'
														})}
														alt={user.name}
														class="rounded-circle me-2"
														width="32"
														height="32"
													/>
												{:else}
													<div
														class="rounded-circle me-2 bg-light d-flex align-items-center justify-content-center"
														style="width: 32px; height: 32px;"
													>
														<i class="mdi mdi-account"></i>
													</div>
												{/if}
												<span class="fw-bold">{user.name}</span>
											</div>
										</td>
										<td class="font-monospace text-muted">{user.email}</td>
										<td>{user.department || '-'}</td>
										<td>
											{#if user.role && user.role.length > 0}
												{#each user.role as r}
													<span
														class="badge bg-primary bg-opacity-10 text-primary fw-medium"
														>{r}</span
													>
												{/each}
											{:else}
												<span class="badge bg-secondary bg-opacity-10 text-secondary"
													>無</span
												>
											{/if}
										</td>
										<td class="text-nowrap">
											{formatDate(user.created)}
										</td>
										<td class="text-nowrap">
											{user.expand?.modified_by?.name || '-'}
											<div class="small text-muted">{formatDate(user.updated)}</div>
										</td>
										<td class="pe-4 text-end">
											<a
												href="/users/{user.id}/edit"
												class="btn btn-sm btn-outline-primary">編輯</a
											>
											<form
												method="POST"
												action="?/resetPassword"
												class="d-inline-block ms-1"
												use:enhance={() => {
													// 表單提交前，將按鈕設為發送中狀態
													resetStatus[user.id].sending = true;

													return async ({ result }) => {
														// 表單提交完成後，結束發送中狀態
														resetStatus[user.id].sending = false;

														// 修正 #2: 必須先檢查 result.type 才能安全地存取 data
														if (result.type === 'success' || result.type === 'failure') {
															// 修正 #3: 使用類型斷言，告訴 TS result.data 的具體形狀
															form = result.data as ActionData;

															// 如果後端操作成功，將按鈕設為「已發送」狀態
															if (form?.success) {
																resetStatus[user.id].sent = true;
																// 3 秒後恢復按鈕，以便再次操作
																setTimeout(() => {
																	resetStatus[user.id].sent = false;
																}, 3000);
															}
														}
													};
												}}
											>
												<input type="hidden" name="email" value={user.email} />
												<button
													type="submit"
													class="btn btn-sm btn-outline-secondary"
													disabled={resetStatus[user.id]?.sending ||
														resetStatus[user.id]?.sent}
												>
													{#if resetStatus[user.id]?.sending}
														<span
															class="spinner-border spinner-border-sm"
															aria-hidden="true"
														></span>
														<span class="visually-hidden" role="status">發送中...</span>
													{:else if resetStatus[user.id]?.sent}
														<i class="mdi mdi-check-all"></i>
														已發送
													{:else}
														<i class="mdi mdi-email-fast-outline"></i>
														重設密碼
													{/if}
												</button>
											</form>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>