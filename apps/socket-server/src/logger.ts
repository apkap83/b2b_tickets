import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

// Define the custom log format
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Create a Winston logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    customFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

export default logger;
