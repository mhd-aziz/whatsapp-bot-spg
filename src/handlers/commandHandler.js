/**
 * Command Handler (Baileys Version)
 */

const attendanceHandler = require('./attendanceHandler');
const customerHandler = require('./customerHandler');
const adminHandler = require('./adminHandler');
const sessionService = require('../services/sessionService');
const { extractPhoneNumber } = require('../utils/helpers');
const { config } = require('../config');
const logger = require('../utils/logger');

const ADMIN_COMMANDS = ['/stats', '/rekap', '/broadcast', '/hapus_absen', '/detail', '/admin'];

class CommandHandler {
  async handleMessage(msg, sock) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const session = sessionService.getSession(phone);

      if (msg.hasMedia && msg.type === 'image') {
        if (session && session.state) {
          if (session.state === 'waiting_photo_customer') {
            await customerHandler.handleCustomerPhoto(msg);
          } else {
            await attendanceHandler.handlePhotoMessage(msg);
          }
        } else {
          await msg.reply(
            '📸 Foto diterima, tapi belum ada proses yang membutuhkan foto.\n\n' +
            'Absensi: /masuk atau /pulang\n' +
            'Customer: /customer Nama#NoHp#Kota'
          );
        }
        return;
      }

      const body = (msg.body || '').trim();
      if (!body) return;

      const lowerBody = body.toLowerCase();

      if (body.includes('#') && !body.startsWith('/')) {
        await customerHandler.handleSaveCustomer(msg, body);
        return;
      }

      if (body.startsWith('/')) {
        const command = body.split(/\s+/)[0].toLowerCase();

        if (ADMIN_COMMANDS.includes(command) && !config.supervisor.phones.includes(phone)) {
          await msg.reply('⛔ Perintah ini khusus supervisor.');
          return;
        }

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
        await attendanceHandler.handleCheckIn(msg);
        break;
      case '/pulang':
        await attendanceHandler.handleCheckOut(msg);
        break;
      case '/status':
        await attendanceHandler.handleStatus(msg, sock);
        break;
      case '/customer':
        if (args) await customerHandler.handleSaveCustomer(msg, args);
        else await customerHandler.handleCustomerHelp(msg);
        break;
      case '/list':
        await customerHandler.handleListCustomers(msg, sock);
        break;
      case '/total':
        await customerHandler.handleCustomerCount(msg);
        break;
      case '/stats':
        await adminHandler.handleStats(msg);
        break;
      case '/rekap':
        await adminHandler.handleRecap(msg, args);
        break;
      case '/detail':
        await adminHandler.handleDetail(msg, sock, args);
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
        await adminHandler.handleDeleteAttendance(msg, args);
        break;
      default:
        await msg.reply('❓ Perintah tidak dikenal.\n\nKetik /help untuk daftar perintah.');
    }
  }

  async handleKeyword(msg, sock, body) {
    const keywords = {
      'masuk': () => attendanceHandler.handleCheckIn(msg),
      'pulang': () => attendanceHandler.handleCheckOut(msg),
      'absen': () => attendanceHandler.handleStatus(msg, sock),
      'status': () => attendanceHandler.handleStatus(msg, sock),
      'customer': () => customerHandler.handleCustomerHelp(msg),
      'pelanggan': () => customerHandler.handleCustomerHelp(msg),
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
      '/status - Cek status + foto masuk/pulang\n\n' +
      '*Customer:*\n' +
      '/customer - Daftarkan customer baru + foto bukti\n' +
      '/list - Daftar customer + foto\n' +
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
