<script>
	import '../styles/global.css';
	import '../styles/tooplate.css';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, getCurrentUser } from '$lib/services/userService';

	// 導出 currentUser 供子組件使用
	export let currentUser = null;

	onMount(async () => {
		// 動態導入 Bootstrap JS，只在客戶端執行
		await import('bootstrap/dist/js/bootstrap.bundle.min.js');

		// 登入保護：檢查是否在需要登入的頁面
		// 除了登入頁面本身，其他所有頁面都需要登入
		const currentPath = window.location.pathname;

		if (currentPath !== '/login' && !isAuthenticated()) {
			goto('/login');
		} else if (isAuthenticated()) {
			currentUser = getCurrentUser();
		}
	});
</script>

<slot />
