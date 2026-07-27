/**
 * Admin Handler (Baileys Version)
 */

const logger = require('../utils/logger');
const storageService = require('../services/storageService');
const { getCurrentDate } = require('../utils/helpers');

class AdminHandler {
  async handleStats(msg) {
    try {
      const stats = await storageService.getStats();
      await msg.reply(
        `📊 *Statistik Hari Ini*\n\n` +
        `📅 Tanggal: ${getCurrentDate()}\n` +
        `✅ Total Absen Masuk: ${stats.masuk}\n` +
        `🏠 Total Absen Pulang: ${stats.pulang}\n` +
        `👥 Total Pelanggan Baru: ${stats.customers}`
      );
    } catch (error) {
      logger.error('Error handling stats', error);
      await msg.reply('❌ Gagal mengambil statistik.');
    }
  }

  async handleRekap(msg, args) {
    try {
      const date = args || getCurrentDate();
      const rekap = await storageService.getRekap(date);
      await msg.reply(`📄 *Rekap Absensi ${date}*\n\n${rekap || 'Tidak ada data.'}`);
    } catch (error) {
      logger.error('Error handling rekap', error);
      await msg.reply('❌ Gagal mengambil rekap.');
    }
  }

  async handleBroadcast(msg, sock, text) {
    if (!text) {
      await msg.reply('⚠️ Sertakan pesan untuk broadcast.\nContoh: /broadcast Halo semuanya!');
      return;
    }

    try {
      const users = await storageService.getAllUsers();
      let success = 0;
      for (const user of users) {
        try {
          await sock.sendMessage(user.jid, { text: `📢 *BROADCAST*\n\n${text}` });
          success++;
        } catch (e) {
          logger.error(`Failed to send broadcast to ${user.jid}`, e);
        }
      }
      await msg.reply(`✅ Broadcast terkirim ke ${success}/${users.length} user.`);
    } catch (error) {
      logger.error('Error handling broadcast', error);
      await msg.reply('❌ Gagal menjalankan broadcast.');
    }
  }

  async handleHapusAbsen(msg, args) {
    try {
      const phone = args || msg.from.split('@')[0];
      const date = getCurrentDate();
      await storageService.deleteAttendance(phone, date);
      await msg.reply(`✅ Data absensi ${phone} tanggal ${date} telah dihapus.`);
    } catch (error) {
      logger.error('Error handling hapus absen', error);
      await msg.reply('❌ Gagal menghapus data absensi.');
    }
  }

  async handleAdminHelp(msg) {
    await msg.reply(
      '👑 *Menu Admin*\n\n' +
      '/stats - Statistik hari ini\n' +
      '/rekap [tanggal] - Rekap absensi\n' +
      '/broadcast [pesan] - Kirim pesan ke semua\n' +
      '/hapus_absen [nomor] - Hapus absen user'
    );
  }
}

module.exports = new AdminHandler();
