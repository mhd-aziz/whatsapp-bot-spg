/**
 * Storage Service
 * Thin facade over the data layer (SQLite). Single entry point for handlers.
 */

const fs = require('fs').promises;
const path = require('path');
const dataService = require('./dataService');
const { config } = require('../config');
const logger = require('../utils/logger');

class StorageService {
  async initialize() {
    dataService.initialize();
    logger.info('Storage services initialized');
  }

  // ---------- Attendance ----------

  saveAttendance(record) {
    return dataService.addAttendance(record);
  }

  getTodayAttendance(phone) {
    return dataService.getTodayAttendance(phone);
  }

  hasAttendance(phone, date, type) {
    return dataService.hasAttendance(phone, date, type);
  }

  deleteAttendance(phone, date) {
    return dataService.deleteAttendance(phone, date);
  }

  getRekap(date) {
    return dataService.getAttendanceByDate(date);
  }

  getAttendanceByDateAndPhone(date, phone) {
    return dataService.getAttendanceByDateAndPhone(date, phone);
  }

  getStats(date) {
    return dataService.getDailyStats(date);
  }

  // ---------- Customers ----------

  saveCustomer(customer) {
    return dataService.addCustomer(customer);
  }

  getSpgCustomers(spgPhone) {
    return dataService.getCustomersBySpg(spgPhone);
  }

  getSpgCustomerCount(spgPhone) {
    return dataService.getCustomerCountBySpg(spgPhone);
  }

  updateCustomerPhoto(id, photo) {
    return dataService.updateCustomerPhoto(id, photo);
  }

  updateCustomer(id, updates) {
    return dataService.updateCustomer(id, updates);
  }

  deleteCustomer(id) {
    return dataService.deleteCustomer(id);
  }

  // ---------- Users ----------

  getAllUsers() {
    return dataService.getSpgList();
  }

  // ---------- Photos ----------

  async savePhoto(media, filename) {
    try {
      const buffer = await media.data;
      const photoDir = config.paths.photos;
      await fs.mkdir(photoDir, { recursive: true });
      const photoPath = path.join(photoDir, filename);

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

  /** Hapus file foto dari disk (best-effort: gagal hanya di-log, tidak throw) */
  async deletePhotoFile(filename) {
    if (!filename) return;
    try {
      await fs.unlink(path.join(config.paths.photos, filename));
      logger.debug(`Photo deleted: ${filename}`);
    } catch (error) {
      logger.warn(`Failed to delete photo file: ${filename}`, error.message);
    }
  }
}

module.exports = new StorageService();
