/**
 * Data Service
 * Handles local JSON file operations for attendance and customer data
 */

const fs = require('fs').promises;
const path = require('path');
const { config } = require('../config');
const logger = require('../utils/logger');
const { getTimestamp, getCurrentDate, generateId } = require('../utils/helpers');

class DataService {
  constructor() {
    this.paths = config.paths;
    this.ensureDirectories();
  }

  /**
   * Ensure data directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.paths.data, { recursive: true });
      await fs.mkdir(this.paths.photos, { recursive: true });
      logger.debug('Data directories ensured');
    } catch (error) {
      logger.error('Failed to create data directories', error.message);
    }
  }

  /**
   * Read JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Array|Object} Parsed JSON data or empty array/object
   */
  async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      logger.error(`Error reading ${filePath}`, error.message);
      return [];
    }
  }

  /**
   * Write JSON file
   * @param {string} filePath - Path to JSON file
   * @param {Array|Object} data - Data to write
   */
  async writeJsonFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      logger.debug(`Data saved to ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Error writing ${filePath}`, error.message);
      return false;
    }
  }

  // ==================== ATTENDANCE METHODS ====================

  /**
   * Get all attendance records
   * @returns {Array} Attendance records
   */
  async getAttendance() {
    return this.readJsonFile(this.paths.attendance);
  }

  /**
   * Add attendance record
   * @param {Object} record - Attendance record
   * @param {string} record.phone - User phone number
   * @param {string} record.type - 'masuk' or 'pulang'
   * @param {string} record.photo - Photo filename
   * @param {string} record.latitude - GPS latitude
   * @param {string} record.longitude - GPS longitude
   * @returns {Object} Created record
   */
  async addAttendance(record) {
    const attendance = await this.getAttendance();
    
    const newRecord = {
      id: generateId(),
      phone: record.phone,
      date: getCurrentDate(),
      type: record.type,
      timestamp: getTimestamp(),
      photo: record.photo || null,
      latitude: record.latitude || null,
      longitude: record.longitude || null,
    };

    attendance.push(newRecord);
    await this.writeJsonFile(this.paths.attendance, attendance);
    
    logger.info(`Attendance recorded: ${record.phone} - ${record.type}`);
    return newRecord;
  }

  /**
   * Get today's attendance for a user
   * @param {string} phone - User phone number
   * @returns {Object|null} Today's attendance record or null
   */
  async getTodayAttendance(phone) {
    const attendance = await this.getAttendance();
    const today = getCurrentDate();
    
    return attendance.find(a => a.phone === phone && a.date === today);
  }

  /**
   * Get attendance by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Attendance records
   */
  async getAttendanceByDateRange(startDate, endDate) {
    const attendance = await this.getAttendance();
    return attendance.filter(a => a.date >= startDate && a.date <= endDate);
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Get all customer records
   * @returns {Array} Customer records
   */
  async getCustomers() {
    return this.readJsonFile(this.paths.customers);
  }

  /**
   * Add customer record
   * @param {Object} customer - Customer data
   * @param {string} customer.nama - Customer name
   * @param {string} customer.hp - Customer phone
   * @param {string} customer.kota - Customer city
   * @param {string} customer.spgPhone - SPG phone number
   * @returns {Object} Created customer record
   */
  async addCustomer(customer) {
    const customers = await this.getCustomers();
    
    const newCustomer = {
      id: generateId(),
      nama: customer.nama,
      hp: customer.hp,
      kota: customer.kota || '',
      spgPhone: customer.spgPhone,
      date: getCurrentDate(),
      timestamp: getTimestamp(),
    };

    customers.push(newCustomer);
    await this.writeJsonFile(this.paths.customers, customers);
    
    logger.info(`Customer added: ${customer.nama} by ${customer.spgPhone}`);
    return newCustomer;
  }

  /**
   * Get customers by SPG phone
   * @param {string} spgPhone - SPG phone number
   * @returns {Array} Customer records
   */
  async getCustomersBySpg(spgPhone) {
    const customers = await this.getCustomers();
    return customers.filter(c => c.spgPhone === spgPhone);
  }

  /**
   * Get customer count by date
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {number} Customer count
   */
  async getCustomerCountByDate(date) {
    const customers = await this.getCustomers();
    return customers.filter(c => c.date === date).length;
  }

  // ==================== STATISTICS METHODS ====================

  /**
   * Get daily statistics
   * @param {string} date - Date (YYYY-MM-DD), defaults to today
   * @returns {Object} Statistics
   */
  async getDailyStats(date = getCurrentDate()) {
    const attendance = await this.getAttendance();
    const customers = await this.getCustomers();

    const dayAttendance = attendance.filter(a => a.date === date);
    const dayCustomers = customers.filter(c => c.date === date);

    const masuk = dayAttendance.filter(a => a.type === 'masuk');
    const pulang = dayAttendance.filter(a => a.type === 'pulang');

    return {
      date,
      attendance: {
        masuk: masuk.length,
        pulang: pulang.length,
        unique: [...new Set(dayAttendance.map(a => a.phone))].length,
      },
      customers: dayCustomers.length,
    };
  }

  /**
   * Get all SPG/SPB list
   * @returns {Array} List of unique SPG/SPB phone numbers
   */
  async getSpgList() {
    const attendance = await this.getAttendance();
    const customers = await this.getCustomers();
    
    const phones = new Set([
      ...attendance.map(a => a.phone),
      ...customers.map(c => c.spgPhone),
    ]);
    
    return [...phones].filter(p => p);
  }
}

// Export singleton instance
module.exports = new DataService();
