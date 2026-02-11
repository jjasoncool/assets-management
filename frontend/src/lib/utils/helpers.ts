import { logger } from '$lib/utils/logger';

export function getMaintenanceTypeLabel(type: string): string {
	switch (type) {
		case 'preventive':
			return '預防性';
		case 'corrective':
			return '修復性';
		default:
			return type;
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
