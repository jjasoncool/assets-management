<script lang="ts">
	import { page } from '$app/stores';
	import { pb } from '../pocketbase';

	// Svelte 5: 使用 $derived 獲取當前頁面資料中的 currentUser
	let currentUser = $derived($page.data.currentUser);
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<div class="container-fluid">
		<a class="navbar-brand d-flex align-items-center" href="/">
			<i class="mdi mdi-office-building me-2"></i>
			<span class="fw-bold">Asset Management</span>
		</a>

		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#navbarNav"
			aria-controls="navbarNav"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>

		<div class="collapse navbar-collapse" id="navbarNav">
			<ul class="navbar-nav me-auto mb-2 mb-lg-0">
				<li class="nav-item">
					<a
						class="nav-link"
						class:active={$page.url.pathname === '/'}
						aria-current="page"
						href="/"
						><i class="mdi mdi-view-dashboard me-1"></i>Dashboard</a
					>
				</li>
				<li class="nav-item dropdown">
					<a
						class="nav-link dropdown-toggle"
						class:active={$page.url.pathname.startsWith('/assets') ||
							$page.url.pathname.startsWith('/asset-categories')}
						href="#!"
						id="assetsDropdown"
						role="button"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						<i class="mdi mdi-package-variant-closed me-1"></i>資產管理
					</a>
					<ul class="dropdown-menu" aria-labelledby="assetsDropdown">
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname.startsWith('/assets')}
								href="/assets"
								><i class="mdi mdi-format-list-bulleted me-2"></i>資產清單</a
							>
						</li>
						{#if currentUser?.role?.includes('admin')}
							<li>
								<a
									class="dropdown-item"
									class:active={$page.url.pathname.startsWith('/asset-categories')}
									href="/asset-categories"
									><i class="mdi mdi-shape me-2"></i>資產類別管理</a
								>
							</li>
						{/if}
					</ul>
				</li>
				<li class="nav-item dropdown">
					<a
						class="nav-link dropdown-toggle"
						class:active={$page.url.pathname.startsWith('/borrow') ||
							$page.url.pathname === '/return'}
						href="#!"
						id="borrowDropdown"
						role="button"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						<i class="mdi mdi-hand-heart me-1"></i>借用管理
					</a>
					<ul class="dropdown-menu" aria-labelledby="borrowDropdown">
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname.startsWith('/borrow')}
								href="/borrow/list"
								><i class="mdi mdi-account-clock me-2"></i>已借用清單</a
							>
						</li>
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/return'}
								href="/return"
								><i class="mdi mdi-undo-variant me-2"></i>歸還資產</a
							>
						</li>
					</ul>
				</li>
				<li class="nav-item dropdown">
					<a
						class="nav-link dropdown-toggle"
						class:active={$page.url.pathname.startsWith('/maintenance')}
						href="#!"
						id="maintenanceDropdown"
						role="button"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						<i class="mdi mdi-wrench me-1"></i>資產維護
					</a>
					<ul class="dropdown-menu" aria-labelledby="maintenanceDropdown">
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/maintenance'}
								href="/maintenance"
								><i class="mdi mdi-history me-2"></i>維護紀錄總覽</a
							>
						</li>
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/maintenance/create'}
								href="/maintenance/create"
								><i class="mdi mdi-plus-box-outline me-2"></i>填寫維護單</a
							>
						</li>
						<li><hr class="dropdown-divider" /></li>
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/maintenance/in-progress'}
								href="/maintenance/in-progress"
							>
								<i class="mdi mdi-progress-wrench me-2"></i>維修進行中
							</a>
						</li>
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/maintenance/stats'}
								href="/maintenance/stats"
								><i class="mdi mdi-finance me-2"></i>維護成本分析</a
							>
						</li>
					</ul>
				</li>
			</ul>

			<ul class="navbar-nav">
				<li class="nav-item dropdown">
					<a
						class="nav-link dropdown-toggle d-flex align-items-center"
						class:active={$page.url.pathname === '/profile'}
						href="#!"
						id="userDropdown"
						role="button"
						data-bs-toggle="dropdown"
						aria-expanded="false"
					>
						{#if currentUser?.avatar && currentUser.avatar !== ''}
							<img
								src={pb.files.getURL(currentUser, currentUser.avatar)}
								alt="Avatar"
								class="rounded-circle me-2"
								style="width: 24px; height: 24px; object-fit: cover;"
							/>
						{:else}
							<i class="mdi mdi-account-outline" style="font-size: 1.2rem;"></i>
						{/if}
						<span class="d-inline-block text-truncate" style="max-width: 200px; min-width: 120px;"
							>{currentUser?.email || 'User'}</span
						>
					</a>
					<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
						<li>
							<a
								class="dropdown-item"
								class:active={$page.url.pathname === '/profile'}
								href="/profile"
							>
								<i class="mdi mdi-account me-2"></i>Profile
							</a>
						</li>
						<li><hr class="dropdown-divider" /></li>
						<li>
							<form action="/logout" method="POST" style="margin: 0;">
								<button
									type="submit"
									class="dropdown-item text-danger border-0 bg-transparent"
									style="width: 100%; text-align: left;"
								>
									<i class="mdi mdi-logout me-2"></i>Logout
								</button>
							</form>
						</li>
					</ul>
				</li>
			</ul>
		</div>
	</div>
</nav>

<style>
	.navbar-brand {
		font-size: 1.25rem;
	}
</style>