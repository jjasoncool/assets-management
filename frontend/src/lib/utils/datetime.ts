import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, addDays } from 'date-fns';
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
 * 將日期值正規化為 yyyy-MM-dd，專門處理「只有日期、沒有時間語意」的欄位。
 *
 * 注意：資產購買日期這類欄位代表日曆日期，不應被 UTC/local timezone 轉換成前一天或後一天。
 * - 字串若已包含 yyyy-MM-dd / yyyy/MM/dd / yyyy.M.d，優先直接取日曆日期。
 * - Date 物件則以系統預設時區格式化，避免直接 toISOString() 造成 UTC 日期偏移。
 */
function normalizeDateOnly(date: unknown): string {
	if (!date) return '';

	if (date instanceof Date && !Number.isNaN(date.getTime())) {
		return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
	}

	const rawValue = String(date).trim();
	if (!rawValue) return '';

	const dateOnlyMatch = rawValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch;
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	const parsedDate = parseISO(rawValue.replace(' ', 'T'));
	if (!Number.isNaN(parsedDate.getTime())) {
		return formatInTimeZone(parsedDate, TIMEZONE, 'yyyy-MM-dd');
	}

	return rawValue;
}

/**
 * 將日期值正規化為 yyyy-MM-dd，供資料比對使用。
 * 支援 Date、ISO 字串、PocketBase 的 "YYYY-MM-DD HH:mm:ss.SSSZ" 字串。
 * @param {unknown} date - 日期值
 * @returns {string} - yyyy-MM-dd；空值回傳空字串；無法解析時回傳 trim 後原字串
 */
function normalizeDateForComparison(date: unknown): string {
	return normalizeDateOnly(date);
}

/**
 * 獲取當前應用程式設定時區的日期字串 (yyyy-MM-dd)
 * 特別用於 <input type="date"> 的預設值，以避免時區問題
 * @returns {string} - 'yyyy-MM-dd' 格式的日期字串
 */
function getCurrentZonedDateString(): string {
	return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

/**
 * 為了 FullCalendar 的結束日期，將給定日期增加一天並格式化
 * FullCalendar 的 all-day event end date 是 exclusive 的
 * @param {string | Date | null | undefined} date - 日期物件或 ISO 格式的日期字串
 * @returns {string | undefined} - 'yyyy-MM-dd' 格式的日期字串，或在輸入無效時回傳 undefined
 */
function getCalendarEndDate(date: string | Date | null | undefined): string | undefined {
	if (!date) {
		return undefined;
	}
	try {
		const dateObj = typeof date === 'string' ? parseISO(date.replace(' ', 'T')) : date;
		const addedDate = addDays(dateObj, 1);
		// FullCalendar 只需要 yyyy-MM-dd，使用 formatInTimeZone 是為了與專案其他地方保持一致
		return formatInTimeZone(addedDate, TIMEZONE, 'yyyy-MM-dd');
	} catch (error) {
		logger.error('[getCalendarEndDate] Error adding day to date:', { date, error });
		return undefined;
	}
}

export { TIMEZONE, formatDateTime, formatDate, normalizeDateOnly, normalizeDateForComparison, getCurrentZonedDateString, getCalendarEndDate };
