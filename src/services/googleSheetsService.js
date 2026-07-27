/**
 * Google Sheets Service
 * Handles saving data to Google Sheets
 */

const { google } = require('googleapis');
const { config } = require('../config');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.isConnected = false;
  }

  /**
   * Initialize Google Sheets client
   */
  async initialize() {
    if (!config.googleSheets.spreadsheetId) {
      logger.debug('Google Sheets ID not configured. Skipping initialization.');
      return;
    }

    try {
      const credentialsPath = path.resolve(config.googleSheets.credentialsFile);
      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.isConnected = true;
      
      logger.info('Google Sheets client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets client', error.message);
    }
  }

  /**
   * Check if Google Sheets is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isConnected && this.sheets !== null;
  }

  /**
   * Append row to spreadsheet
   * @param {string} sheetName - Sheet name/tab
   * @param {Array} values - Row values
   * @returns {Promise<boolean>}
   */
  async appendRow(sheetName, values) {
    if (!this.isAvailable()) return false;

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [values],
        },
      });
      
      logger.debug(`Row appended to Google Sheets: ${sheetName}`);
      return true;
    } catch (error) {
      logger.error('Failed to append row to Google Sheets', error.message);
      return false;
    }
  }

  /**
   * Save attendance record to Google Sheets
   * @param {Object} record - Attendance record
   */
  async saveAttendance(record) {
    if (!this.isAvailable()) return false;

    const values = [
      record.date,
      record.timestamp,
      record.phone,
      record.type,
      record.photo || '',
      record.latitude || '',
      record.longitude || '',
    ];

    return this.appendRow('Attendance', values);
  }

  /**
   * Save customer record to Google Sheets
   * @param {Object} customer - Customer data
   */
  async saveCustomer(customer) {
    if (!this.isAvailable()) return false;

    const values = [
      customer.date,
      customer.timestamp,
      customer.spgPhone,
      customer.nama,
      customer.hp,
      customer.kota || '',
    ];

    return this.appendRow('Customers', values);
  }

  /**
   * Get all data from sheet
   * @param {string} sheetName - Sheet name/tab
   * @returns {Promise<Array>}
   */
  async getSheetData(sheetName) {
    if (!this.isAvailable()) return [];

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      return response.data.values || [];
    } catch (error) {
      logger.error(`Failed to get data from sheet ${sheetName}`, error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new GoogleSheetsService();
