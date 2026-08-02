/**
 * Admin Handler (Baileys Version)
 */

const fs = require('fs').promises;
const logger = require('../utils/logger');
const storageService = require('../services/storageService');
const {
  getCurrentDate,
  resolveDate,
  extractPhoneNumber,
  normalizePhoneNumber,
  formatIndonesianDate,
} = require('../utils/helpers');

class AdminHandler {
  async handleStats(msg) {
    try {
      const stats = await storageService.getStats(getCurrentDate());
      await msg.reply(
        `📊 *Statistik Hari Ini* (${formatIndonesianDate(stats.date)})\n\n` +
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
      const dateLabel = formatIndonesianDate(date);

      if (!records || records.length === 0) {
        await msg.reply(`📄 *Rekap Absensi ${dateLabel}*\n\nTidak ada data.`);
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
        try {
          return new Date(record.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return '-';
        }
      };

      let text = `📄 *Rekap Absensi ${dateLabel}*\n\n`;
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

  async handleDetail(msg, sock, args) {
    try {
      const phone = normalizePhoneNumber(args);
      if (!phone) {
        await msg.reply(
          '⚠️ Gunakan: /detail <nomor hp>\n' +
          'Contoh: /detail 087876629341\n' +
          'Contoh: /detail 6287876629341'
        );
        return;
      }

      const date = getCurrentDate();
      const records = await storageService.getAttendanceByDateAndPhone(date, phone);

      if (!records || records.length === 0) {
        await msg.reply(
          `📄 Tidak ada data absensi ${phone} pada ${formatIndonesianDate(date)}.`
        );
        return;
      }

      // Keep only the latest record of each type (records are ordered by id ASC)
      const latest = { masuk: null, pulang: null };
      for (const record of records) {
        latest[record.type] = record;
      }

      const formatTime = (record) => {
        if (!record) return '-';
        try {
          return new Date(record.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return '-';
        }
      };

      let text = `📄 *Detail Absensi*\n\n` +
        `👤 Nomor: ${phone}\n` +
        `📅 Tanggal: ${formatIndonesianDate(date)}\n\n` +
        `✅ Masuk: ${formatTime(latest.masuk)}\n` +
        `🏠 Pulang: ${formatTime(latest.pulang)}`;

      await msg.reply(text);

      // Send the SPG's photos (masuk & pulang) as attachments
      for (const record of [latest.masuk, latest.pulang]) {
        if (!record || !record.photo) continue;
        try {
          const image = await fs.readFile(storageService.getPhotoPath(record.photo));
          const label = record.type === 'masuk' ? 'Foto Masuk' : 'Foto Pulang';
          await sock.sendMessage(msg.from, {
            image,
            caption: `${label} — ${phone} ${formatTime(record)}`,
          });
        } catch (error) {
          logger.error(`Failed to send photo ${record.photo}`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error handling detail', error);
      await msg.reply('❌ Gagal mengambil detail absensi.');
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
      const hasArgs = (args || '').trim().length > 0;
      const phone = hasArgs ? normalizePhoneNumber(args) : extractPhoneNumber(msg.from);
      if (!phone) {
        await msg.reply(
          '⚠️ Nomor tidak valid. Gunakan: /hapus_absen <nomor>\n' +
          'Contoh: /hapus_absen 087876629341'
        );
        return;
      }
      const date = getCurrentDate();
      const deleted = await storageService.deleteAttendance(phone, date);
      await msg.reply(
        deleted
          ? `✅ Data absensi ${phone} tanggal ${formatIndonesianDate(date)} telah dihapus.`
          : `⚠️ Tidak ada data absensi ${phone} tanggal ${formatIndonesianDate(date)}.`
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
      '/rekap [tanggal] - Rekap absensi (kosong=hari ini, kemarin, atau 8 oktober 2026)\n' +
      '/detail [nomor] - Detail absensi + foto SPG hari ini\n' +
      '/broadcast [pesan] - Kirim pesan ke semua\n' +
      '/hapus_absen [nomor] - Hapus absen user (bisa 08xx atau 628xx)'
    );
  }
}

module.exports = new AdminHandler();
