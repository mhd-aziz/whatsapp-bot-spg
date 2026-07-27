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

  async ensureDirectories() {
    try {
      await fs.mkdir(this.paths.data, { recursive: true });
      await fs.mkdir(this.paths.photos, { recursive: true });
      logger.debug('Data directories ensured');
    } catch (error) {
      logger.error('Failed to create data directories', error.message);
    }
  }

  async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      logger.error(`Error reading ${filePath}`, error.message);
      return [];
    }
  }

  async writeJsonFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      logger.error(`Error writing ${filePath}`, error.message);
      return false;
    }
  }

  async getAttendance() {
    return this.readJsonFile(this.paths.attendance);
  }

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

  async getTodayAttendance(phone) {
    const attendance = await this.getAttendance();
    const today = getCurrentDate();
    
    return attendance.find(a => a.phone === phone && a.date === today);
  }

  async deleteAttendance(phone, date) {
    const attendance = await this.getAttendance();
    const initialLength = attendance.length;
    const newAttendance = attendance.filter(a => !(a.phone === phone && a.date === date));
    
    if (initialLength === newAttendance.length) {
      return false; // Nothing was deleted
    }
    
    await this.writeJsonFile(this.paths.attendance, newAttendance);
    return true;
  }

  async getAttendanceByDateRange(startDate, endDate) {
    const attendance = await this.getAttendance();
    return attendance.filter(a => a.date >= startDate && a.date <= endDate);
  }

  async getCustomers() {
    return this.readJsonFile(this.paths.customers);
  }

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

  async getCustomersBySpg(spgPhone) {
    const customers = await this.getCustomers();
    return customers.filter(c => c.spgPhone === spgPhone);
  }

  async getCustomerCountByDate(date) {
    const customers = await this.getCustomers();
    return customers.filter(c => c.date === date).length;
  }

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

module.exports = new DataService();
