import PocketBase from 'pocketbase/cjs';

// 動態設定 API URL，避免寫死域名和 SSR 問題
// PocketBase 會自動在 base URL 後面加上 /api
const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
export const pb = new PocketBase(baseUrl);

// 用戶登入
export async function userAuth(email: string, password: string) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    console.log('登入成功:', authData);
    return authData;
  } catch (error) {
    console.error('用戶認證失敗:', error);
    throw error;
  }
}

// 登出
export function logout() {
  console.log('用戶登出');
  pb.authStore.clear();
}

// 檢查登入狀態
export function isAuthenticated() {
  const isValid = pb.authStore.isValid;
  console.log('檢查登入狀態:', isValid, pb.authStore.model);
  return isValid;
}

// 獲取當前用戶資訊
export function getCurrentUser() {
  console.log('獲取當前用戶:', pb.authStore.model);
  return pb.authStore.model;
}
