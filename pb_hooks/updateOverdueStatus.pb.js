// pb_hooks/updateOverdueStatus.pb.js

/**
 * 這是一個 Cron Job (定時任務)，會定期執行以更新逾期借用紀錄的狀態。
 * 適用於 PocketBase v0.23+ (包含目前的 v0.36.5)
 */
cronAdd(
    'updateOverdueStatus', // 任務名稱，必須是唯一的
    '*/10 * * * *', // Cron 表達式，此處設定為「每 10 分鐘」執行一次
    () => {
        // ⚠️ 注意：在 PocketBase v0.23+ 中，callback 不再傳入 dao 參數。
        // 所有的資料庫查詢與操作都必須直接使用全域物件 $app
        console.log('Cron job [updateOverdueStatus] running...');

        // 獲取當前的 UTC 時間字串，用於資料庫查詢
        const now = new Date().toISOString();
        let records;

        try {
            // 1. 查找所有需要更新狀態的紀錄
            // 條件：
            // - 狀態 (status) 必須是 'borrowed' (借用中)
            // - 預計歸還日期 (expected_return_date) 已經早於現在
            records = $app.findRecordsByFilter(
                'borrow_records', // 要查詢的 collection
                "status = 'borrowed' && expected_return_date < {:now}",
                '-created', // 排序方式
                0, // 限制數量 (0 表示不限制)
                0, // 偏移量
                { now: now } // 傳遞給查詢的變數
            );
        } catch (err) {
            console.error('Error finding overdue records:', err);
            // 如果查詢失敗，則終止此次任務
            return;
        }

        // 如果沒有找到任何逾期紀錄，則印出日誌並結束
        if (!records || records.length === 0) {
            console.log('No overdue records to update.');
            return;
        }

        console.log(`Found ${records.length} overdue record(s) to update.`);

        try {
            // 2. 在 PocketBase 新版中，強烈建議使用 Transaction (交易) 來處理批次寫入
            // 如果在迴圈儲存過程中有任何一筆失敗，整個交易都會回復 (Rollback)，確保資料一致性
            $app.runInTransaction((txApp) => {
                for (const record of records) {
                    // 更新狀態為逾期
                    record.set('status', 'overdue');

                    // 3. 透過 transaction 實例逐筆儲存變更
                    txApp.save(record);
                }
            });
            console.log(`Successfully updated ${records.length} record(s) to 'overdue'.`);
        } catch (err) {
            console.error('Error updating records to overdue status:', err);
        }
    }
);
