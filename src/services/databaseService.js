/**
 * Database Service
 * SQLite storage using node:sqlite (built-in, no external dependency)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  initialize() {
    if (this.db) return;

    const dir = path.dirname(config.paths.database);
    fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(config.paths.database);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.createTables();

    logger.info(`SQLite database initialized: ${config.paths.database}`);
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('masuk', 'pulang')),
        timestamp TEXT NOT NULL,
        photo TEXT,
        latitude REAL,
        longitude REAL
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_phone_date ON attendance (phone, date);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT,
        spg_phone TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_spg_date ON customers (spg_phone, date);
    `);
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }
}

module.exports = new DatabaseService();
