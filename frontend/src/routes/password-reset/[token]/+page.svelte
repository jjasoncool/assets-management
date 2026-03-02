<script lang="ts">
    import { enhance } from '$app/forms';

    let { data, form } = $props();

    // 用於控制按鈕的載入狀態
    let isLoading = $state(false);
</script>

<svelte:head>
    <title>重設密碼 | Asset Management</title>
</svelte:head>

<div class="container">
    <div class="row justify-content-center align-items-center min-vh-100">
        <div class="col-md-6 col-lg-5 col-xl-4">
            <div class="card shadow-sm border-0">
                <div class="card-body p-4 p-sm-5">
                    <div class="text-center mb-4">
                        <i class="mdi mdi-lock-reset fs-1 text-primary"></i>
                        <h3 class="card-title text-center mt-2 mb-0">重設您的密碼</h3>
                        <p class="text-muted small mt-1">請輸入您的新密碼</p>
                    </div>

                    <form
                        method="POST"
                        use:enhance={() => {
                            isLoading = true;
                            // 表單提交完成後執行的回呼，解構出 update 函數
                            return async ({ update }) => {
                                isLoading = false;
                                // 必須呼叫 update()，SvelteKit 才會接手處理伺服器回傳的 redirect 或 form 錯誤更新
                                await update();
                            };
                        }}
                    >
                        <input type="hidden" name="token" value={data.token} />

                        <div class="mb-3">
                            <label for="password" class="form-label fw-medium">新密碼</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                class="form-control"
                                placeholder="請輸入新密碼"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label for="passwordConfirm" class="form-label fw-medium">確認新密碼</label>
                            <input
                                type="password"
                                id="passwordConfirm"
                                name="passwordConfirm"
                                class="form-control"
                                placeholder="請再次輸入新密碼"
                                required
                            />
                        </div>

						<!-- 如果後端回傳錯誤訊息，則顯示提示框 -->
						<!-- 改為讀取 form prop 來顯示 action 的回傳資料 -->
                        {#if form?.error}
                            <div class="alert alert-danger small py-2" role="alert">
                                <i class="mdi mdi-alert-circle-outline me-1"></i>
                                {form.message}
                            </div>
                        {/if}

                        <div class="d-grid mt-4">
                            <button type="submit" class="btn btn-primary" disabled={isLoading}>
                                {#if isLoading}
                                    <span
                                        class="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                    處理中...
                                {:else}
                                    <i class="mdi mdi-check-circle-outline me-1"></i>
                                    確認重設密碼
                                {/if}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <div class="text-center mt-3">
                <a href="/login" class="text-decoration-none text-muted small">
                    <i class="mdi mdi-arrow-left me-1"></i>返回登入
                </a>
            </div>
        </div>
    </div>
</div>
