<script>
	import '../styles/global.css';
	import '../styles/tooplate.css';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { onMount } from 'svelte';

	onMount(async () => {
		// 動態導入 Bootstrap JS，只在客戶端執行
		await import('bootstrap/dist/js/bootstrap.bundle.min.js');
	});
</script>

<slot />
