import { pb } from '../pocketbase';
import { logger } from '../utils/logger';

// 用戶認證相關
export async function userAuth(email: string, password: string) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    logger.log('登入成功:', authData);
    return authData;
  } catch (error) {
    logger.error('用戶認證失敗:', error);
    throw error;
  }
}

export function logout() {
  logger.log('用戶登出');
  pb.authStore.clear();
}

export function isAuthenticated() {
  const isValid = pb.authStore.isValid;
  logger.log('檢查登入狀態:', isValid, pb.authStore.model);
  return isValid;
}

export function getCurrentUser() {
  logger.log('獲取當前用戶:', pb.authStore.model);
  return pb.authStore.model;
}

// 用戶 profile 相關
export async function updateUserProfile(data: { name?: string; avatar?: File }) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    const formData = new FormData();

    if (data.name !== undefined) {
      formData.append('name', data.name);
    }

    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }

    const updatedRecord = await pb.collection('users').update(user.id, formData);
    logger.log('Profile 更新成功:', updatedRecord);

    // 更新本地 auth store
    pb.authStore.save(pb.authStore.token, updatedRecord);

    return updatedRecord;
  } catch (error) {
    logger.error('Profile 更新失敗:', error);
    throw error;
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    const user = pb.authStore.model;
    if (!user) throw new Error('未登入');

    await pb.collection('users').update(user.id, {
      oldPassword: oldPassword,
      password: newPassword,
      passwordConfirm: newPassword,
    });
    logger.log('密碼更改成功');
  } catch (error) {
    logger.error('密碼更改失敗:', error);
    throw error;
  }
}
