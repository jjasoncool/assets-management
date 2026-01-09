<script lang="ts">
export let handleLogout: () => void;
export let currentUser: any;
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center" href="/">
            <i class="fas fa-tachometer-alt me-2"></i>
            <span class="fw-bold">Asset Management</span>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="/">Dashboard</a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Reports
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                        <li><a class="dropdown-item" href="#">Daily Report</a></li>
                        <li><a class="dropdown-item" href="#">Weekly Report</a></li>
                        <li><a class="dropdown-item" href="#">Yearly Report</a></li>
                    </ul>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="products.html">Products</a>
                </li>
            </ul>

            <ul class="navbar-nav">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="far fa-user me-2"></i>
                    <span class="d-inline-block text-truncate" style="max-width: 200px; min-width: 120px;">{currentUser?.email || 'User'}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="/profile">
                            <i class="fas fa-user me-2"></i>Profile
                        </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="/login" on:click={handleLogout}>
                            <i class="fas fa-sign-out-alt me-2"></i>Logout
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
