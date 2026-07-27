/**
 * Storage Service
 * Unified interface for data storage (local JSON, Supabase, Google Sheets)
 */

const dataService = require('./dataService');
const supabaseService = require('./supabaseService');
const googleSheetsService = require('./googleSheetsService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { config } = require('../config');

class StorageService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize all storage services
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Google Sheets if configured
      await googleSheetsService.initialize();
      
      logger.info('Storage services initialized');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize storage services', error.message);
    }
  }

  // ==================== ATTENDANCE METHODS ====================

  /**
   * Save attendance record to all available storage backends
   * @param {Object} record - Attendance record
   * @returns {Object} Saved record
   */
  async saveAttendance(record) {
    // Save to local JSON (primary)
    const savedRecord = await dataService.addAttendance(record);

    // Save to Supabase (if available)
    if (supabaseService.isAvailable()) {
      await supabaseService.saveAttendance({
        phone: savedRecord.phone,
        date: savedRecord.date,
        type: savedRecord.type,
        photoUrl: savedRecord.photo,
        latitude: savedRecord.latitude,
        longitude: savedRecord.longitude,
        timestamp: savedRecord.timestamp,
      });
    }

    // Save to Google Sheets (if available)
    if (googleSheetsService.isAvailable()) {
      await googleSheetsService.saveAttendance(savedRecord);
    }

    return savedRecord;
  }

  /**
   * Get attendance records
   * @param {Object} options - Query options
   * @returns {Array} Attendance records
   */
  async getAttendance(options = {}) {
    // Use Supabase if available and specific query is provided
    if (supabaseService.isAvailable() && (options.phone || options.date)) {
      return await supabaseService.getAttendance(options);
    }

    // Otherwise use local JSON
    return await dataService.getAttendance();
  }

  /**
   * Get today's attendance for a user
   * @param {string} phone - User phone number
   * @returns {Object|null}
   */
  async getTodayAttendance(phone) {
    return await dataService.getTodayAttendance(phone);
  }

  /**
   * Get today's attendance for a user (alias for compatibility)
   * @param {string} phone - User phone number
   * @returns {Object|null}
   */
  async getCheckoutToday(phone) {
    return await dataService.getTodayAttendance(phone);
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Save customer record to all available storage backends
   * @param {Object} customer - Customer data
   * @returns {Object} Saved customer record
   */
  async saveCustomer(customer) {
    // Save to local JSON (primary)
    const savedCustomer = await dataService.addCustomer(customer);

    // Save to Supabase (if available)
    if (supabaseService.isAvailable()) {
      await supabaseService.saveCustomer(savedCustomer);
    }

    // Save to Google Sheets (if available)
    if (googleSheetsService.isAvailable()) {
      await googleSheetsService.saveCustomer(savedCustomer);
    }

    return savedCustomer;
  }

  /**
   * Get customer records
   * @param {Object} options - Query options
   * @returns {Array} Customer records
   */
  async getCustomers(options = {}) {
    // Use Supabase if available and specific query is provided
    if (supabaseService.isAvailable() && (options.spgPhone || options.date)) {
      return await supabaseService.getCustomers(options);
    }

    // Otherwise use local JSON
    return await dataService.getCustomers();
  }

  // ==================== PHOTO STORAGE ====================

  /**
   * Save photo from WhatsApp message
   * @param {Object} media - WhatsApp media object
   * @param {string} filename - Filename for the photo
   * @returns {string|null} Saved photo filename or null
   */
  async savePhoto(media, filename) {
    try {
      const buffer = await media.data;
      const photoPath = path.join(config.paths.photos, filename);
      
      await fs.writeFile(photoPath, buffer, 'base64');
      logger.debug(`Photo saved: ${filename}`);
      
      return filename;
    } catch (error) {
      logger.error('Failed to save photo', error.message);
      return null;
    }
  }

  /**
   * Get photo path
   * @param {string} filename - Photo filename
   * @returns {string} Full path to photo
   */
  getPhotoPath(filename) {
    return path.join(config.paths.photos, filename);
  }

  // ==================== STATISTICS ====================

  /**
   * Get daily statistics
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Object} Statistics
   */
  async getDailyStats(date) {
    // Try Supabase first if available
    if (supabaseService.isAvailable()) {
      return await supabaseService.getStats(date);
    }

    // Fallback to local JSON
    return await dataService.getDailyStats(date);
  }

  /**
   * Get list of all SPG/SPB
   * @returns {Array} Phone numbers
   */
  async getSpgList() {
    return await dataService.getSpgList();
  }
}

// Export singleton instance
module.exports = new StorageService();
