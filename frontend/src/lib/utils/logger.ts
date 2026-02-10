/**
 * # Isomorphic (Universal) Logger for SvelteKit
 *
 * 這是一個為 SvelteKit 設計的「同構」（或稱通用）日誌工具，
 * 可以在伺服器端 (Server) 和客戶端 (Client) 環境中無縫運作。
 *
 * 它只會在開發環境中 (`import.meta.env.DEV` 為 true 時) 輸出日誌，
 * 在生產環境 (Production) 的建置成果中會被完全移除，因此沒有任何性能開銷。
 *
 * ## 如何運作
 *
 * - **在伺服器端 (Server-side):**
 *   當你在 `.server.ts` 或 `hooks.server.ts` 等後端檔案中使用 `logger`，
 *   日誌訊息將會輸出到你執行專案的 **終端機 (Terminal)**。
 *
 * - **在客戶端 (Client-side):**
 *   當你在 `.svelte` 檔案中使用 `logger`，
 *   日誌訊息將會輸出到 **瀏覽器的開發者控制台 (Browser DevTools Console)**。
 *
 * ## 用法範例
 *
 * ```typescript
 * import { logger } from '$lib/utils/logger';
 *
 * // 在 .server.ts 或 .svelte 中皆可使用
 * logger.log('用戶登入成功:', userData);
 * logger.error('API 請求失敗:', error);
 * logger.warn('即將棄用的功能');
 * ```
 */
export const logger = {
  log: (...args: any[]) => import.meta.env.DEV && console.log(...args),
  error: (...args: any[]) => import.meta.env.DEV && console.error(...args),
  warn: (...args: any[]) => import.meta.env.DEV && console.warn(...args),
  info: (...args: any[]) => import.meta.env.DEV && console.info(...args),
  debug: (...args: any[]) => import.meta.env.DEV && console.debug(...args),
};
