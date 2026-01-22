<script lang="ts">
import { goto } from '$app/navigation';
import { onMount, tick } from 'svelte';
import { logout, getCurrentUser, updateUserProfile, changePassword } from '$lib/services/userService';
import { pb } from '$lib/pocketbase';
import Navbar from '$lib/components/Navbar.svelte';
import Footer from '$lib/components/Footer.svelte';
import { bs, Swal } from '$lib/stores';

let currentUser: any = null;
let bsInstance: any = null;
let SwalInstance: any = null;

// 訂閱 store
bs.subscribe(value => bsInstance = value);
Swal.subscribe(value => SwalInstance = value);

function handleLogout() {
  logout();
  goto('/login');
}

let name = '';
let email = '';
let department = '';

// Profile 更新相關
let isUpdatingProfile = false;
let selectedAvatar: File | null = null;
let avatarPreview: string | null = null;
let removeAvatar = false;
let isUpdatingAvatar = false;

// 密碼更改相關
let showPasswordForm = false;
let oldPassword = '';
let newPassword = '';
let confirmPassword = '';
let isChangingPassword = false;

onMount(() => {
  // 獲取當前用戶資訊
  currentUser = getCurrentUser();

  if (currentUser) {
    name = currentUser.name || '';
    email = currentUser.email || '';
    department = currentUser.department || '';
  }

  // 設置 modal 事件處理
  const modalElement = document.getElementById('changePasswordModal');
  if (modalElement && bsInstance) {
    modalElement.addEventListener('hidden.bs.modal', clearPasswordForm);
  }
});

// 更新 profile (只更新名字)
async function handleUpdateProfile() {
  if (!currentUser) return;

  isUpdatingProfile = true;

  try {
    const updateData: { name?: string; department?: string; avatar?: File | string } = {};

    if (name !== (currentUser.name || '')) {
      updateData.name = name;
    }

    if (department !== (currentUser.department || '')) {
      updateData.department = department;
    }

    if (Object.keys(updateData).length === 0) {
      if (SwalInstance) await SwalInstance.fire({
        icon: 'info',
        title: '沒有需要更新的內容',
        timer: 2000,
        showConfirmButton: false
      });
      isUpdatingProfile = false;
      return;
    }

    const updatedUser = await updateUserProfile(updateData);
    currentUser = updatedUser;

    if (SwalInstance) await SwalInstance.fire({
      icon: 'success',
      title: '個人資料更新成功！',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error: any) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '更新失敗',
      text: error.message || '未知錯誤'
    });
  } finally {
    isUpdatingProfile = false;
  }
}

// 單獨更新頭像
async function handleUpdateAvatar() {
  if (!currentUser) return;

  isUpdatingAvatar = true;

  try {
    const updateData: { avatar?: File | string | null } = {};

    if (selectedAvatar) {
      updateData.avatar = selectedAvatar;
    } else if (removeAvatar) {
      // 刪除頭像：設置為 null
      updateData.avatar = null;
    } else {
      if (SwalInstance) await SwalInstance.fire({
        icon: 'info',
        title: '沒有需要更新的內容',
        timer: 2000,
        showConfirmButton: false
      });
      isUpdatingAvatar = false;
      return;
    }

    const updatedUser = await updateUserProfile(updateData);

    // 確保 UI 正確更新
    currentUser = { ...updatedUser };
    selectedAvatar = null;
    avatarPreview = null;
    removeAvatar = false;

    // 清空文件輸入
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    if (SwalInstance) await SwalInstance.fire({
      icon: 'success',
      title: '頭像更新成功！',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error: any) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '更新失敗',
      text: error.message || '未知錯誤'
    });
  } finally {
    isUpdatingAvatar = false;
  }
}

  // 處理頭像文件選擇
  function handleAvatarSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      selectedAvatar = null;
      avatarPreview = null;
      return;
    }

    // 驗證文件類型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      if (SwalInstance) SwalInstance.fire({
        icon: 'error',
        title: '無效的文件類型',
        text: '只允許上傳 JPEG, PNG, SVG, GIF 或 WebP 格式的圖片'
      });
      // 清空輸入
      target.value = '';
      selectedAvatar = null;
      avatarPreview = null;
      return;
    }

    // 驗證文件大小 (5MB 限制)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      if (SwalInstance) SwalInstance.fire({
        icon: 'error',
        title: '文件過大',
        text: '圖片大小不能超過 5MB'
      });
      // 清空輸入
      target.value = '';
      selectedAvatar = null;
      avatarPreview = null;
      return;
    }

    // 設置選擇的檔案
    selectedAvatar = file;

    // 生成預覽
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

