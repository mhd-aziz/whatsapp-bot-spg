/**
 * Command Handler
 * Routes commands to appropriate handlers
 */

const attendanceHandler = require('./attendanceHandler');
const customerHandler = require('./customerHandler');
const adminHandler = require('./adminHandler');
const logger = require('../utils/logger');

class CommandHandler {
  /**
   * Process incoming message and route to appropriate handler
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   */
  async handleMessage(msg, client) {
    // Handle photo messages first (for 2-step attendance flow)
    if (msg.hasMedia && msg.type === 'image') {
      await attendanceHandler.handlePhotoMessage(msg);
      return;
    }

    // Get body safely
    const body = (msg.body || '').trim();
    
    // Skip if empty
    if (!body) return;

    const lowerBody = body.toLowerCase();

      // Handle customer data format (nama#hp#kota)
      if (body.includes('#') && !body.startsWith('/')) {
        await customerHandler.handleCustomerData(msg, body);
        return;
      }

      // Handle commands
      if (body.startsWith('/')) {
        await this.handleCommand(msg, client, body);
        return;
      }

      // Handle keywords without slash
      if (await this.handleKeyword(msg, client, lowerBody)) {
        return;
      }

      // Unknown message
      await this.handleUnknown(msg, lowerBody);

    } catch (error) {
      logger.error('Error handling message', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle slash commands
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   * @param {string} body - Message body
   */
  async handleCommand(msg, client, body) {
    const parts = body.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    logger.debug(`Command received: ${command}`);

    switch (command) {
      // Attendance commands
      case '/masuk':
        await attendanceHandler.handleMasuk(msg, client);
        break;
      
      case '/pulang':
        await attendanceHandler.handlePulang(msg, client);
        break;
      
      case '/status':
        await attendanceHandler.handleStatus(msg);
        break;

      // Customer commands
      case '/customer':
        if (args) {
          await customerHandler.handleCustomerData(msg, args);
        } else {
          await customerHandler.handleCustomer(msg);
        }
        break;

      case '/list':
        await customerHandler.handleList(msg);
        break;

      case '/total':
        await customerHandler.handleTotal(msg);
        break;

      // Admin commands
      case '/stats':
        await adminHandler.handleStats(msg);
        break;

      case '/rekap':
        await adminHandler.handleRekap(msg, args);
        break;

      case '/broadcast':
        await adminHandler.handleBroadcast(msg, client, args);
        break;

      case '/admin':
        await adminHandler.handleAdminHelp(msg);
        break;

      // General commands
      case '/help':
      case '/menu':
        await this.handleHelp(msg);
        break;

      case '/start':
        await this.handleStart(msg);
        break;

      case '/ping':
        await msg.reply('🏓 Pong! Bot aktif.');
        break;

      default:
        await msg.reply(
          '❓ Perintah tidak dikenal.\n\n' +
          'Ketik /help untuk melihat daftar perintah.'
        );
    }
  }

  /**
   * Handle keywords (without slash prefix)
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   * @param {string} body - Lowercase message body
   * @returns {boolean} True if keyword was handled
   */
  async handleKeyword(msg, client, body) {
    const keywords = {
      // Attendance keywords
      'masuk': () => attendanceHandler.handleMasuk(msg, client),
      'pulang': () => attendanceHandler.handlePulang(msg, client),
      'absen': () => attendanceHandler.handleStatus(msg),
      'status': () => attendanceHandler.handleStatus(msg),
      
      // Customer keywords
      'customer': () => customerHandler.handleCustomer(msg),
      'pelanggan': () => customerHandler.handleCustomer(msg),
      
      // General keywords
      'help': () => this.handleHelp(msg),
      'menu': () => this.handleHelp(msg),
      'p': () => msg.reply('🏓 Pong! Bot aktif.'),
      'halo': () => this.handleStart(msg),
      'hai': () => this.handleStart(msg),
      'hi': () => this.handleStart(msg),
    };

    // Check for exact keyword match
    if (keywords[body]) {
      await keywords[body]();
      return true;
    }

    // Check for customer data format
    if (body.includes('#')) {
      await customerHandler.handleCustomerData(msg, body);
      return true;
    }

    return false;
  }

  /**
   * Handle unknown messages
   * @param {Object} msg - WhatsApp message object
   * @param {string} body - Message body
   */
  async handleUnknown(msg, body) {
    // Check if it's a greeting
    const greetings = ['halo', 'hai', 'hi', 'hello', 'hey', 'selamat pagi', 'selamat siang', 'selamat malam'];
    
    if (greetings.some(g => body.includes(g))) {
      await this.handleStart(msg);
      return;
    }

    // Default response for unknown messages
    await msg.reply(
      '👋 Hai! Saya adalah bot monitoring SPG/SPB.\n\n' +
      'Ketik /help untuk melihat daftar perintah yang tersedia.'
    );
  }

  /**
   * Handle help command
   * @param {Object} msg - WhatsApp message object
   */
  async handleHelp(msg) {
    const response = 
      '🤖 *WhatsApp Bot SPG/SPB*\n\n' +
      '*Absensi:*\n' +
      '/masuk - Absen masuk (dengan foto)\n' +
      '/pulang - Absen pulang (dengan foto)\n' +
      '/status - Cek status absensi\n\n' +
      '*Customer:*\n' +
      '/customer - Daftarkan customer baru\n' +
      '/list - Daftar customer\n' +
      '/total - Total customer\n\n' +
      '*Lainnya:*\n' +
      '/help - Bantuan\n' +
      '/ping - Cek status bot';

    await msg.reply(response);
  }

  /**
   * Handle start command
   * @param {Object} msg - WhatsApp message object
   */
  async handleStart(msg) {
    const response = 
      '👋 *Selamat Datang!*\n\n' +
      'Saya adalah bot monitoring SPG/SPB Grab.\n\n' +
      '*Fitur Utama:*\n' +
      '✅ Absensi masuk & pulang\n' +
      '📝 Registrasi customer\n' +
      '📊 Laporan harian\n\n' +
      'Ketik /help untuk melihat daftar perintah.';

    await msg.reply(response);
  }
}

module.exports = new CommandHandler();
