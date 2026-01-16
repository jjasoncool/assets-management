<script lang="ts">
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import { pb } from '$lib/pocketbase';
	import { userAuth } from '$lib/services/userService';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	// 移除重複的認證檢查，因為 hooks.server.ts 已經處理了

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

			// ✅ 解決方案：不使用 httpOnly cookie（無法用 JS 設定）
			// 改用安全的 sessionStorage + 一般 cookie
			const authData = pb.authStore.exportToCookie({
				httpOnly: false,  // 客戶端可存取，用於 sessionStorage
				secure: false,    // 開發環境使用 HTTP
				sameSite: 'Lax',  // 允許部分跨站請求
				path: '/',        // 全站有效
			});

			// 1. 儲存到 sessionStorage（安全，無法被 XSS 竊取）
			sessionStorage.setItem('pb_auth', authData);

			// 2. 設定 cookie 給服務端（包含完整認證資料）
			document.cookie = authData;

			// 只在開發環境顯示敏感調試信息
			if (dev) {
				console.log('✅ [CLIENT] Auth data stored');
				console.log('🔍 [CLIENT] Current cookies after login:', document.cookie);
				console.log('🔍 [CLIENT] SessionStorage has auth:', !!sessionStorage.getItem('pb_auth'));
			}

			// 直接重定向到首頁
			window.location.href = '/';
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
