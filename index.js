/**
 * WhatsApp Bot SPG/SPB - Entry Point
 * 
 * Bot untuk monitoring SPG (Sales Promotion Girl) dan SPB (Sales Promotion Boy)
 * dengan fitur absensi dan registrasi customer.
 */

const bot = require('./src/app');
const logger = require('./src/utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT. Shutting down...');
  await bot.shutdown();
});

// Handle SIGTERM (kill command)
process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM. Shutting down...');
  await bot.shutdown();
});

// Start the bot
console.log('====================================');
console.log('  WhatsApp Bot SPG/SPB Monitoring');
console.log('====================================\n');

bot.initialize().catch((error) => {
  logger.error('Failed to initialize bot', error);
  process.exit(1);
});
