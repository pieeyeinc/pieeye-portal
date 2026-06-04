/**
 * logger.ts - CW-1: env-driven log level for pieeye-portal
 * Reads LOG_LEVEL from env (default: 'info').
 * Set LOG_LEVEL=info in Prod Vercel env vars to suppress debug logs.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLevel = LEVELS[(process.env.LOG_LEVEL?.toLowerCase() ?? 'info') as LogLevel] ?? LEVELS.info

const shouldLog = (level: LogLevel) => LEVELS[level] >= currentLevel

export const logger = {
  debug: (...args: unknown[]) => { if (shouldLog('debug')) console.debug('[DEBUG]', ...args) },
  info:  (...args: unknown[]) => { if (shouldLog('info'))  console.info('[INFO]',  ...args) },
  warn:  (...args: unknown[]) => { if (shouldLog('warn'))  console.warn('[WARN]',  ...args) },
  error: (...args: unknown[]) => { if (shouldLog('error')) console.error('[ERROR]', ...args) },
}
