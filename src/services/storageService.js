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

  async initialize() {
    if (this.initialized) return;

    try {
      await googleSheetsService.initialize();
      
      logger.info('Storage services initialized');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize storage services', error.message);
    }
  }

  async saveAttendance(record) {
    const savedRecord = await dataService.addAttendance(record);

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

    if (googleSheetsService.isAvailable()) {
      await googleSheetsService.saveAttendance(savedRecord);
    }

    return savedRecord;
  }

  async getAttendance(options = {}) {
    if (supabaseService.isAvailable() && (options.phone || options.date)) {
      return await supabaseService.getAttendance(options);
    }

    return await dataService.getAttendance();
  }

  async getTodayAttendance(phone) {
    return await dataService.getTodayAttendance(phone);
  }

  async getCheckoutToday(phone) {
    return await dataService.getTodayAttendance(phone);
  }

  async deleteAttendance(phone, date) {
    let success = false;
    if (supabaseService.isAvailable()) {
      success = await supabaseService.deleteAttendance(phone, date);
    }
    // Always try to delete from local, even if Supabase failed or not available
    const localSuccess = await dataService.deleteAttendance(phone, date);
    return success || localSuccess;
  }

  async saveCustomer(customer) {
    const savedCustomer = await dataService.addCustomer(customer);

    if (supabaseService.isAvailable()) {
      await supabaseService.saveCustomer(savedCustomer);
    }

    if (googleSheetsService.isAvailable()) {
      await googleSheetsService.saveCustomer(savedCustomer);
    }

    return savedCustomer;
  }

  async getCustomers(options = {}) {
    if (supabaseService.isAvailable() && (options.spgPhone || options.date)) {
      return await supabaseService.getCustomers(options);
    }

    return await dataService.getCustomers();
  }

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

  getPhotoPath(filename) {
    return path.join(config.paths.photos, filename);
  }

  async getDailyStats(date) {
    if (supabaseService.isAvailable()) {
      return await supabaseService.getStats(date);
    }

    return await dataService.getDailyStats(date);
  }

  async getSpgList() {
    return await dataService.getSpgList();
  }
}

module.exports = new StorageService();
