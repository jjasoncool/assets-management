<script>
    import { page } from '$app/stores';
</script>

<svelte:head>
    <title>Error</title>
</svelte:head>

<div class="error-page-wrapper">
    <div class="container">
        <div class="row">
            <div class="col-12 mx-auto tm-login-col">
                <div class="tm-block">
                    <div class="row">
                        <div class="col-12 text-center">
                            <i class="mdi mdi-alert-circle-outline" style="font-size: 3rem; color: white;"></i>
                            <h2 class="tm-block-title mt-3">Error {$page.status}</h2>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-12 text-center">
                            {#if $page.error?.message}
                                <p style="color: white;">{$page.error.message}</p>
                            {/if}
                            <a href="/" class="btn btn-primary mt-3">Go to Homepage</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .error-page-wrapper {
        display: grid;
        place-items: center;
        min-height: 100vh;
        background: url(/img/dash-bg-01.jpg) center/cover no-repeat;
        padding: 2rem;
    }
    .tm-block {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        padding: 2rem;
    }
    .tm-block-title {
        color: white;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }
</style>
