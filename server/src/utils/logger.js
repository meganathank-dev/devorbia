import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../../logs');

/**
 * List of sensitive fields that should never appear in logs.
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'secret',
  'apiKey',
  'apiSecret',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
];

/**
 * Recursively redact sensitive fields from an object.
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized copy
 */
const redactSensitive = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = redactSensitive(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Custom format that redacts sensitive information.
 */
const sensitiveFilter = winston.format((info) => {
  if (info.meta) {
    info.meta = redactSensitive(info.meta);
  }
  return info;
});

/**
 * Development console format: colorized, timestamped, readable.
 */
const devFormat = winston.format.combine(
  sensitiveFilter(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

/**
 * Production format: structured JSON for log aggregation.
 */
const prodFormat = winston.format.combine(
  sensitiveFilter(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'flowforge-api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

export default logger;