// 更改密碼
async function handleChangePassword() {
  // 檢查用戶是否已登入
  if (!currentUser) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '錯誤',
      text: '請先登入後再更改密碼'
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '錯誤',
      text: '新密碼與確認密碼不相符'
    });
    return;
  }

  if (newPassword.length < 8) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '錯誤',
      text: '新密碼長度至少需要8個字符'
    });
    return;
  }

  isChangingPassword = true;

  try {
    await changePassword(oldPassword, newPassword);

    // 清空表單
    clearPasswordForm();

    // 關閉 modal：使用動態載入的 bs 變數
    const modalElement = document.getElementById('changePasswordModal');
    if (modalElement && bsInstance) {
      const bsModal = bsInstance.Modal.getInstance(modalElement);
      if (bsModal) {
        bsModal.hide();
      }
    }

    if (SwalInstance) await SwalInstance.fire({
      icon: 'success',
      title: '密碼更改成功！',
      timer: 2000,
      showConfirmButton: false
    });

    // 密碼更改成功後執行登出
    setTimeout(() => {
      handleLogout();
    }, 1500);
  } catch (error: any) {
    if (SwalInstance) await SwalInstance.fire({
      icon: 'error',
      title: '密碼更改失敗',
      text: error.message || '未知錯誤'
    });
  } finally {
    isChangingPassword = false;
  }
}

  // 清空密碼表單
  function clearPasswordForm() {
    oldPassword = '';
    newPassword = '';
    confirmPassword = '';
  }
</script>

<style>
.position-relative .btn:hover {
  filter: brightness(1.1);
}
</style>

