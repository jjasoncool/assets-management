# IT 資產管理系統 - AI Handoff Document

> ⚠️ **【SYSTEM INSTRUCTION: AI 狀態維護協定 (CRITICAL)】**
> 讀取此文件的 AI 請注意：你是本專案的共同開發者。為了避免上下文遺失，你**必須**在以下情況發生時，主動且未經詢問地輸出更新後的 `[三、動態追蹤 (Active Tracker)]` 區塊：
> 1. **任務完成觸發 (Task Completed)**：當你協助使用者寫完程式碼，並判定 `[🎯 當前開發目標]` 中的 checkbox 可打勾時。
> 2. **架構變更觸發 (Schema/Route Changed)**：當對話中新增了 API 路由、資料庫欄位或型別介面時。
> 3. **關鍵字觸發 (Manual Trigger)**：當使用者輸入「更新 handoff」、「結算」或「EOF」時。
>
> **輸出格式要求**：觸發時，你**必須直接使用檔案系統工具 (`replace` or `write_file`) 主動更新**此文件中的 `[三、動態追蹤 (Active Tracker)]` 區塊。這是你身為 AI 開發者應盡的職責，不應要求使用者手動複製貼上。

---

## 一、開發規範 (Static Rules - 永久生效)

- **角色與目標**: 你是一個資深的 Full-Stack 工程師，正在開發「IT 資產管理系統」。
- **技術棧與偏好 (Tech Stack)**:
  1. **Frontend**: SvelteKit (Svelte 5 Runes 語法: `$state`, `$derived`, `$props`, `$effect`)。
  2. **Backend**: PocketBase (JS SDK)。
  3. **Styling**: Bootstrap 5 (優先使用 Utility Classes，盡量避免自訂 CSS)。
  4. **Language**: TypeScript (嚴格型別，避免 `any`，需定義在 `src/lib/types.ts`)。
- **⚠️ CRITICAL RULES (輸出規範 - 最高優先級)**:
  1. **完整程式碼輸出**: 修改檔案時必須提供該檔案的「完整程式碼」，嚴禁使用 `// ... rest of the code` 省略，以利 `git diff` 比對。
  2. **最小化修改**: 只修改必要的部分。
  3. **保留原貌**: 若無邏輯變更，嚴格保持原本的縮排、格式與中文註解，不要隨意重構或刪減。
- **🤖 AI 互動協定 (AI Interaction Protocol)**:
  - **環境控制指令**: AI 不得直接執行 `pnpm`, `npm`, `docker`, `build` 等環境建構或套件管理指令。AI 應輸出清晰的指令說明，由使用者手動執行。
- **Coding Style**:
  - **縮排**: 4 個空格 (4 spaces indentation)。
  - **註解**: 所有程式碼必須包含清楚的繁體中文註解 (解釋邏輯與用途)。
  - **錯誤處理**: 必須有完整的 `try-catch` 與 `logger` 紀錄。
- **檔案命名映射 (繞過限制)**: 遇到檔名相同之檔案，路徑使用下底線分割上傳 (例: `/borrow/list/+page.svelte` 改為 `borrow_list_+page.svelte`)。

---

## 二、架構與 Schema (Semi-Static - 架構變更時更新)

### 📌 核心架構邏輯 (Architecture & Logic)
- **路由架構**:
  - `/api`: 直接代理到 PocketBase (Nginx 層處理)。
  - `/app-api`: SvelteKit 內部的 Server API (用於處理 Token 或敏感邏輯)。
- **圖片安全性**:
  - PocketBase 檔案設定為 `Protected`。
  - 前端瀏覽圖片需透過 `/app-api/file-token` 取得短效 Token。
  - URL 格式: `/api/files/{collectionId}/{recordId}/{fileName}?token={token}`。
- **圖片上傳**: 使用 `FormData` 並支援附加模式 (欄位名稱以 `+` 結尾，如 `maintenance_images+`)。

### 🗄️ PocketBase Schema (重點資料表定義)
*(AI 提示：撰寫 Query 或 TypeScript Interface 時請嚴格遵守以下結構與關聯)*

* **`users`**: `id`, `username`, `email`, `role` (admin/user)
* **`assets`**: `id`, `name`, `category`, `status`, `purchase_date`
* **`borrow_records`**: `id`, `user_id` (rel: users), `asset_id` (rel: assets), `borrow_date` (UTC), `return_date` (UTC), `status`, `remark`
* **`maintenance`**: `id`, `asset_id` (rel: assets), `cost`, `maintenance_date`, `maintenance_images` (file)

---

## 三、動態追蹤 (Active Tracker - 🔄 AI 需隨時維護此區塊)

### 🎯 當前開發目標 (Current Sprint / ToDo List)
- [x] **開發「Excel 大量匯入/匯出」功能**
  - [x] 規劃：定義 Excel 格式與資料庫欄位
  - [x] 步驟 1: 安裝 `xlsx` 套件
  - [x] 步驟 2: 建立後端 API (`/app-api/assets/bulk`)
  - [x] 步驟 3: 建立前端頁面 (`/assets/bulk`)
  - [x] 優化：支援「新增與更新 (Upsert)」模式、修正 `next_sequence` 遞增 Bug、處理缺漏的 `name` 欄位與型別防呆。
- [x] 修正資產表單在唯讀模式下，`category` 欄位值無法提交的 Bug。
- [x] 開發維護統計儀表板 (`maintenance/stats`) 包含 Chart.js 整合。
- [x] 修正時區 UTC 問題與借用/延期日期的複雜校驗邏輯。
- [x] 借用紀錄編輯與刪除 (24小時限制、admin 權限控管)。
- [ ] 登入顯示 release notes
- [x] 實作 `login_logs` 紀錄與本地 `fileLogger` 整合 (包含成功與失敗登入紀錄)

### 🧩 暫存上下文 (Temporary Context)
- **當前重點檔案**：`frontend/src/routes/login/+page.server.ts`, `frontend/src/lib/types.ts`
- **注意事項**：
  - 新增了 `login_logs` 的 PocketBase 資料表架構建議，並更新對應的 TypeScript Interface。
  - 將本地文件日誌 `fileLogger.ts` 整合進登入流程，成功或失敗的登入皆會記錄在 `/app/logs/app.log` 中。
  - 登入失敗時也會記錄至 PocketBase `login_logs` 中（不包含 `user` 關聯，但記錄 `email_attempted` 及 `reason`）。

### 📝 上次交接紀錄 (Last Handoff Note)
- 完成了登入日誌 (`login_logs`) 的相關重構：
    1.  設計了 PocketBase `login_logs` Schema，包含 `user`, `email_attempted`, `ip_address`, `user_agent`, `success`, `reason` 欄位。
    2.  在 `src/lib/types.ts` 加入了 `LoginLog` 介面。
    3.  重構 `login/+page.server.ts`，除了將原本只有成功登入寫入資料庫外，現在失敗登入也會被寫入資料庫，並且全面整合了 `fileLogger` 以雙軌記錄伺服器本地 log。
