<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { page } from '$app/stores';

	let { form } = $props<{ form: ActionData }>();

	let loading = $state(false);
	// 新增：前端自己的錯誤訊息狀態
	let clientError = $state('');

	// 檢查 URL 中是否帶有 reset=success 參數
	const showResetSuccess = $derived($page.url.searchParams.get('reset') === 'success');

	// 保留您原本的驗證邏輯
	function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="login-page">
	<div class="middle-background"></div>
	<div class="login-form-wrapper">
		<div class="container-xl">
			<div class="row">
				<div class="col-12 mx-auto tm-login-col">
					<div class="tm-block">
						<div class="row">
							<div class="col-12 text-center">
								<i class="mdi mdi-view-dashboard" style="font-size: 3rem;"></i>
								<h2 class="tm-block-title mt-3">Login</h2>
							</div>
						</div>
						<div class="row mt-2">
							<div class="col-12">
								<!-- 密碼重設成功提示訊息 -->
								{#if showResetSuccess}
									<div class="alert alert-success text-dark text-center small py-2">
										<i class="mdi mdi-check-circle-outline"></i>
										密碼已成功重設，請使用您的新密碼登入。
									</div>
								{/if}

								<form
									method="POST"
									action="?/login"
									class="tm-login-form"
									use:enhance={({ formData, cancel }) => {
										// 1. 清除舊錯誤
										clientError = '';

										// 2. 獲取表單資料
										const email = formData.get('email') as string;
										const password = formData.get('password') as string;

										// 3. 執行您原本的前端驗證邏輯
										if (!email || !password) {
											clientError = '請輸入郵箱和密碼';
											cancel(); // 阻止提交到 Server
											return;
										}

										if (!validateEmail(email)) {
											clientError = '請輸入有效的郵箱地址';
											cancel();
											return;
										}

										if (password.length < 6) {
											clientError = '密碼長度至少需要6個字符';
											cancel();
											return;
										}

										// 4. 通過驗證，設定 Loading
										loading = true;

										return async ({ update }) => {
											loading = false;
											await update();
										};
									}}
								>
									<div class="input-group">
										<label
											for="email"
											class="col-xl-4 col-lg-4 col-md-4 col-form-label d-none d-md-block"
											>Email</label
										>
										<input
											name="email"
											type="email"
											class="form-control validate col-12 col-md-8 col-lg-8 col-xl-9"
											id="email"
											value={form?.email ?? ''}
											placeholder="Email"
											required
										/>
									</div>
									<div class="input-group mt-3">
										<label
											for="password"
											class="col-xl-4 col-lg-4 col-md-4 col-form-label d-none d-md-block"
											>Password</label
										>
										<input
											name="password"
											type="password"
											class="form-control validate col-12 col-md-8 col-lg-8 col-xl-8"
											id="password"
											placeholder="Password"
											required
										/>
									</div>
									<div class="input-group mt-3">
										<button
											type="submit"
											class="btn btn-primary d-inline-block mx-auto"
											disabled={loading}
										>
											{#if loading}
												<i class="mdi mdi-loading mdi-spin me-2"></i>Login...
											{:else}
												Login
											{/if}
										</button>
									</div>

									{#if clientError || form?.error}
										<div class="input-group mt-3">
											<p class="text-danger"><em>{clientError || form?.error}</em></p>
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
			<footer class="row">
				<div class="col-12 font-weight-light text-center">
					<p class="d-inline-block tm-bg-black text-white py-2 px-4">
						Copyright &copy;
						2018 Admin Dashboard . Created by
						<a rel="nofollow" href="https://www.tooplate.com" class="text-white tm-footer-link"
							>Tooplate</a
						>
					</p>
				</div>
			</footer>
		</div>
	</div>
</div>

<style>
	.login-page {
		display: grid;
		place-items: center;
		min-height: 100vh;
		background: url(/img/dash-bg-01.jpg) center/cover no-repeat;
		padding: 2rem;
	}
	.middle-background,
	.login-form-wrapper {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		width: 100%;
	}
	.middle-background {
		height: 60vh;
		max-width: 1400px;
		margin: 0 auto;
		border-radius: 1rem;
		position: relative;
		overflow: hidden;
		z-index: 0;
	}
	.middle-background::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: url(/img/dash-bg-03.jpg) center/cover no-repeat;
		opacity: 0.7;
		z-index: -1;
	}
	.login-form-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		z-index: 1;
	}
	.tm-block {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}
	.tm-block h2,
	.tm-block label,
	.tm-block p,
	.tm-block i {
		color: white;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}
	.tm-block label,
	.tm-block p {
		font-weight: bold;
	}
	.tm-block h2 {
		font-weight: 600;
	}
</style>