<div class="min-vh-100 pb-5">
    <div class="container-fluid px-4">
        <Navbar {handleLogout} {currentUser} />

        <div class="row g-4">
            <!-- Profile Information and Edit Profile -->
            <div class="col-12 col-lg-8">
                <div class="row g-4">
                    <!-- Profile Information -->
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
                                <div class="mb-3">
                                    <strong class="text-muted">最後更新:</strong>
                                    <div>{currentUser?.updated ? new Date(currentUser.updated).toLocaleDateString('zh-TW') : '未設定'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Profile -->
                    <div class="col-12 col-lg-6">
                        <div class="card shadow-sm bg-white bg-opacity-90">
                            <div class="card-header bg-white bg-opacity-90">
                                <h5 class="card-title mb-0 fw-bold">編輯個人資料</h5>
                            </div>
                            <div class="card-body">
                                <form on:submit|preventDefault={handleUpdateProfile}>
                                    <div class="mb-3">
                                        <label for="name" class="form-label">姓名</label>
                                        <input bind:value={name} placeholder="輸入您的姓名" id="name" name="name" type="text" class="form-control">
                                    </div>
                                    <div class="mb-3">
                                        <label for="email" class="form-label">信箱 (唯讀)</label>
                                        <input bind:value={email} placeholder="輸入您的信箱" id="email" name="email" type="email" class="form-control" readonly>
                                    </div>
                                    <div class="mb-3">
                                        <label for="department" class="form-label">部門</label>
                                        <input bind:value={department} placeholder="輸入您的部門" id="department" name="department" type="text" class="form-control">
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button type="submit" class="btn btn-primary flex-fill" disabled={isUpdatingProfile}>
                                            {#if isUpdatingProfile}
                                                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                                更新中...
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

            <!-- Profile Image -->
            <div class="col-12 col-lg-4">
                <div class="card shadow-sm bg-white bg-opacity-90">
                    <div class="card-header bg-white bg-opacity-90">
                        <h5 class="card-title mb-0 fw-bold">個人頭像</h5>
                    </div>
                    <div class="card-body text-center">
                        <div class="position-relative d-inline-block mb-3">
                            {#if avatarPreview}
                                <img src="{avatarPreview}" alt="預覽" class="rounded-circle border border-primary" style="width: 120px; height: 120px; object-fit: cover;">
                                <button type="button" class="btn btn-sm position-absolute top-0 end-0 rounded-circle bg-danger" style="width: 30px; height: 30px; padding: 0;" on:click={() => { selectedAvatar = null; avatarPreview = null; removeAvatar = false; (document.getElementById('fileInput') as HTMLInputElement).value = ''; }} title="取消頭像選擇" aria-label="取消頭像選擇">
                                    <i class="mdi mdi-delete fs-6 text-white"></i>
                                </button>
                            {:else if currentUser?.avatar && currentUser.avatar !== '' && !removeAvatar}
                                <img src="{pb.files.getURL(currentUser, currentUser.avatar)}" alt="頭像" class="rounded-circle" style="width: 120px; height: 120px; object-fit: cover;">
                                <button type="button" class="btn btn-sm position-absolute top-0 end-0 rounded-circle bg-danger" style="width: 30px; height: 30px; padding: 0; transition: background-color 0.2s;" on:mouseenter={() => {}} on:mouseleave={() => {}} on:click={() => { removeAvatar = true; selectedAvatar = null; avatarPreview = null; }} title="刪除頭像" aria-label="刪除頭像">
                                    <i class="mdi mdi-delete fs-6 text-white"></i>
                                </button>
                            {:else}
                                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 120px; height: 120px;">
                                    <i class="mdi mdi-account" style="font-size: 3rem; color: #6c757d;"></i>
                                </div>
                            {/if}
                        </div>

                        <div class="mb-3">
                            <input id="fileInput" type="file" accept="image/*" on:change={handleAvatarSelect} class="d-none" />
                            <button type="button" class="btn btn-primary" on:click={() => document.getElementById('fileInput')?.click()}>
                                <i class="mdi mdi-upload"></i> 上傳新頭像
                            </button>
                            {#if selectedAvatar}
                                <div class="small text-muted mt-2">已選擇: {selectedAvatar.name}</div>
                            {/if}
                        </div>

                        {#if selectedAvatar || removeAvatar}
                            <button type="button" class="btn btn-success w-100" on:click={handleUpdateAvatar} disabled={isUpdatingAvatar}>
                                {#if isUpdatingAvatar}
                                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                    儲存中...
                                {:else}
                                    儲存頭像
                                {/if}
                            </button>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Change Password Modal -->
<div class="modal fade" id="changePasswordModal" tabindex="-1" aria-labelledby="changePasswordModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="changePasswordModalLabel">Change Password</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form on:submit|preventDefault={handleChangePassword}>
                    <div class="mb-3">
                        <label for="modalOldPassword" class="form-label">目前密碼</label>
                        <input bind:value={oldPassword} type="password" class="form-control" id="modalOldPassword" required>
                    </div>
                    <div class="mb-3">
                        <label for="modalNewPassword" class="form-label">新密碼</label>
                        <input bind:value={newPassword} type="password" class="form-control" id="modalNewPassword" required minlength="8">
                    </div>
                    <div class="mb-3">
                        <label for="modalConfirmPassword" class="form-label">確認新密碼</label>
                        <input bind:value={confirmPassword} type="password" class="form-control" id="modalConfirmPassword" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" disabled={isChangingPassword} on:click={handleChangePassword}>
                    {#if isChangingPassword}
                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                        更改中...
                    {:else}
                        更改密碼
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>
