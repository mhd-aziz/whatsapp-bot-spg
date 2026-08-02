/**
 * Configuration Module
 * Loads environment variables from .env.dev (development) or .env.prod (production)
 * based on NODE_ENV. Defaults to development.
 */

const path = require('path');
const fs = require('fs');
const { normalizePhoneNumber } = require('../utils/helpers');

// Map standard NODE_ENV values to env file suffixes
const ENV_FILE_MAP = { production: 'prod', development: 'dev' };
const nodeEnv = process.env.NODE_ENV || 'dev';
const envName = ENV_FILE_MAP[nodeEnv] || nodeEnv;
const envPath = path.resolve(__dirname, '../..', `.env.${envName}`);

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn(`⚠️  .env.${envName} tidak ditemukan. Salin template: cp .env.example .env.${envName}`);
}

const config = {
  // Environment
  nodeEnv,
  // Bot Configuration
  bot: {
    port: parseInt(process.env.PORT) || 3000,
  },

  // Supervisor Configuration (comma-separated phone numbers, e.g. "6281...,6282...")
  supervisor: {
    phones: (process.env.SUPERVISOR_PHONES || '')
      .split(',')
      .map(s => normalizePhoneNumber(s))
      .filter(Boolean),
  },

  // Data Paths
  paths: {
    data: './data',
    photos: './data/photos',
    database: './data/spg.db',
  },
};

/**
 * Validate required configuration
 */
function validateConfig() {
  if (config.supervisor.phones.length === 0) {
    console.warn('⚠️  Warning: SUPERVISOR_PHONES kosong. Perintah admin akan dinonaktifkan.');
    console.warn('   Isi di file .env.dev atau .env.prod, contoh: SUPERVISOR_PHONES=628123456789,628987654321');
  }
}

module.exports = {
  config,
  validateConfig,
};
