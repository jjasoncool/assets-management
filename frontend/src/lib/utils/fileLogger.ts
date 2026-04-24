/**
 * # File Logger for Production
 *
 * 生產環境的文件日誌記錄器，支持日誌輪替
 * 僅在伺服器端運行
 */

import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.env.LOG_DIR || '/app/logs/app';
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// 確保日誌目錄存在
try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
} catch (err) {
    console.error('Failed to create log directory:', err);
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLogMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    return `[${timestamp}] [${level}] ${message}\n`;
}

function writeLog(level: LogLevel, ...args: any[]) {
    try {
        // 日誌輪替由外部 logrotate 工具處理，這裡只負責寫入
        const logMessage = formatLogMessage(level, ...args);
        fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
    } catch (err) {
        console.error('Failed to write log:', err);
    }
}

export const fileLogger = {
    info: (...args: any[]) => {
        console.info(...args);
        writeLog('INFO', ...args);
    },
    warn: (...args: any[]) => {
        console.warn(...args);
        writeLog('WARN', ...args);
    },
    error: (...args: any[]) => {
        console.error(...args);
        writeLog('ERROR', ...args);
    },
    debug: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(...args);
            writeLog('DEBUG', ...args);
        }
    }
};

// 記錄應用啟動
export function logStartup(appName: string, version: string, port: number) {
    const startupLogDir = process.env.STARTUP_LOG_DIR || '/app/logs/startup';
    try {
        if (!fs.existsSync(startupLogDir)) {
            fs.mkdirSync(startupLogDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const startupLog = path.join(startupLogDir, `startup-${timestamp}.log`);

        const startupInfo = `
===========================================
Application: ${appName}
Version: ${version}
Port: ${port}
Environment: ${process.env.NODE_ENV || 'development'}
Started at: ${new Date().toISOString()}
Node Version: ${process.version}
PID: ${process.pid}
===========================================
`;

        fs.writeFileSync(startupLog, startupInfo, 'utf8');
        console.log(`Startup log written to: ${startupLog}`);
    } catch (err) {
        console.error('Failed to write startup log:', err);
    }
}
