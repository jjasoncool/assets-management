#!/bin/sh
# Docker Entrypoint for SvelteKit Application
# 此腳本會在容器啟動時自動執行，負責啟動背景服務

set -e  # 遇到錯誤立即退出

echo "[ENTRYPOINT] Starting Asset Management System"
echo "[ENTRYPOINT] APP_ENV: $APP_ENV"

# 啟動 cron 服務進行日誌輪替（開發和生產環境都需要）
echo "[ENTRYPOINT] Starting cron service for log rotation"
service cron start
echo "[ENTRYPOINT] Cron service started successfully"

# 執行傳入的命令（CMD 的內容）
# exec 會用 CMD 取代當前進程，確保信號正確傳遞
echo "[ENTRYPOINT] Executing main command: $@"
exec "$@"
