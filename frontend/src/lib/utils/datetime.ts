import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { logger } from '$lib/utils/logger';

/**
 * @constant {string} TIMEZONE - 應用程式預設時區
 */
const TIMEZONE = 'Asia/Taipei';

/**
 * 格式化日期時間字串 (來自 PocketBase 或 new Date())
 * @param {string | Date | null | undefined} date - 日期物件或 ISO 格式的日期字串
 * @param {string} formatString - date-fns 格式字串
 * @returns {string} - 格式化後的日期時間字串 (已轉換為台灣時區)，如果輸入為無效日期則回傳 '無效日期'
 */
function formatDateTime(
	date: string | Date | null | undefined,
	formatString = 'yyyy-MM-dd HH:mm:ss'
): string {
	if (!date) {
		return 'N/A';
	}

	try {
		// PocketBase 回傳的字串是 'YYYY-MM-DD HH:mm:ss.sssZ' 格式，parseISO 可以正確解析
		// 但為增加容錯，先將中間的空格換成 'T'
		const dateObj = typeof date === 'string' ? parseISO(date.replace(' ', 'T')) : date;
		return formatInTimeZone(dateObj, TIMEZONE, formatString);
	} catch (error) {
		logger.error('[formatDateTime] Error formatting date:', { date, error });
		return '無效日期';
	}
}

/**
 * 僅格式化日期部分
 * @param {string | Date | null | undefined} date - 日期物件或 ISO 格式的日期字串
 * @param {string} formatString - date-fns 格式字串
 * @returns {string} - 格式化後的日期字串 (已轉換為台灣時區)
 */
function formatDate(date: string | Date | null | undefined, formatString = 'yyyy-MM-dd'): string {
	return formatDateTime(date, formatString);
}

/**
 * 獲取當前應用程式設定時區的日期字串 (yyyy-MM-dd)
 * 特別用於 <input type="date"> 的預設值，以避免時區問題
 * @returns {string} - 'yyyy-MM-dd' 格式的日期字串
 */
function getCurrentZonedDateString(): string {
	return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

export { TIMEZONE, formatDateTime, formatDate, getCurrentZonedDateString };
