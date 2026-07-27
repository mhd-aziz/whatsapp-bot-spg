/**
 * Configuration Module
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Bot Configuration
  bot: {
    number: process.env.BOT_NUMBER || '',
    clientName: process.env.CLIENT_NAME || 'SPG_Monitoring_Bot',
    port: parseInt(process.env.PORT) || 3000,
  },

  // Supervisor Configuration
  supervisor: {
    phone: process.env.SUPERVISOR_PHONE || '',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
  },

  // Google Sheets Configuration (Optional)
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
    credentialsFile: process.env.GOOGLE_CREDENTIALS_FILE || './credentials.json',
  },

  // Puppeteer Configuration
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
  },

  // Data Paths
  paths: {
    data: './data',
    photos: './data/photos',
    attendance: './data/attendance.json',
    customers: './data/customers.json',
  },

  // Admin Settings
  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
    allowedPrefixes: (process.env.ALLOWED_PHONE_PREFIXES || '+628,+62').split(','),
  },
};

/**
 * Validate required configuration
 */
function validateConfig() {
  const required = [
    { key: 'SUPERVISOR_PHONE', value: config.supervisor.phone },
  ];

  const missing = required.filter(item => !item.value);

  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing configuration:');
    missing.forEach(item => console.warn(`   - ${item.key}`));
    console.warn('   Some features may not work correctly.');
  }

  // Validate Supabase config if any is provided
  if (config.supabase.url && !config.supabase.anonKey) {
    console.warn('⚠️  Warning: SUPABASE_URL provided but SUPABASE_ANON_KEY is missing');
  }

  return missing.length === 0;
}

module.exports = {
  config,
  validateConfig,
};
