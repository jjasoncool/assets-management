import PocketBase from 'pocketbase';

// 動態設定 API URL，避免寫死域名和 SSR 問題
// PocketBase 會自動在 base URL 後面加上 /api
const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
export const pb = new PocketBase(baseUrl);

// 服務端使用的實例工廠函數 (每個請求創建新實例，避免狀態污染)
export function createPocketBaseInstance(url?: string) {
  const instanceUrl = url || process.env.POCKETBASE_URL || 'http://localhost:8090';
  return new PocketBase(instanceUrl);
}

// 導出常用的 PocketBase 工具函數
export const {
  files,
  realtime
} = pb;