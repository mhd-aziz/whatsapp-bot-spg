/**
 * Admin Handler (Baileys Version)
 */

const logger = require('../utils/logger');
const storageService = require('../services/storageService');
const { getCurrentDate, resolveDate, extractPhoneNumber } = require('../utils/helpers');

class AdminHandler {
  async handleStats(msg) {
    try {
      const stats = await storageService.getStats(getCurrentDate());
      await msg.reply(
        `📊 *Statistik Hari Ini*\n\n` +
        `📅 Tanggal: ${stats.date}\n` +
        `✅ Total Absen Masuk: ${stats.masuk}\n` +
        `🏠 Total Absen Pulang: ${stats.pulang}\n` +
        `👥 SPG Aktif: ${stats.unique}\n` +
        `👤 Total Pelanggan Baru: ${stats.customers}`
      );
    } catch (error) {
      logger.error('Error handling stats', error);
      await msg.reply('❌ Gagal mengambil statistik.');
    }
  }

  async handleRecap(msg, args) {
    try {
      const date = resolveDate(args);
      const records = await storageService.getRekap(date);

      if (!records || records.length === 0) {
        await msg.reply(`📄 *Rekap Absensi ${date}*\n\nTidak ada data.`);
        return;
      }

      // Group records per SPG, keeping the latest of each type
      const grouped = {};
      for (const record of records) {
        if (!grouped[record.phone]) {
          grouped[record.phone] = { masuk: null, pulang: null };
        }
        if (record.type === 'masuk') grouped[record.phone].masuk = record;
        if (record.type === 'pulang') grouped[record.phone].pulang = record;
      }

      const formatTime = (record) => {
        if (!record) return '-';
        return new Date(record.timestamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      let text = `📄 *Rekap Absensi ${date}*\n\n`;
      for (const [phone, times] of Object.entries(grouped)) {
        text += `👤 ${phone}\n`;
        text += `  ✅ Masuk: ${formatTime(times.masuk)}\n`;
        text += `  🏠 Pulang: ${formatTime(times.pulang)}\n\n`;
      }

      await msg.reply(text.trim());
    } catch (error) {
      logger.error('Error handling recap', error);
      await msg.reply('❌ Gagal mengambil rekap.');
    }
  }

  async handleBroadcast(msg, sock, text) {
    if (!text) {
      await msg.reply('⚠️ Sertakan pesan untuk broadcast.\nContoh: /broadcast Halo semuanya!');
      return;
    }

    try {
      const phones = await storageService.getAllUsers();
      let success = 0;

      for (const phone of phones) {
        try {
          await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: `📢 *BROADCAST*\n\n${text}` });
          success++;
        } catch (e) {
          logger.error(`Failed to send broadcast to ${phone}`, e);
        }
      }

      await msg.reply(`✅ Broadcast terkirim ke ${success}/${phones.length} user.`);
    } catch (error) {
      logger.error('Error handling broadcast', error);
      await msg.reply('❌ Gagal menjalankan broadcast.');
    }
  }

  async handleDeleteAttendance(msg, args) {
    try {
      const phone = args || extractPhoneNumber(msg.from);
      const date = getCurrentDate();
      const deleted = await storageService.deleteAttendance(phone, date);
      await msg.reply(
        deleted
          ? `✅ Data absensi ${phone} tanggal ${date} telah dihapus.`
          : `⚠️ Tidak ada data absensi ${phone} tanggal ${date}.`
      );
    } catch (error) {
      logger.error('Error handling delete attendance', error);
      await msg.reply('❌ Gagal menghapus data absensi.');
    }
  }

  async handleAdminHelp(msg) {
    await msg.reply(
      '👑 *Menu Admin*\n\n' +
      '/stats - Statistik hari ini\n' +
      '/rekap [tanggal] - Rekap absensi (kosong=hari ini, kemarin, DD-MM-YYYY, YYYY-MM-DD)\n' +
      '/broadcast [pesan] - Kirim pesan ke semua\n' +
      '/hapus_absen [nomor] - Hapus absen user'
    );
  }
}

module.exports = new AdminHandler();
