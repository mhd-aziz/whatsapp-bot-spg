/**
 * Configuration Module
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Bot Configuration
  bot: {
    port: parseInt(process.env.PORT) || 3000,
  },

  // Supervisor Configuration (comma-separated phone numbers, e.g. "6281...,6282...")
  supervisor: {
    phones: (process.env.SUPERVISOR_PHONES || '')
      .split(',')
      .map(s => s.trim())
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
    console.warn('   Isi di file .env, contoh: SUPERVISOR_PHONES=628123456789,628987654321');
  }
}

module.exports = {
  config,
  validateConfig,
};
