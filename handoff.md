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

### 🧩 暫存上下文 (Temporary Context)
- **當前重點檔案**：`frontend/src/routes/assets/bulk/+page.svelte`, `frontend/src/routes/assets/bulk/+page.server.ts`
- **注意事項**：
  - 已實作 Upsert 邏輯。匯出的 Excel 現在可直接作為匯入範本。如果使用者留下財產編號空白，系統將自動產生新編號（新增）；若填寫財產編號則會嘗試更新現有資料。
  - **Excel TAB 與資產代碼對應關係**：
    - **匯出**：每個資產類別會獨立為一個工作表 (Sheet)，Sheet 名稱 = 資產類別名稱（如 "桌上型電腦"、"筆記型電腦"）。
    - **匯入**：根據 Sheet 名稱比對資料庫中的 `asset_categories.name` 來對應資產類別。
    - **資產代碼生成**：新增資產時，使用該類別的 `prefix` + `next_sequence`（如 `PC0001`）。
    - **特殊字符處理**：Excel 不允許工作表名稱包含 `: \ / ? * [ ]`，系統會自動替換為底線 `_`，匯入時會同時比對原始名稱和 safe 名稱。
    - 參考位置：[+page.server.ts:80-112](frontend/src/routes/assets/bulk/+page.server.ts#L80-L112), [+page.svelte:74-101](frontend/src/routes/assets/bulk/+page.svelte#L74-L101)

### 📝 上次交接紀錄 (Last Handoff Note)
- 完成了大量匯入/匯出頁面的邏輯重構與修復：
    1.  實作 **Upsert (新增與更新)** 機制：依據 `asset_id` 決定行為。
    2.  修復 **`next_sequence` 未遞增 Bug**：匯入時同類別的新資產會正確取得不同的連續編號。
    3.  **補齊必填欄位**：新增了 `name` (資產名稱) 與 `status` 等欄位的讀寫對應，並加入基礎防呆 (如預設名稱)。
    4.  優化 **Excel 匯出**：即使該類別目前無資產，也會匯出空表與表頭作為「範本」使用。
    5.  統一錯誤處理為 `fail(status, data)` 以確保前端元件能正確接收 Form Error。
