<script lang="ts">
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
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
let phone = '';
let bio = '';

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
    phone = currentUser.phone || '';
    bio = currentUser.bio || '';
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
    const updateData: { name?: string; avatar?: File | string } = {};

    if (name !== (currentUser.name || '')) {
      updateData.name = name;
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

<div class="bg03">
    <div class="container-xl">
        <div class="row">
            <div class="col-12">
                <Navbar {handleLogout} {currentUser} />
            </div>
        </div>
        <!-- row -->
        <div class="row tm-content-row tm-mt-big">
            <!-- Profile Information and Edit Profile in one wider column -->
            <div class="col-12 col-lg-8 col-xl-8">
                <div class="row">
                    <!-- Profile Information -->
                    <div class="col-12 col-lg-6">
                        <div class="bg-white tm-block">
                            <div class="row">
                                <div class="col-12">
                                    <h2 class="tm-block-title d-inline-block">Profile Information</h2>
                                </div>
                            </div>
                            <div class="tm-list-group tm-list-group-alternate-color tm-list-group-pad-big">
                                <div class="tm-list-group-item">
                                    <strong>Name:</strong> {currentUser?.name || 'Not set'}
                                </div>
                                <div class="tm-list-group-item">
                                    <strong>Email:</strong> {currentUser?.email || 'Not set'}
                                </div>

                                <div class="tm-list-group-item">
                                    <strong>Created:</strong> {currentUser?.created ? new Date(currentUser.created).toLocaleDateString() : 'Not set'}
                                </div>
                                <div class="tm-list-group-item">
                                    <strong>Last Updated:</strong> {currentUser?.updated ? new Date(currentUser.updated).toLocaleDateString() : 'Not set'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Profile -->
                    <div class="col-12 col-lg-6">
                        <div class="bg-white tm-block">
                            <div class="row">
                                <div class="col-12">
                                    <h2 class="tm-block-title">Edit Profile</h2>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12">
                                    <form class="tm-signup-form" on:submit|preventDefault={handleUpdateProfile}>
                                        <div class="form-group">
                                            <label for="name">Full Name</label>
                                            <input bind:value={name} placeholder="Enter your full name" id="name" name="name" type="text" class="form-control">
                                        </div>
                                        <div class="form-group">
                                            <label for="email">Email Address (Read-only)</label>
                                            <input bind:value={email} placeholder="Enter your email" id="email" name="email" type="email" class="form-control" readonly>
                                        </div>
                                        <div class="row">
                                            <div class="col-12 col-sm-6">
                                                <button type="submit" class="btn btn-primary" disabled={isUpdatingProfile}>
                                                    {#if isUpdatingProfile}
                                                        <span class="spinner-border spinner-border-sm" role="status"></span>
                                                        Updating...
                                                    {:else}
                                                        Update Profile
                                                    {/if}
                                                </button>
                                            </div>
                                            <div class="col-12 col-sm-6 tm-btn-right">
                                                <button type="button" class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                                                    Change Password
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Profile Image in separate column -->
            <div class="col-12 col-lg-4 col-xl-4">
                <div class="bg-white tm-block">
                    <h2 class="tm-block-title">Profile Image</h2>
                    <div class="text-center position-relative">
                        {#if avatarPreview}
                            <img src="{avatarPreview}" alt="Preview" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover; border: 2px solid #007bff;">
                            <button type="button" class="btn btn-sm btn-outline-danger position-absolute" style="top: 0; right: 0; border-radius: 50%; width: 30px; height: 30px; padding: 0;" on:click={() => { selectedAvatar = null; avatarPreview = null; removeAvatar = false; (document.getElementById('fileInput') as HTMLInputElement).value = ''; }} aria-label="取消頭像選擇" title="取消頭像選擇">
                                <i class="mdi mdi-close"></i>
                            </button>
                        {:else if currentUser?.avatar && currentUser.avatar !== '' && !removeAvatar}
                            <img src="{pb.files.getURL(currentUser, currentUser.avatar)}" alt="Profile" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;">
                            <button type="button" class="btn btn-sm btn-outline-danger position-absolute" style="top: 0; right: 0; border-radius: 50%; width: 30px; height: 30px; padding: 0;" on:click={() => { removeAvatar = true; selectedAvatar = null; avatarPreview = null; }} aria-label="刪除頭像" title="刪除頭像">
                                <i class="mdi mdi-delete"></i>
                            </button>
                        {:else}
                            <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 120px; height: 120px;">
                                <i class="mdi mdi-account" style="font-size: 3rem;"></i>
                            </div>
                        {/if}
                    </div>
                    <div class="custom-file mt-3 mb-3">
                        <input id="fileInput" type="file" accept="image/*" on:change={handleAvatarSelect} style="display:none;" />
                        <input type="button" class="btn btn-primary d-block mx-auto" value="Upload New..." on:click={() => document.getElementById('fileInput')?.click()} />
                        {#if selectedAvatar}
                            <small class="text-muted d-block mt-2">Selected: {selectedAvatar.name}</small>
                        {/if}
                    </div>
                    {#if selectedAvatar || removeAvatar}
                        <div class="mt-3">
                            <button type="button" class="btn btn-success d-block mx-auto" on:click={handleUpdateAvatar} disabled={isUpdatingAvatar}>
                                {#if isUpdatingAvatar}
                                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Saving...
                                {:else}
                                    Save Avatar
                                {/if}
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
        <Footer />
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
