<script lang="ts">
    import { enhance } from '$app/forms';
    import { pb } from '$lib/pocketbase';
    import Navbar from '$lib/components/Navbar.svelte';
    import { bs, Swal } from '$lib/stores';
    import type { ActionData, PageData } from './$types';

    // 1. 接收 Server 傳來的資料
    let { data, form } = $props<{ data: PageData, form: ActionData }>();

    // 使用 $derived 讓 currentUser 會隨資料更新而變動
    let currentUser = $derived(data.user);

    // Store 訂閱
    let bsInstance: any = null;
    let SwalInstance: any = null;
    bs.subscribe(value => bsInstance = value);
    Swal.subscribe(value => SwalInstance = value);

    // 狀態變數
    let isUpdatingProfile = $state(false);
    let isUpdatingAvatar = $state(false);
    let isChangingPassword = $state(false);

    // 頭像相關
    let selectedAvatar: File | null = $state(null);
    let avatarPreview: string | null = $state(null);
    let removeAvatar = $state(false);
    let fileInput: HTMLInputElement;

    // 密碼相關
    let oldPassword = $state('');
    let newPassword = $state('');
    let confirmPassword = $state('');

    // --- 邏輯函數 ---

    // 處理頭像選擇
    function handleAvatarSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            SwalInstance?.fire('錯誤', '無效的文件類型', 'error');
            target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            SwalInstance?.fire('錯誤', '圖片大小不能超過 5MB', 'error');
            target.value = '';
            return;
        }

        selectedAvatar = file;
        const reader = new FileReader();
        reader.onload = (e) => { avatarPreview = e.target?.result as string; };
        reader.readAsDataURL(file);
        removeAvatar = false;
    }

    function handleRemovePreview() {
        removeAvatar = true;
        selectedAvatar = null;
        avatarPreview = null;
        if (fileInput) fileInput.value = '';
    }
</script>

<style>
    .position-relative .btn:hover { filter: brightness(1.1); }
