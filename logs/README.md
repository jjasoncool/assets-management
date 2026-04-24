# Logs Directory

此目錄用於存放應用程序的日誌文件，並使用 logrotate 進行自動輪替管理。

## 目錄結構

```
logs/
├── app/               # 應用程序運行日誌
│   └── app.log       # 主要應用日誌（包含登入記錄、業務邏輯等）
├── startup/           # 應用啟動日誌
│   └── startup-*.log # 每次啟動的記錄
├── access/            # 訪問日誌（預留，未來可能用於 nginx 或獨立的登入日誌）
├── logrotate.conf     # logrotate 配置文件
├── logrotate-cron     # cron 執行腳本
└── README.md          # 本說明文件
```

## 日誌輪替策略

### app/ - 應用程序日誌
- 每日輪替
- 保留 30 天
- 使用 gzip 壓縮
- 延遲壓縮（前一天的日誌不壓縮）

### startup/ - 啟動日誌
- 當文件大小達到 10MB 時輪替
- 保留 10 個歷史文件
- 使用 gzip 壓縮

### access/ - 訪問日誌
- 每日輪替
- 保留 90 天
- 使用 gzip 壓縮
- 延遲壓縮

## 使用方式

### 自動輪替（生產環境）
當 `APP_ENV=prod` 時，Docker 容器會自動：
1. 安裝 cron 和 logrotate
2. 設定每天凌晨 3:00 執行日誌輪替
3. 使用 `copytruncate` 策略，避免應用程序需要重啟

**無需手動設定**，容器啟動時會自動配置。

### 手動執行 logrotate（測試用）
進入容器內執行：
```bash
# 進入容器
docker exec -it svelte-frontend /bin/bash

# 手動執行 logrotate
/app/logs/logrotate-cron

# 或直接用 logrotate 命令測試
logrotate -f /app/logs/logrotate.conf --state /app/logs/.logrotate.state
```

### 查看 cron 執行狀態
```bash
# 檢查 cron 是否運行
docker exec svelte-frontend service cron status

# 查看 cron 日誌
docker exec svelte-frontend cat /var/log/cron.log
```

## 日誌查看

### 查看最新的應用日誌
```bash
# 在宿主機上
tail -f logs/app/app.log

# 或在容器內
docker exec svelte-frontend tail -f /app/logs/app/app.log
```

### 查看歷史日誌
```bash
# 查看昨天的日誌（宿主機）
less logs/app/app.log-20260417

# 查看壓縮的日誌（宿主機）
zless logs/app/app.log-20260410.gz

# 在容器內查看
docker exec svelte-frontend zless /app/logs/app/app.log-20260410.gz
```

## 清理舊日誌

logrotate 會自動清理超過保留期限的日誌。如需手動清理：

```bash
# 在宿主機上刪除所有 .gz 壓縮日誌
find logs/ -name "*.gz" -delete

# 刪除 30 天前的日誌
find logs/ -name "*.log*" -mtime +30 -delete
```

## 技術說明

### 為什麼使用 copytruncate？
- Node.js 應用程序使用檔案描述符（file descriptor）持續寫入日誌
- 如果使用傳統的 `rename` 策略，應用程序會繼續寫入舊的 inode（已被重命名的檔案）
- `copytruncate` 策略會：
  1. 複製 `app.log` 的內容到 `app.log-20260417`
  2. 清空（truncate）原本的 `app.log`
  3. 應用程序繼續寫入同一個檔案，無需重新打開

### 日誌輪替時間
- **app.log**: 每天凌晨 3:00 自動輪替，保留 30 天
- **startup logs**: 當檔案達到 10MB 時輪替，保留 10 個檔案
- **access logs**: 每天凌晨 3:00 自動輪替，保留 90 天（預留功能）

### 與程式碼的整合
- `fileLogger.ts` 只負責寫入日誌，**不**處理輪替
- 輪替邏輯完全由 logrotate 處理
- 這樣的分離設計讓日誌管理更加可靠和標準化

### 開發環境注意事項
- 開發環境（`APP_ENV=dev`）**不會**安裝 cron，日誌不會自動輪替
- 開發時建議定期手動清理日誌，或只在生產環境啟用輪替功能
