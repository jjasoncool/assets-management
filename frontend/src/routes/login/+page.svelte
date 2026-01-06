<script lang="ts">
	import { goto } from '$app/navigation';
	import { userAuth } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { isAuthenticated } from '$lib/pocketbase';

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

	async function handleLogin() {
		if (!email || !password) {
			error = '請輸入郵箱和密碼';
			return;
		}

		loading = true;
		error = '';

		try {
			await userAuth(email, password);
			goto('/');
		} catch (err: any) {
			error = err.message || '登入失敗，請檢查郵箱和密碼';
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg03">
	<div class="container">
		<div class="row tm-mt-big">
			<div class="col-12 mx-auto tm-login-col">
				<div class="bg-white tm-block">
					<div class="row">
						<div class="col-12 text-center">
							<i class="fas fa-3x fa-tachometer-alt tm-site-icon text-center"></i>
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
											<i class="fas fa-spinner fa-spin mr-2"></i>Login...
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
