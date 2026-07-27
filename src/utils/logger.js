/**
 * Logger Utility
 * Simple console logger with timestamps and levels
 */

const moment = require('moment');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function log(level, message, data = null) {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data !== null) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|any} error - Error object or data
 */
function error(message, error = null) {
  log(LOG_LEVELS.ERROR, message, error);
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {any} data - Optional data
 */
function warn(message, data = null) {
  log(LOG_LEVELS.WARN, message, data);
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {any} data - Optional data
 */
function info(message, data = null) {
  log(LOG_LEVELS.INFO, message, data);
}

/**
 * Log debug message (only in development)
 * @param {string} message - Debug message
 * @param {any} data - Optional data
 */
function debug(message, data = null) {
  if (process.env.NODE_ENV === 'development') {
    log(LOG_LEVELS.DEBUG, message, data);
  }
}

/**
 * Log bot event with emoji
 * @param {string} event - Event name
 * @param {string} details - Event details
 */
function botEvent(event, details = '') {
  const timestamp = moment().format('HH:mm:ss');
  console.log(`\n[${timestamp}] 🤖 ${event}${details ? ': ' + details : ''}\n`);
}

module.exports = {
  error,
  warn,
  info,
  debug,
  botEvent,
  LOG_LEVELS,
};
