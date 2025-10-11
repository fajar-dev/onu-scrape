import { createLogger, transports, format } from 'winston'
import 'winston-daily-rotate-file'
import * as dotenv from 'dotenv'
import { existsSync, mkdirSync } from 'fs'
import * as path from 'path'

dotenv.config()

const logDir = process.env.LOG_DIR || 'logs'
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

const logger = createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level}: ${stack || message}`
    })
  ),
  transports: [
    new (transports as any).DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '7d', 
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message }) => `${level}: ${message}`)
      ),
    }),
  ],
})

export default logger
