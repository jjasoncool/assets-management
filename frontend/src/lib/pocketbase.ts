import PocketBase from 'pocketbase/cjs';

export const pb = new PocketBase('http://pocketbase:8090');

// 管理員登入（用於初始化）
export async function adminAuth(email: string, password: string) {
  try {
    const authData = await pb.admins.authWithPassword(email, password);
    return authData;
  } catch (error) {
    console.error('管理員認證失敗:', error);
    throw error;
  }
}

// 用戶登入
export async function userAuth(email: string, password: string) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData;
  } catch (error) {
    console.error('用戶認證失敗:', error);
    throw error;
  }
}

// 登出
export function logout() {
  pb.authStore.clear();
}

// 檢查登入狀態
export function isAuthenticated() {
  return pb.authStore.isValid;
}

// 獲取當前用戶資訊
export function getCurrentUser() {
  return pb.authStore.model;
}
