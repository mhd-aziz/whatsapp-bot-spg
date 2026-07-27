/**
 * Command Handler (Baileys Version)
 */

const attendanceHandler = require('./attendanceHandler');
const customerHandler = require('./customerHandler');
const adminHandler = require('./adminHandler');
const sessionService = require('../services/sessionService');
const { extractPhoneNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

class CommandHandler {
  async handleMessage(msg, sock) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const session = sessionService.getSession(phone);

      if (msg.hasMedia && msg.type === 'image' && session && session.state) {
        await attendanceHandler.handlePhotoMessage(msg);
        return;
      }

      const body = (msg.body || '').trim();
      if (!body) return;

      const lowerBody = body.toLowerCase();

      if (body.includes('#') && !body.startsWith('/')) {
        await customerHandler.handleCustomerData(msg, body);
        return;
      }

      if (body.startsWith('/')) {
        await this.handleCommand(msg, sock, body);
        return;
      }

      if (await this.handleKeyword(msg, sock, lowerBody)) {
        return;
      }

      await this.handleUnknown(msg, lowerBody);

    } catch (error) {
      logger.error('Error handling message', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleCommand(msg, sock, body) {
    const parts = body.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/masuk':
        await attendanceHandler.handleMasuk(msg);
        break;
      case '/pulang':
        await attendanceHandler.handlePulang(msg);
        break;
      case '/status':
        await attendanceHandler.handleStatus(msg);
        break;
      case '/customer':
        if (args) await customerHandler.handleCustomerData(msg, args);
        else await customerHandler.handleCustomer(msg);
        break;
      case '/list':
        await customerHandler.handleList(msg);
        break;
      case '/total':
        await customerHandler.handleTotal(msg);
        break;
      case '/stats':
        await adminHandler.handleStats(msg);
        break;
      case '/rekap':
        await adminHandler.handleRekap(msg, args);
        break;
      case '/broadcast':
        await adminHandler.handleBroadcast(msg, sock, args);
        break;
      case '/admin':
        await adminHandler.handleAdminHelp(msg);
        break;
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
      case '/hapus_absen':
        await adminHandler.handleHapusAbsen(msg, args);
        break;
      default:
        await msg.reply('❓ Perintah tidak dikenal.\n\nKetik /help untuk daftar perintah.');
    }
  }

  async handleKeyword(msg, sock, body) {
    const keywords = {
      'masuk': () => attendanceHandler.handleMasuk(msg),
      'pulang': () => attendanceHandler.handlePulang(msg),
      'absen': () => attendanceHandler.handleStatus(msg),
      'status': () => attendanceHandler.handleStatus(msg),
      'customer': () => customerHandler.handleCustomer(msg),
      'pelanggan': () => customerHandler.handleCustomer(msg),
      'help': () => this.handleHelp(msg),
      'menu': () => this.handleHelp(msg),
      'p': () => msg.reply('🏓 Pong! Bot aktif.'),
      'halo': () => this.handleStart(msg),
      'hai': () => this.handleStart(msg),
      'hi': () => this.handleStart(msg),
    };

    if (keywords[body]) {
      await keywords[body]();
      return true;
    }
    return false;
  }

  async handleUnknown(msg, body) {
    const greetings = ['halo', 'hai', 'hi', 'hello', 'hey', 'selamat pagi', 'selamat siang', 'selamat malam'];
    if (greetings.some(g => body.includes(g))) {
      await this.handleStart(msg);
      return;
    }
    await msg.reply('👋 Hai! Ketik /help untuk melihat daftar perintah.');
  }

  async handleHelp(msg) {
    await msg.reply(
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
      '/ping - Cek status bot'
    );
  }

  async handleStart(msg) {
    await msg.reply(
      '👋 *Selamat Datang!*\n\n' +
      'Bot monitoring SPG/SPB Grab.\n\n' +
      'Ketik /help untuk melihat daftar perintah.'
    );
  }
}

module.exports = new CommandHandler();
