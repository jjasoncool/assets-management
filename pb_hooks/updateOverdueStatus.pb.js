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

/**
 * 這是一個 Cron Job (定時任務)，每日固定時間執行，發送逾期歸還的 Email 提醒。
 */
cronAdd(
    'sendOverdueReminders', // 任務名稱，必須是唯一的
    '0 9 * * *', // Cron 表達式，此處設定為「每天早上 9:00」執行一次
    () => {
        console.log('Cron job [sendOverdueReminders] running...');

        try {
            // 1. 查找所有狀態為 'overdue' 的借用紀錄
            const overdueRecords = $app.findRecordsByFilter(
                'borrow_records',
                "status = 'overdue'",
                '-created', // 排序方式
                0, // 限制數量 (0 表示不限制)
                0  // 偏移量
                // 注意：這裡不使用 expand，改在迴圈中手動查詢
            );

            if (!overdueRecords || overdueRecords.length === 0) {
                console.log('No overdue records found. Email job finished.');
                return;
            }

            console.log(`Found ${overdueRecords.length} overdue record(s) to send notifications for.`);

            // 2. 查找所有管理員 (admin)
            // 修正：由於 role 是一個支援多選的陣列，必須使用 ~ (包含) 而不是 =
            const admins = $app.findRecordsByFilter(
                'users',
                "role ~ 'admin'",
                '-created',
                0,
                0
            );
            const adminEmails = admins.map(admin => admin.get('email'));

            // 3. 遍歷每條逾期紀錄，發送郵件
            for (const record of overdueRecords) {
                try {
                    const userId = record.get('user');
                    const assetId = record.get('asset');

                    // 確保關聯資料的 ID 存在
                    if (!userId || !assetId) {
                        console.error(`Record ${record.id} is missing user or asset ID. Skipping.`);
                        continue;
                    }

                    // 取代 expand，手動取得關聯的 user 與 asset 紀錄
                    const user = $app.findRecordById('users', userId);
                    const asset = $app.findRecordById('assets', assetId);

                    const borrowerEmail = user.get('email');
                    const borrowerName = user.get('name');
                    const assetName = asset.get('name');
                    const assetIdValue = asset.get('asset_id');
                    const expectedReturnRaw = record.get('expected_return_date');
                    const expectedReturnDate = expectedReturnRaw ? String(expectedReturnRaw).split(' ')[0] : '未知日期';

                    // 建立收件人列表，使用 Set 避免郵件地址重複 (例如管理員自己借了東西)
                    const recipients = new Set([borrowerEmail, ...adminEmails]);

                    // 將 Set 轉換為 PocketBase MailerMessage 接受的物件陣列格式
                    const toAddresses = Array.from(recipients).map(email => ({ address: email }));

                    // 建立郵件訊息物件 (使用建構子直接傳入，確保 Goja 引擎正確綁定)
                    const message = new MailerMessage({
                        from: {
                            address: $app.settings().meta.senderAddress,
                            name: $app.settings().meta.senderName
                        },
                        to: toAddresses,
                        subject: `【IT資產管理系統】歸還提醒：您借用的資產「${assetName}」已逾期`,
                        html: `
                        <div style="background-color: #f8f9fa; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">

                                <div style="text-align: center; padding: 40px 20px 20px; background-color: #ffffff;">
                                    <img src="https://github.com/TaneshimaPopura/images/blob/main/EGST-mail-logo.jpg?raw=true" alt="Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
                                </div>

                                <div style="padding: 0 40px 40px;">
                                    <h2 style="color: #dc3545; font-size: 20px; margin-bottom: 20px; text-align: center;">資產逾期歸還提醒 (Overdue Asset Reminder)</h2>

                                    <p style="margin-bottom: 20px; color: #555;">您好 ${borrowerName}，</p>
                                    <p style="margin-bottom: 25px; color: #555;">
                                        此郵件旨在提醒您，您所借用的以下資產已超過預計歸還日期，請盡快處理：
                                    </p>

                                    <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px 20px; margin-bottom: 25px; border-radius: 5px;">
                                        <p style="margin: 5px 0;"><b>資產編號:</b> ${assetIdValue}</p>
                                        <p style="margin: 5px 0;"><b>資產名稱:</b> ${assetName}</p>
                                        <p style="margin: 5px 0;"><b>借 用 人:</b> ${borrowerName}</p>
                                        <p style="margin: 5px 0;"><b>預計歸還日期:</b> <strong style="color: #dc3545;">${expectedReturnDate}</strong></p>
                                    </div>

                                    <p style="margin-bottom: 20px; color: #555;">
                                        請您盡快歸還該資產。如果您已經歸還<br/>請至 <a href="${$app.settings().meta.appURL}/return" target="_blank" rel="noopener" style="color: #0d6efd; text-decoration: none;">資產管理系統</a> 登記歸還。
                                    </p>

                                    <p style="margin-bottom: 20px; color: #888; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
                                        <i>This is an automated notification. If you believe this is a mistake, please contact the IT department.</i>
                                    </p>

                                    <p style="margin: 0; color: #555;">
                                        感謝您的合作,<br/>
                                        <strong>IT資產管理系統</strong>
                                    </p>
                                </div>
                            </div>

                            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                                <p style="margin: 0;">此為系統自動發送的郵件，請勿直接回覆。</p>
                                <p style="margin: 5px 0 0;">&copy; IT資產管理系統. All rights reserved.</p>
                            </div>
                        </div>
                        `
                    });

                    // 發送郵件
                    $app.newMailClient().send(message);

                    console.log(`Successfully sent overdue notification for record ${record.id} to: ${Array.from(recipients).join(', ')}`);

                } catch (err) {
                    console.error(`Failed to process or send email for overdue record ${record.id}. Error: ${err}`);
                }
            }
        } catch (err) {
            console.error('An error occurred during the main execution of sendOverdueReminders:', err);
        } finally {
            console.log('Cron job [sendOverdueReminders] finished.');
        }
    }
);
