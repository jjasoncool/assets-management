// pb_hooks/sendExtensionNotification.pb.js

/**
 * 當借用記錄被延期時，自動發送 Email 通知給所有管理員
 *
 * 重要：不要傳入第二個參數！PocketBase 0.36.x 的 onRecordUpdate 不接受 collection 參數
 * 必須在 hook 內部手動檢查 collection 名稱
 */
onRecordAfterUpdate('borrow_records', (e) => {
    // 【終極防禦】將整個 Hook 邏輯包在 try-catch 中
    try {
        const record = e.record;

        // 安全地取得舊資料 (如果 PocketBase 版本不支援，就退回 null)
        const oldRecord = record.originalCopy ? record.originalCopy() : null;

        const currentRemark = record.get('remark') || '';
        const oldRemark = oldRecord ? (oldRecord.get('remark') || '') : '';

        // 檢查是否為延期操作：
        // 必須包含 [延期]，且前後的 remark 不一樣 (代表這次更新確實新增了延期日誌)
        if (!currentRemark.includes('[延期]') || currentRemark === oldRemark) {
            return;
        }

        console.log(`Detected extension for borrow record ${record.id}. Sending notification emails...`);

        // 1. 獲取相關資料
        const userId = record.get('user');
        const assetId = record.get('asset');

        if (!userId || !assetId) {
            console.error(`Record ${record.id} is missing user or asset ID. Cannot send notification.`);
            return;
        }

        const user = $app.findRecordById('users', userId);
        const asset = $app.findRecordById('assets', assetId);

        const borrowerName = user.get('name') || user.get('email');
        const borrowerEmail = user.get('email');
        const assetName = asset.get('name');
        const assetIdValue = asset.get('asset_id');

        const newExpectedDate = String(record.get('expected_return_date')).split(' ')[0];
        let oldExpectedDate = oldRecord ? String(oldRecord.get('expected_return_date')).split(' ')[0] : '未知';

        // 2. 從 remark 提取最新的延期資訊
        const extensionLogs = currentRemark.split('[延期]').filter(log => log.trim());
        const latestExtension = extensionLogs[extensionLogs.length - 1] || '';

        // 解析延期資訊（提取操作者和理由）
        let operatorInfo = '系統';
        let extensionReason = '無';

        const operatorMatch = latestExtension.match(/由\s+(.+?)\s+延期至/);
        if (operatorMatch) {
            operatorInfo = operatorMatch[1];
        }

        const reasonMatch = latestExtension.match(/理由:\s*(.+)/);
        if (reasonMatch) {
            extensionReason = reasonMatch[1].trim();
        }

        // 嘗試從備註中提取「原日期」(因為 SvelteKit 的 borrowService.ts 已經有寫入了)
        const oldDateMatch = latestExtension.match(/\(原:\s*([0-9-]+)\)/);
        if (oldDateMatch) {
            oldExpectedDate = oldDateMatch[1];
        }

        // 3. 查找所有管理員
        const admins = $app.findRecordsByFilter(
            'users',
            "role ~ 'admin'",
            '-created',
            0,
            0
        );

        if (!admins || admins.length === 0) {
            console.warn('No admin users found. Notification skipped.');
            return;
        }

        const adminEmails = admins.map(admin => admin.get('email'));

        // 4. 建立收件人列表（使用 Set 避免重複）
        const recipients = new Set(adminEmails);
        const toAddresses = Array.from(recipients).map(email => ({ address: email }));

        // 5. 建立並發送郵件
        const message = new MailerMessage({
            from: {
                address: $app.settings().meta.senderAddress,
                name: $app.settings().meta.senderName
            },
            to: toAddresses,
            subject: `【IT資產管理系統】借用延期通知：${assetName}`,
            html: `
            <div style="background-color: #f8f9fa; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                    <div style="text-align: center; padding: 40px 20px 20px; background-color: #ffffff;">
                        <img src="https://github.com/TaneshimaPopura/images/blob/main/EGST-mail-logo.jpg?raw=true" alt="Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
                    </div>
                    <div style="padding: 0 40px 40px;">
                        <h2 style="color: #ffc107; font-size: 20px; margin-bottom: 20px; text-align: center;">借用延期通知 (Extension Notification)</h2>
                        <p style="margin-bottom: 20px; color: #555;">管理員您好，</p>
                        <p style="margin-bottom: 25px; color: #555;">以下借用記錄已申請延期，特此通知：</p>
                        <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px 20px; margin-bottom: 25px; border-radius: 5px;">
                            <p style="margin: 5px 0;"><b>資產編號:</b> ${assetIdValue}</p>
                            <p style="margin: 5px 0;"><b>資產名稱:</b> ${assetName}</p>
                            <p style="margin: 5px 0;"><b>借用人:</b> ${borrowerName} (${borrowerEmail})</p>
                            <p style="margin: 5px 0;"><b>操作者:</b> ${operatorInfo}</p>
                        </div>
                        <div style="background-color: #e7f3ff; border-left: 5px solid #0d6efd; padding: 15px 20px; margin-bottom: 25px; border-radius: 5px;">
                            <p style="margin: 5px 0;"><b>原預計歸還日期:</b> <span style="text-decoration: line-through; color: #999;">${oldExpectedDate}</span></p>
                            <p style="margin: 5px 0;"><b>新預計歸還日期:</b> <strong style="color: #0d6efd;">${newExpectedDate}</strong></p>
                            <p style="margin: 5px 0;"><b>延期理由:</b> ${extensionReason}</p>
                        </div>
                        <p style="margin-bottom: 20px; color: #555;">
                            請至 <a href="${$app.settings().meta.appURL}/borrow/list" target="_blank" rel="noopener" style="color: #0d6efd; text-decoration: none;">資產管理系統</a> 查看詳細資訊。
                        </p>
                        <p style="margin-bottom: 20px; color: #888; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
                            <i>This is an automated notification sent to all administrators.</i>
                        </p>

                        <p style="margin: 0; color: #555;">
                            IT資產管理系統<br/>
                            <small style="color: #999;">Asset Management System</small>
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

        $app.newMailClient().send(message);
        console.log(`Successfully sent extension notification for record ${record.id}`);

    } catch (err) {
        // 【最重要的一步】就算 Hook 發生任何致命錯誤，也會被攔截在這裡印出，絕對不影響資料庫寫入！
        console.error("Hook Error in sendExtensionNotification: ", err);
    }
});
