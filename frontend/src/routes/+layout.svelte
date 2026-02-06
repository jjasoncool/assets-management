<script lang="ts">
    import '../styles/global.css';
    import '../styles/tooplate.css';
    import 'bootstrap/dist/css/bootstrap.min.css';
    import '@mdi/font/css/materialdesignicons.min.css';
    import 'tom-select/dist/css/tom-select.bootstrap5.css';

    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { pb } from '$lib/pocketbase';
    import { bs, Swal } from '$lib/stores';

    // 1. Svelte 5: 使用 $props 接收 server 傳來的資料
    let { data, children } = $props<{
        data: { currentUser: any, token: string },
        children: any
    }>();

    // 2. Svelte 5: 使用 $effect 替代 $:
    // 這是 "Hydration" (注水) 過程：
    // 伺服器從 httpOnly Cookie 讀出 Token -> 傳給前端 -> 前端設定給 pb SDK
    $effect(() => {
        if (browser && data.token && data.currentUser) {
            // 讓前端的 pb 實例知道現在是誰登入
            // 這樣在前端 call pb.files.getUrl() 時才會有正確的權限
            pb.authStore.save(data.token, data.currentUser);
        } else if (browser) {
            pb.authStore.clear();
        }
    });

    onMount(async () => {
        // 動態載入 UI 庫
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

{@render children()}