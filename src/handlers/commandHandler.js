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

// State yang mengunci pengguna: selama proses aktif, command lain diblokir
const ACTIVE_WIZARD = (state) =>
  state === 'customer_reg_name' ||
  state === 'customer_reg_phone' ||
  state === 'customer_reg_city' ||
  state === 'waiting_photo_customer' ||
  state === 'waiting_photo_checkin' ||
  state === 'waiting_photo_checkout' ||
  state.startsWith('edit_customer_') ||
  state.startsWith('delete_customer_');

const WIZARD_LABELS = {
  customer_reg_name: 'tambah customer',
  customer_reg_phone: 'tambah customer',
  customer_reg_city: 'tambah customer',
  waiting_photo_customer: 'tambah customer (foto bukti)',
  waiting_photo_checkin: 'absen masuk (foto lokasi)',
  waiting_photo_checkout: 'absen pulang (foto lokasi)',
  edit_customer_select: 'edit customer',
  edit_customer_field: 'edit customer',
  edit_customer_value: 'edit customer',
  edit_customer_photo: 'edit customer (foto)',
  delete_customer_select: 'hapus customer',
  delete_customer_confirm: 'hapus customer (konfirmasi)',
};

class CommandHandler {
  async handleMessage(msg, sock) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const session = sessionService.getSession(phone);

      if (msg.hasMedia && msg.type === 'image') {
        if (session && session.state) {
          if (session.state === 'waiting_photo_customer') {
            await customerHandler.handleCustomerPhoto(msg);
          } else if (session.state === 'edit_customer_photo') {
            await customerHandler.handleEditCustomerPhoto(msg);
          } else if (session.state === 'waiting_photo_checkin' || session.state === 'waiting_photo_checkout') {
            await attendanceHandler.handlePhotoMessage(msg);
          } else {
            await msg.reply(
              '📸 Foto diterima, tapi tidak ada proses yang membutuhkan foto saat ini.\n\n' +
              'Absensi: /masuk atau /pulang\n' +
              'Customer: /customer'
            );
          }
        } else {
          await msg.reply(
            '📸 Foto diterima, tapi belum ada proses yang membutuhkan foto.\n\n' +
            'Absensi: /masuk atau /pulang\n' +
            'Customer: /customer'
          );
        }
        return;
      }

      const body = (msg.body || '').trim();
      if (!body) return;

      const lowerBody = body.toLowerCase();
      const isCancel = lowerBody === 'batal' || lowerBody === 'cancel' || lowerBody === 'keluar';

      // === LOCK: selama wizard/proses aktif, semua command lain diblokir ===
      if (session && session.state && ACTIVE_WIZARD(session.state)) {
        const label = WIZARD_LABELS[session.state] || 'proses';

        // Command '/' saat proses aktif → blokir (harus selesaikan atau batal dulu)
        if (!isCancel && body.startsWith('/')) {
          await msg.reply(
            `⚠️ Ada proses *${label}* yang belum selesai.\n\n` +
            'Selesaikan dulu, atau ketik *batal* untuk membatalkannya.'
          );
          return;
        }

        // batal / balasan biasa → serahkan ke handler wizard
        if (session.state.startsWith('customer_reg_')) {
          await customerHandler.handleCustomerRegReply(msg, body);
          return;
        }
        if (session.state.startsWith('edit_customer_')) {
          await customerHandler.handleEditCustomerReply(msg, body);
          return;
        }
        if (session.state.startsWith('delete_customer_')) {
          await customerHandler.handleDeleteCustomerReply(msg, body);
          return;
        }
        if (session.state === 'waiting_photo_customer') {
          if (isCancel) {
            sessionService.clearSession(phone);
            await msg.reply('❌ Dibatalkan. Pelanggan sudah tersimpan tanpa foto.');
          } else if (lowerBody === 'lewat') {
            sessionService.clearSession(phone);
            await msg.reply('ℹ️ Pelanggan tersimpan tanpa foto.');
          } else {
            await msg.reply('📸 Kirim foto customer/bukti, ketik *lewat* jika tidak ada foto, atau *batal* untuk membatalkan.');
          }
          return;
        }
        if (session.state === 'waiting_photo_checkin' || session.state === 'waiting_photo_checkout') {
          if (isCancel) {
            sessionService.clearSession(phone);
            await msg.reply('❌ Dibatalkan. Absensi dibatalkan, kirim /masuk atau /pulang lagi kalau perlu.');
          } else {
            await msg.reply('📸 Kirim foto lokasi untuk absen, atau ketik *batal* untuk membatalkan.');
          }
          return;
        }
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
        await customerHandler.handleCustomerReg(msg, args);
        break;
      case '/list':
        await customerHandler.handleListCustomers(msg);
        break;
      case '/detailcust':
        await customerHandler.handleCustomerDetail(msg, sock, args);
        break;
      case '/editcust':
        await customerHandler.handleEditCustomer(msg, args);
        break;
      case '/hapuscust':
        await customerHandler.handleDeleteCustomer(msg, args);
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
      '/customer - Daftarkan customer baru (wizard + foto bukti)\n' +
      '/list - Daftar customer\n' +
      '/detailcust <nama> - Detail lengkap customer + foto\n' +
      '/editcust - Edit data customer (menu bernomor, bisa juga /editcust <nama>)\n' +
      '/hapuscust - Hapus customer (dengan konfirmasi, foto ikut terhapus)\n' +
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
