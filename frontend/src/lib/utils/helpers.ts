import { logger } from '$lib/utils/logger';

/**
 * 根據維護類型獲取對應的顯示資訊
 * @param type - 維護類型
 * @returns 包含標籤、描述和樣式類別的物件
 */
export function getMaintenanceTypeInfo(type: string): {
	label: string;
	description: string;
	className: string;
} {
	switch (type) {
		case 'preventive':
			return {
				label: '預防性',
				description: '為防止資產故障或效能下降而定期進行的計畫性維護。',
				className: 'badge bg-success bg-opacity-10 text-success'
			};
		case 'corrective':
			return {
				label: '修復性',
				description: '當資產發生故障、損壞或無法正常運作時所進行的非計畫性維修。',
				className: 'badge bg-danger bg-opacity-10 text-danger'
			};
		case 'inspection':
			return {
				label: '例行檢查',
				description: '對資產進行定期或不定期的檢查，以評估其狀況並及早發現潛在問題。',
				className: 'badge bg-info bg-opacity-10 text-info'
			};
		default:
			return {
				label: type,
				description: '其他類型的維護活動',
				className: 'badge bg-secondary bg-opacity-10 text-secondary'
			};
	}
}

/**
 * 從後端取得短效期的 File Token (用於存取 Protected Files)
 */
export async function getFileToken(): Promise<string> {
    try {
        const res = await fetch('/app-api/file-token');
        if (res.ok) {
            const data = await res.json();
            return data.token;
        } else {
            logger.error('無法獲取圖片權限');
            return '';
        }
    } catch (err) {
        logger.error('獲取 Token 失敗:', err);
        return '';
    }
}

/**
 * 產生 PocketBase 圖片的完整 URL
 * @param collectionId 集合 ID
 * @param recordId 紀錄 ID
 * @param fileName 檔案名稱
 * @param token (可選) File Token，若無則不帶參數
 */
export function getPocketBaseImageUrl(
    collectionId: string,
    recordId: string,
    fileName: string,
    token: string = ''
): string {
    if (!collectionId || !recordId || !fileName) return '';
    const tokenPart = token ? `?token=${token}` : '';
    return `/api/files/${collectionId}/${recordId}/${fileName}${tokenPart}`;
}
