/**
 * Data Service
 * SQLite-backed data access for attendance and customer records
 */

const db = require('./databaseService');
const { getCurrentDate, getTimestamp } = require('../utils/helpers');
const logger = require('../utils/logger');

class DataService {
  initialize() {
    db.initialize();
  }

  // ---------- Attendance ----------

  async addAttendance(record) {
    const result = db.run(
      `INSERT INTO attendance (phone, date, type, timestamp, photo, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.phone,
        record.date || getCurrentDate(),
        record.type,
        record.timestamp || getTimestamp(),
        record.photo || null,
        record.latitude ?? null,
        record.longitude ?? null,
      ]
    );

    const saved = db.get('SELECT * FROM attendance WHERE id = ?', [result.lastInsertRowid]);
    logger.info(`Attendance recorded: ${record.phone} - ${record.type}`);
    return saved;
  }

  getTodayAttendance(phone) {
    const date = getCurrentDate();
    const row = db.get(
      'SELECT * FROM attendance WHERE phone = ? AND date = ? ORDER BY id DESC LIMIT 1',
      [phone, date]
    );
    return row || null;
  }

  hasAttendance(phone, date, type) {
    const row = db.get(
      'SELECT id FROM attendance WHERE phone = ? AND date = ? AND type = ? LIMIT 1',
      [phone, date, type]
    );
    return !!row;
  }

  deleteAttendance(phone, date) {
    const result = db.run('DELETE FROM attendance WHERE phone = ? AND date = ?', [phone, date]);
    return result.changes > 0;
  }

  getAttendanceByDate(date) {
    return db.all('SELECT * FROM attendance WHERE date = ? ORDER BY id ASC', [date]);
  }

  getAttendanceByDateAndPhone(date, phone) {
    return db.all(
      'SELECT * FROM attendance WHERE date = ? AND phone = ? ORDER BY id ASC',
      [date, phone]
    );
  }

  // ---------- Customers ----------

  async addCustomer(customer) {
    const result = db.run(
      `INSERT INTO customers (name, phone, city, spg_phone, date, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer.name,
        customer.phone,
        customer.city || '',
        customer.spg_phone,
        getCurrentDate(),
        getTimestamp(),
      ]
    );

    const saved = db.get('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    logger.info(`Customer added: ${customer.name} by ${customer.spg_phone}`);
    return saved;
  }

  getCustomersBySpg(spgPhone) {
    return db.all('SELECT * FROM customers WHERE spg_phone = ? ORDER BY id DESC', [spgPhone]);
  }

  getCustomerCountBySpg(spgPhone) {
    const row = db.get('SELECT COUNT(*) AS total FROM customers WHERE spg_phone = ?', [spgPhone]);
    return row.total;
  }

  // ---------- Stats & Users ----------

  getDailyStats(date = getCurrentDate()) {
    const masuk = db.get(
      "SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND type = 'masuk'",
      [date]
    ).total;
    const pulang = db.get(
      "SELECT COUNT(*) AS total FROM attendance WHERE date = ? AND type = 'pulang'",
      [date]
    ).total;
    const unique = db.get(
      'SELECT COUNT(DISTINCT phone) AS total FROM attendance WHERE date = ?',
      [date]
    ).total;
    const customers = db.get(
      'SELECT COUNT(*) AS total FROM customers WHERE date = ?',
      [date]
    ).total;

    return { date, masuk, pulang, unique, customers };
  }

  getSpgList() {
    const rows = db.all(`
      SELECT phone FROM attendance
      UNION
      SELECT spg_phone AS phone FROM customers
    `);
    return rows.map(row => row.phone).filter(Boolean);
  }
}

module.exports = new DataService();
