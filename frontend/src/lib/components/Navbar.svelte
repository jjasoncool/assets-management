<script lang="ts">
export let handleLogout: () => void;
export let currentUser: any;
</script>

<nav class="navbar navbar-expand-xl navbar-light bg-light">
    <a class="navbar-brand" href="#">
        <i class="fas fa-3x fa-tachometer-alt tm-site-icon"></i>
        <h1 class="tm-site-title mb-0">Dashboard</h1>
    </a>
    <button class="navbar-toggler ms-auto me-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
        aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mx-auto">
            <li class="nav-item">
                <a class="nav-link active" href="#">Dashboard
                    <span class="sr-only">(current)</span>
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Reports
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#">Daily Report</a></li>
                    <li><a class="dropdown-item" href="#">Weekly Report</a></li>
                    <li><a class="dropdown-item" href="#">Yearly Report</a></li>
                </ul>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="products.html">Products</a>
            </li>

            <li class="nav-item">
                <a class="nav-link" href="accounts.html">Accounts</a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown2" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Settings
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#">Profile</a></li>
                    <li><a class="dropdown-item" href="#">Billing</a></li>
                    <li><a class="dropdown-item" href="#">Customize</a></li>
                </ul>
            </li>
        </ul>
        <ul class="navbar-nav">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="far fa-user me-2 tm-logout-icon"></i>
                    <span>{currentUser?.email || 'User'}</span>
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="/login" on:click={handleLogout}>
                        <i class="fas fa-sign-out-alt mr-2"></i>
                        Logout
                    </a></li>
                </ul>
            </li>
        </ul>
    </div>
</nav>
