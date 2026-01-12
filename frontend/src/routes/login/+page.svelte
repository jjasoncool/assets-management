<script lang="ts">
	import { goto } from '$app/navigation';
	import { userAuth, isAuthenticated } from '$lib/services/userService';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	onMount(() => {
		// 如果已經登入，重定向到儀表板
		if (isAuthenticated()) {
			goto('/');
		}
	});

	// Email 格式驗證
	function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	async function handleLogin() {
		// 增強輸入驗證
		if (!email || !password) {
			error = '請輸入郵箱和密碼';
			return;
		}

		if (!validateEmail(email)) {
			error = '請輸入有效的郵箱地址';
			return;
		}

		if (password.length < 6) {
			error = '密碼長度至少需要6個字符';
			return;
		}

		loading = true;
		error = '';

		try {
			await userAuth(email, password);
			goto('/');
		} catch (err: any) {
			// 模糊化錯誤信息，避免洩露具體錯誤
			error = '登入失敗，請檢查您的登入資訊';
			console.error('Login error:', err); // 保留詳細錯誤給開發者
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg03">
	<div class="container-xl">
		<div class="row tm-mt-big">
			<div class="col-12 mx-auto tm-login-col">
				<div class="bg-white tm-block">
					<div class="row">
						<div class="col-12 text-center">
							<i class="mdi mdi-view-dashboard" style="font-size: 3rem;"></i>
							<h2 class="tm-block-title mt-3">Login</h2>
						</div>
					</div>
					<div class="row mt-2">
						<div class="col-12">
							<form method="post" on:submit|preventDefault={handleLogin} class="tm-login-form">
								<div class="input-group">
									<label for="email" class="col-xl-4 col-lg-4 col-md-4 col-sm-5 col-form-label">Email</label>
									<input
										name="email"
										type="email"
										class="form-control validate col-xl-9 col-lg-8 col-md-8 col-sm-7"
										id="email"
										bind:value={email}
										required
									/>
								</div>
								<div class="input-group mt-3">
									<label for="password" class="col-xl-4 col-lg-4 col-md-4 col-sm-5 col-form-label">Password</label>
									<input
										name="password"
										type="password"
										class="form-control validate"
										id="password"
										bind:value={password}
										required
									/>
								</div>
								<div class="input-group mt-3">
									<button type="submit" class="btn btn-primary d-inline-block mx-auto" disabled={loading}>
										{#if loading}
											<i class="mdi mdi-loading mdi-spin me-2"></i>Login...
										{:else}
											Login
										{/if}
									</button>
								</div>
								{#if error}
									<div class="input-group mt-3">
										<p class="text-danger"><em>{error}</em></p>
									</div>
								{/if}
								<div class="input-group mt-3">
									<p><em>Enter your credentials to login.</em></p>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
		<footer class="row tm-mt-big">
			<div class="col-12 font-weight-light text-center">
				<p class="d-inline-block tm-bg-black text-white py-2 px-4">
					Copyright &copy; 2018 Admin Dashboard . Created by
					<a rel="nofollow" href="https://www.tooplate.com" class="text-white tm-footer-link">Tooplate</a>
				</p>
			</div>
		</footer>
	</div>
</div>

<style>
</style>
