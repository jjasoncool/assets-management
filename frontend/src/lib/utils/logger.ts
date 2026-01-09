// 開發環境日誌工具
// 只在開發環境中輸出日誌，生產環境中完全不輸出
export const logger = {
  log: (...args: any[]) => import.meta.env.DEV && console.log(...args),
  error: (...args: any[]) => import.meta.env.DEV && console.error(...args),
  warn: (...args: any[]) => import.meta.env.DEV && console.warn(...args),
  info: (...args: any[]) => import.meta.env.DEV && console.info(...args),
  debug: (...args: any[]) => import.meta.env.DEV && console.debug(...args),
};

// 用法範例：
// logger.log('用戶登入成功:', userData);
// logger.error('API 請求失敗:', error);
// logger.warn('即將棄用的功能');
//
// 在生產環境中，這些調用會被完全移除，不會有任何性能開銷