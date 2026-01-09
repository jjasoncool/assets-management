<script>
	import '../styles/global.css';
	import '../styles/tooplate.css';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { isAuthenticated, getCurrentUser } from '$lib/services/userService';
	import { bs, Swal } from '$lib/stores';

	// 導出 currentUser 供子組件使用
	export let currentUser = null;

	onMount(async () => {
		// 登入保護：檢查是否在需要登入的頁面
		// 除了登入頁面本身，其他所有頁面都需要登入
		const currentPath = window.location.pathname;

		if (currentPath !== '/login' && !isAuthenticated()) {
			goto('/login');
		} else if (isAuthenticated()) {
			currentUser = getCurrentUser();
		}

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
