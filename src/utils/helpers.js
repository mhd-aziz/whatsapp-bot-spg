/**
 * Helper Utilities
 */

const moment = require('moment');

/**
 * Extract phone number from WhatsApp ID
 * @param {string} whatsappId - WhatsApp ID (e.g., 62812345678@c.us)
 * @returns {string} Phone number without suffix
 */
function extractPhoneNumber(whatsappId) {
  if (!whatsappId) return '';
  return whatsappId.split('@')[0];
}

/**
 * Get current date in specified format
 * @param {string} format - Moment format string
 * @returns {string} Formatted current date
 */
function getCurrentDate(format = 'YYYY-MM-DD') {
  return moment().format(format);
}

/**
 * Get current timestamp
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Resolve a date argument to YYYY-MM-DD format.
 * Supports: empty (today), 'kemarin' (yesterday), DD-MM-YYYY, YYYY-MM-DD.
 * Invalid input falls back to today.
 * @param {string} arg - Date argument from command
 * @returns {string} Date in YYYY-MM-DD format
 */
function resolveDate(arg) {
  if (!arg) return getCurrentDate();
  const value = arg.trim().toLowerCase();

  if (value === 'kemarin') {
    return moment().subtract(1, 'day').format('YYYY-MM-DD');
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return moment(value, 'DD-MM-YYYY').format('YYYY-MM-DD');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return getCurrentDate();
}

module.exports = {
  extractPhoneNumber,
  getCurrentDate,
  getTimestamp,
  resolveDate,
};
