import fs from 'fs';
import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { config } from '@b2b-tickets/config';
import { TransportName } from '@b2b-tickets/shared-models';

const { combine, timestamp, json, printf, colorize, align, errors } =
  winston.format;

const env = process.env['NODE_ENV'] || 'development';
const logDir = env === 'production' ? 'production' : 'development';
const logPath = path.join(process.cwd(), 'logs', logDir);

// Ensure log directory exists
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

const errorLogFilePath = path.join(logPath, 'error-%DATE%.log');
const authLogFilePath = path.join(logPath, 'auth-%DATE%.log');
const actionsLogFilePath = path.join(logPath, 'actions-%DATE%.log');
const eventsLogFilePath = path.join(logPath, 'events-%DATE%.log');
const combinedLogFilePath = path.join(logPath, 'combined-%DATE%.log');

// Create custom format to filter logs based on transportName
const createFilter = (transportName: TransportName) => {
  return winston.format((info) => {
    return info.transportName === transportName ? info : false;
  })();
};

const transports = [];

if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: authLogFilePath,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: combine(createFilter(TransportName.AUTH), json()),
    }),
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: actionsLogFilePath,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: combine(createFilter(TransportName.ACTIONS), json()),
    }),
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: eventsLogFilePath,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: combine(createFilter(TransportName.EVENTS), json()),
    }),
    new winston.transports.DailyRotateFile({
      level: 'error',
      filename: errorLogFilePath,
      format: combine(json()),
    }),
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: combinedLogFilePath,
      format: combine(json()),
    })
  );
}

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(json()),
    })
  );
}

const logger = winston.createLogger({
  // level: process.env.LOG_LEVEL || 'info',
  level: config.logging.applicationLoggingLevel,
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: transports,
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: path.join(logPath, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: path.join(logPath, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

// Define a custom console format that includes the timestamp
const simpleLogFormat = combine(
  colorize({ all: true }),
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  align(),
  printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

// Console Logging
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: simpleLogFormat,
    })
  );
}

export class CustomLogger {
  private logger: winston.Logger;
  private transportName: TransportName;
  private defaultMeta: object;

  constructor(
    logger: winston.Logger,
    transportName: TransportName,
    defaultMeta: object = {}
  ) {
    this.logger = logger;
    this.transportName = transportName;
    this.defaultMeta = defaultMeta;
  }

  log(level: string, message: string, meta: object = {}) {
    this.logger.log({
      level,
      message,
      ...this.defaultMeta,
      ...meta,
      transportName: this.transportName,
    });
  }

  info(message: string, meta: object = {}) {
    this.log('info', message, meta);
  }

  warn(message: string, meta: object = {}) {
    this.log('warn', message, meta);
  }

  error(message: string, meta: object = {}) {
    this.log('error', message, meta);
  }

  debug(message: string, meta: object = {}) {
    this.log('debug', message, meta);
  }
}

// Function to create a logger instance with reqIP, reqURL, and sessionId
export const createRequestLogger = (
  transportName: TransportName,
  reqIP: string | null,
  reqURL: string | null,
  sessionId: string | null
) => {
  const defaultMeta = { reqIP, reqURL, sessionId };
  return new CustomLogger(logger, transportName, defaultMeta);
};

const logAuth = new CustomLogger(logger, TransportName.AUTH);
const logAction = new CustomLogger(logger, TransportName.ACTIONS);
const logEvent = new CustomLogger(logger, TransportName.EVENTS);
const logErr = new CustomLogger(logger, TransportName.ERROR);
const logInfo = new CustomLogger(logger, TransportName.COMBINED);

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const sequelizeDBActionsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    customFormat
  ),
  transports: [
    new winston.transports.File({
      filename: `${logPath}/Sequelize_DB_Actions.log`,
    }),
  ],
});

export {
  logAuth,
  logAction,
  logEvent,
  logErr,
  logInfo,
  TransportName,
  sequelizeDBActionsLogger,
};
