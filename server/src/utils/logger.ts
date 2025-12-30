/**
 * Structured logging utility
 */

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

class Logger {
    private level: LogLevel;

    constructor(level: string = 'info') {
        this.level = this.parseLevel(level);
    }

    private parseLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                return LogLevel.INFO;
        }
    }

    private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        if (level < this.level) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            ...meta,
        };

        const output = JSON.stringify(logEntry);

        if (level >= LogLevel.ERROR) {
            console.error(output);
        } else if (level >= LogLevel.WARN) {
            console.warn(output);
        } else {
            // eslint-disable-next-line no-console
            console.log(output);
        }
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, meta);
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, meta);
    }

    error(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, meta);
    }
}

export const logger = new Logger(process.env.LOG_LEVEL || 'info');
