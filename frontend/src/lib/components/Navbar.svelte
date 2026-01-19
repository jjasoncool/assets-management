<script lang="ts">
import { pb } from '../pocketbase';

export let handleLogout: () => void;
export let currentUser: any;
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center" href="/">
            <i class="mdi mdi-office-building me-2"></i>
            <span class="fw-bold">Asset Management</span>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="/"><i class="mdi mdi-view-dashboard me-1"></i>Dashboard</a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="assetsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="mdi mdi-package-variant-closed me-1"></i>資產管理
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="assetsDropdown">
                        <li><a class="dropdown-item" href="/assets"><i class="mdi mdi-format-list-bulleted me-2"></i>資產清單</a></li>
                        <li><a class="dropdown-item" href="/assets/add"><i class="mdi mdi-plus me-2"></i>新增資產</a></li>
                    </ul>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="borrowDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="mdi mdi-hand-heart me-1"></i>借用管理
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="borrowDropdown">
                        <li><a class="dropdown-item" href="/borrow/requests"><i class="mdi mdi-clipboard-plus me-2"></i>借用請求</a></li>
                        <li><a class="dropdown-item" href="/borrow/my"><i class="mdi mdi-account-clock me-2"></i>我的借用</a></li>
                        <li><a class="dropdown-item" href="/return"><i class="mdi mdi-undo-variant me-2"></i>歸還資產</a></li>
                    </ul>
                </li>
            </ul>

            <ul class="navbar-nav">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    {#if currentUser?.avatar && currentUser.avatar !== ''}
                        <img src="{pb.files.getURL(currentUser, currentUser.avatar)}" alt="Avatar" class="rounded-circle me-2" style="width: 24px; height: 24px; object-fit: cover;">
                    {:else}
                        <i class="mdi mdi-account-outline" style="font-size: 1.2rem;"></i>
                    {/if}
                    <span class="d-inline-block text-truncate" style="max-width: 200px; min-width: 120px;">{currentUser?.email || 'User'}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="/profile">
                            <i class="mdi mdi-account me-2"></i>Profile
                        </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="/login" on:click={handleLogout}>
                            <i class="mdi mdi-logout me-2"></i>Logout
                        </a></li>
                </ul>
            </li>
            </ul>
        </div>
    </div>
</nav>

<style>
.navbar-brand {
    font-size: 1.25rem;
}
</style>
