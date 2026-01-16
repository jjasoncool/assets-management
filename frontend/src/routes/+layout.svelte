<script lang="ts">
	import '../styles/global.css';
	import '../styles/tooplate.css';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import '@mdi/font/css/materialdesignicons.min.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { pb } from '$lib/pocketbase';
	import { isAuthenticated, getCurrentUser } from '$lib/services/userService';
	import { bs, Swal } from '$lib/stores';
	import { page } from '$app/stores';

	// 導出 currentUser 供子組件使用
	export let currentUser: any = null;

	// 立即嘗試從 sessionStorage 恢復認證狀態（同步執行）
	const authData = typeof sessionStorage !== 'undefined' ?
		sessionStorage.getItem('pb_auth') : null;
	if (authData && !pb.authStore.isValid) {
		try {
			pb.authStore.loadFromCookie(authData);
		} catch (error) {
			console.warn('Failed to load auth from sessionStorage:', error);
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('pb_auth');
			}
		}
	}

	// 從 page store 獲取服務端驗證的用戶資料
	$: if ($page.data?.currentUser) {
		currentUser = $page.data.currentUser;
	} else if (!currentUser && pb.authStore.isValid) {
		// 如果沒有 page data 但 authStore 有效，使用 authStore 的資料
		currentUser = pb.authStore.model;
	}

	onMount(async () => {
		// onMount 中不需要額外處理，已經在上面同步處理了

		// 動態載入 Bootstrap 和 SweetAlert2
		if (browser) {
			const [bootstrapModule, sweetalert2Module] = await Promise.all([
				import('bootstrap'),
				import('sweetalert2')
			]);
			bs.set(bootstrapModule);
			Swal.set(sweetalert2Module.default);
		}
	});
</script>

<slot />
