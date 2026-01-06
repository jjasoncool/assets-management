<script lang="ts">
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { isAuthenticated, getCurrentUser, logout } from '$lib/pocketbase';

let currentUser: any = null;

onMount(() => {
  if (!isAuthenticated()) {
    goto('/login');
  } else {
    currentUser = getCurrentUser();
  }
});

function handleLogout() {
  logout();
  goto('/login');
}
</script>

{#if isAuthenticated() && currentUser}
<div class="container">
<h1>儀表板</h1>
<p>使用者 email {currentUser.email} 已登入</p>
<button class="btn btn-danger mt-3" on:click={handleLogout}>登出</button>
</div>
{:else}
<div class="container">
<p>正在檢查登入狀態...</p>
</div>
{/if}