</style>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar />

        <div class="row g-4">
            <div class="col-12 col-lg-8">
                <div class="row g-4">
                    <div class="col-12 col-lg-6">
                        <div class="card shadow-sm bg-white bg-opacity-90">
                            <div class="card-header bg-white bg-opacity-90">
                                <h5 class="card-title mb-0 fw-bold">個人資料</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <strong class="text-muted">姓名:</strong>
                                    <div>{currentUser?.name || '未設定'}</div>
                                </div>
                                <div class="mb-3">
                                    <strong class="text-muted">信箱:</strong>
                                    <div>{currentUser?.email || '未設定'}</div>
                                </div>
                                <div class="mb-3">
                                    <strong class="text-muted">部門:</strong>
                                    <div>{currentUser?.department || '未設定'}</div>
                                </div>
                                <div class="mb-3">
                                    <strong class="text-muted">建立時間:</strong>
                                    <div>{currentUser?.created ? new Date(currentUser.created).toLocaleDateString('zh-TW') : '未設定'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-6">
                        <div class="card shadow-sm bg-white bg-opacity-90">
                            <div class="card-header bg-white bg-opacity-90">
                                <h5 class="card-title mb-0 fw-bold">編輯個人資料</h5>
                            </div>
                            <div class="card-body">
                                <form
                                    method="POST"
                                    action="?/updateProfile"
                                    use:enhance={() => {
                                        isUpdatingProfile = true;
                                        return async ({ result, update }) => {
                                            isUpdatingProfile = false;
                                            if (result.type === 'success') {
                                                // 【修正 1】加入 reset: false，防止表單更新後被清空
                                                await update({ reset: false });
                                                SwalInstance?.fire({ icon: 'success', title: '個人資料更新成功！', timer: 2000, showConfirmButton: false });
                                            } else if (result.type === 'failure') {
                                                const errorMsg = result.data?.error || '未知錯誤';
                                                SwalInstance?.fire({ icon: 'error', title: '更新失敗', text: errorMsg as string });
                                            }
                                        };
                                    }}
                                >
                                    <div class="mb-3">
                                        <label for="name" class="form-label">姓名</label>
                                        <input value={currentUser?.name ?? ''} placeholder="輸入您的姓名" id="name" name="name" type="text" class="form-control">
                                    </div>
                                    <div class="mb-3">
                                        <label for="email" class="form-label">信箱 (唯讀)</label>
                                        <input value={currentUser?.email ?? ''} id="email" type="email" class="form-control" readonly disabled>
                                    </div>
                                    <div class="mb-3">
                                        <label for="department" class="form-label">部門</label>
                                        <input value={currentUser?.department ?? ''} placeholder="輸入您的部門" id="department" name="department" type="text" class="form-control">
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button type="submit" class="btn btn-primary flex-fill" disabled={isUpdatingProfile}>
                                            {#if isUpdatingProfile}
                                                <span class="spinner-border spinner-border-sm me-2" role="status"></span>更新中...
                                            {:else}
                                                更新個人資料
                                            {/if}
                                        </button>
                                        <button type="button" class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                                            更改密碼
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-4">
                <div class="card shadow-sm bg-white bg-opacity-90">
                    <div class="card-header bg-white bg-opacity-90">
                        <h5 class="card-title mb-0 fw-bold">個人頭像</h5>
                    </div>
                    <div class="card-body text-center">
                        <form
                            method="POST"
                            action="?/updateProfile"
                            enctype="multipart/form-data"
                            use:enhance={({ formData }) => {
                                isUpdatingAvatar = true;
                                if (removeAvatar) {
                                    formData.append('removeAvatar', 'true');
                                }
                                return async ({ result, update }) => {
                                    isUpdatingAvatar = false;
                                    if (result.type === 'success') {
                                        // 【修正 1】這裡也加入 reset: false，以防萬一
                                        await update({ reset: false });

                                        // 重置前端狀態
                                        selectedAvatar = null;
                                        avatarPreview = null;
                                        removeAvatar = false;
                                        if (fileInput) fileInput.value = '';

                                        SwalInstance?.fire({ icon: 'success', title: '頭像更新成功！', timer: 2000, showConfirmButton: false });
                                    } else if (result.type === 'failure') {
                                        const errorMsg = result.data?.error || '未知錯誤';
                                        SwalInstance?.fire({ icon: 'error', title: '更新失敗', text: errorMsg as string });
                                    }
                                };
                            }}
                        >
                            <div class="position-relative d-inline-block mb-3">
                                {#if avatarPreview}
                                    <img src="{avatarPreview}" alt="預覽" class="rounded-circle border border-primary" style="width: 120px; height: 120px; object-fit: cover;">
                                    <button type="button" class="btn btn-sm position-absolute top-0 end-0 rounded-circle bg-danger" style="width: 30px; height: 30px; padding: 0;" onclick={handleRemovePreview} title="取消選擇">
                                        <i class="mdi mdi-delete fs-6 text-white"></i>
                                    </button>
                                {:else if currentUser?.avatar && currentUser.avatar !== '' && !removeAvatar}
                                    <img src="{pb.files.getURL(currentUser, currentUser.avatar)}" alt="頭像" class="rounded-circle" style="width: 120px; height: 120px; object-fit: cover;">
                                    <button type="button" class="btn btn-sm position-absolute top-0 end-0 rounded-circle bg-danger" style="width: 30px; height: 30px; padding: 0;" onclick={handleRemovePreview} title="刪除頭像">
                                        <i class="mdi mdi-delete fs-6 text-white"></i>
                                    </button>
                                {:else}
                                    <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 120px; height: 120px;">
                                        <i class="mdi mdi-account" style="font-size: 3rem; color: #6c757d;"></i>
                                    </div>
                                {/if}
                            </div>

                            <div class="mb-3">
                                <input bind:this={fileInput} name="avatar" id="fileInput" type="file" accept="image/*" onchange={handleAvatarSelect} class="d-none" />
                                <button type="button" class="btn btn-primary" onclick={() => fileInput?.click()}>
                                    <i class="mdi mdi-upload"></i> 上傳新頭像
                                </button>
                                {#if selectedAvatar}
                                    <div class="small text-muted mt-2">已選擇: {selectedAvatar.name}</div>
                                {/if}
                            </div>

                            {#if selectedAvatar || removeAvatar}
                                <button type="submit" class="btn btn-success w-100" disabled={isUpdatingAvatar}>
                                    {#if isUpdatingAvatar}
                                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>儲存中...
                                    {:else}
                                        儲存頭像
                                    {/if}
                                </button>
                            {/if}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="changePasswordModal" tabindex="-1" aria-labelledby="changePasswordModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="changePasswordModalLabel">Change Password</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form
                    method="POST"
                    action="?/changePassword"
                    use:enhance={({ cancel }) => {
                        if (newPassword !== confirmPassword) {
                            SwalInstance?.fire({ icon: 'error', title: '錯誤', text: '新密碼與確認密碼不相符' });
                            cancel();
                            return;
                        }
                        if (newPassword.length < 8) {
                            SwalInstance?.fire({ icon: 'error', title: '錯誤', text: '新密碼長度至少需要8個字符' });
                            cancel();
                            return;
                        }

                        isChangingPassword = true;

                        return async ({ result }) => {
                            isChangingPassword = false;
                            if (result.type === 'success') {
                                const modalEl = document.getElementById('changePasswordModal');
                                if (modalEl && bsInstance) {
                                    const modal = bsInstance.Modal.getInstance(modalEl);
                                    modal?.hide();
                                }
                                oldPassword = ''; newPassword = ''; confirmPassword = '';
                                SwalInstance?.fire({ icon: 'success', title: '密碼更改成功！', timer: 2000, showConfirmButton: false });
                            } else if (result.type === 'failure') {
                                const errorMsg = result.data?.error || '未知錯誤';
                                SwalInstance?.fire({ icon: 'error', title: '密碼更改失敗', text: errorMsg as string });
                            }
                        };
                    }}
                >
                    <div class="mb-3">
                        <label for="modalOldPassword" class="form-label">目前密碼</label>
                        <input bind:value={oldPassword} name="oldPassword" type="password" class="form-control" id="modalOldPassword" required>
                    </div>
                    <div class="mb-3">
                        <label for="modalNewPassword" class="form-label">新密碼</label>
                        <input bind:value={newPassword} name="password" type="password" class="form-control" id="modalNewPassword" required minlength="8">
                    </div>
                    <div class="mb-3">
                        <label for="modalConfirmPassword" class="form-label">確認新密碼</label>
                        <input bind:value={confirmPassword} name="passwordConfirm" type="password" class="form-control" id="modalConfirmPassword" required>
                    </div>

                    <div class="modal-footer px-0 pb-0 border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="submit" class="btn btn-primary" disabled={isChangingPassword}>
                            {#if isChangingPassword}
                                <span class="spinner-border spinner-border-sm me-2" role="status"></span>更改中...
                            {:else}
                                更改密碼
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>