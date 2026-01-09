import PocketBase from 'pocketbase/cjs';

// 動態設定 API URL，避免寫死域名和 SSR 問題
// PocketBase 會自動在 base URL 後面加上 /api
const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
export const pb = new PocketBase(baseUrl);

// 導出常用的 PocketBase 工具函數
export const {
  files,
  realtime
} = pb;
