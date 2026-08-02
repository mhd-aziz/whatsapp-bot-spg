/**
 * Helper Utilities
 */

const moment = require('moment');
const { resolvePhone } = require('./lidResolver');

/** Indonesian month names (lowercase for parsing, capitalized for display) */
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Normalize an Indonesian phone number to international format (62xxx).
 * Accepts local (08xx) or international (62xxx) input; strips spaces/dashes.
 * @param {string} input
 * @returns {string} normalized number, or '' if invalid
 */
function normalizePhoneNumber(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

/**
 * Extract phone number from WhatsApp ID (resolves LID jids to real numbers)
 * @param {string} whatsappId - WhatsApp ID (e.g., 62812345678@s.whatsapp.net, 1907...@lid)
 * @returns {string} Phone number without suffix
 */
function extractPhoneNumber(whatsappId) {
  if (!whatsappId) return '';
  return resolvePhone(whatsappId);
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
 * Parse an Indonesian date phrase like "8 oktober 2026" (also "8 Oktober 2026").
 * @param {string} value - e.g. "8 oktober 2026"
 * @returns {string|null} YYYY-MM-DD, or null if not an Indonesian date phrase
 */
function parseIndonesianDate(value) {
  const match = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (!match) return null;
  const monthIdx = MONTHS_ID.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
  if (monthIdx === -1) return null;

  const day = parseInt(match[1], 10);
  const year = parseInt(match[3], 10);
  const date = moment({ year, month: monthIdx, day });
  // Strict: reject impossible dates like "32 oktober 2026" instead of normalizing them
  if (!date.isValid() || date.date() !== day || date.month() !== monthIdx || date.year() !== year) {
    return null;
  }
  return date.format('YYYY-MM-DD');
}

/**
 * Format a date string (YYYY-MM-DD or DD-MM-YYYY) as Indonesian, e.g. "8 Oktober 2026".
 * @param {string} dateStr
 * @returns {string} formatted date, or the input unchanged if unparseable
 */
function formatIndonesianDate(dateStr) {
  const date = moment(dateStr, ['YYYY-MM-DD', 'DD-MM-YYYY']);
  if (!date.isValid()) return dateStr;
  return `${date.date()} ${MONTHS_ID[date.month()]} ${date.year()}`;
}

/**
 * Resolve a date argument to YYYY-MM-DD format.
 * Supports: empty (today), 'kemarin' (yesterday), Indonesian phrase ('8 oktober 2026'),
 * DD-MM-YYYY, YYYY-MM-DD. Invalid input falls back to today.
 * @param {string} arg - Date argument from command
 * @returns {string} Date in YYYY-MM-DD format
 */
function resolveDate(arg) {
  if (!arg) return getCurrentDate();
  const value = arg.trim().toLowerCase();

  if (value === 'kemarin') {
    return moment().subtract(1, 'day').format('YYYY-MM-DD');
  }
  const indoDate = parseIndonesianDate(value);
  if (indoDate) return indoDate;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const parsed = moment(value, 'DD-MM-YYYY', true); // strict: tolak 32-13-2026
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return getCurrentDate();
}

module.exports = {
  normalizePhoneNumber,
  extractPhoneNumber,
  getCurrentDate,
  getTimestamp,
  resolveDate,
  parseIndonesianDate,
  formatIndonesianDate,
};
