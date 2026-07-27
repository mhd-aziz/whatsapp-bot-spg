/**
 * Helper Utilities
 */

const moment = require('moment');

/**
 * Format phone number to WhatsApp ID format
 * @param {string} phone - Phone number
 * @returns {string} Formatted WhatsApp ID
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove any non-digit characters except + at the start
  let cleaned = phone.toString().trim();
  
  // Handle @lid or @c.us suffix
  if (cleaned.includes('@')) {
    return cleaned;
  }
  
  // Remove + prefix if exists
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove any remaining non-digits
  cleaned = cleaned.replace(/\D/g, '');
  
  // Add @c.us suffix for WhatsApp
  return cleaned.includes('@') ? cleaned : `${cleaned}@c.us`;
}

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
 * Format date to Indonesian locale
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment format string
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'DD/MM/YYYY HH:mm:ss') {
  return moment(date).format(format);
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
 * Check if phone number has allowed prefix
 * @param {string} phone - Phone number to check
 * @param {string[]} allowedPrefixes - Array of allowed prefixes
 * @returns {boolean} True if allowed
 */
function isAllowedPhone(phone, allowedPrefixes) {
  if (!phone || !allowedPrefixes || allowedPrefixes.length === 0) {
    return true; // Allow if no restrictions
  }
  
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return allowedPrefixes.some(prefix => cleanPhone.startsWith(prefix.replace('+', '')));
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize string for logging (remove sensitive data)
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForLog(str) {
  if (!str) return '';
  // Truncate long strings
  if (str.length > 100) {
    return str.substring(0, 100) + '...';
  }
  return str;
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  formatPhoneNumber,
  extractPhoneNumber,
  formatDate,
  getCurrentDate,
  getTimestamp,
  isAllowedPhone,
  delay,
  sanitizeForLog,
  generateId,
};
