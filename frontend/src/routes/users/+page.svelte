<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { pb } from '$lib/pocketbase';
	import type { PageData } from './$types';
	import { formatDate } from '$lib/utils/datetime';

	let { data } = $props<{ data: PageData }>();

	let { users } = $derived(data);
</script>

<svelte:head>
	<title>使用者管理 | Asset Management</title>
</svelte:head>

<div class="min-vh-100 pb-5">
	<div class="container-fluid px-sm-4">
		<Navbar />

		<div class="card shadow-sm bg-white bg-opacity-90 mt-4 border-primary">
			<div class="card-header bg-primary bg-opacity-10 py-3 d-flex justify-content-between align-items-center">
				<h5 class="card-title mb-0 fw-bold text-primary-emphasis">
					<i class="mdi mdi-account-group me-2"></i>使用者管理
				</h5>
				<!-- <a href="/users/add" class="btn btn-primary btn-sm">
						<i class="mdi mdi-plus me-1"></i> 新增使用者
					</a> -->
			</div>

			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light text-secondary small">
							<tr>
								<th class="ps-4 py-3">名稱</th>
								<th class="py-3">Email</th>
								<th class="py-3">角色</th>
								<th class="py-3">建立時間</th>
								<th class="pe-4 py-3 text-end">操作</th>
							</tr>
						</thead>
						<tbody>
							{#if !users || users.length === 0}
								<tr>
									<td colspan="5" class="text-center py-5">
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
														src={pb.files.getURL(user, user.avatar)}
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
										<td>
											{#if user.role && user.role.length > 0}
												{#each user.role as r}
													<span class="badge bg-primary bg-opacity-10 text-primary fw-medium"
														>{r}</span
													>
												{/each}
											{:else}
												<span class="badge bg-secondary bg-opacity-10 text-secondary">無</span
												>
											{/if}
										</td>
										<td class="text-nowrap">
											{formatDate(user.created)}
										</td>
										<td class="pe-4 text-end">
											<!-- <a href="/users/{user.id}/edit" class="btn btn-sm btn-outline-primary">編輯</a> -->
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