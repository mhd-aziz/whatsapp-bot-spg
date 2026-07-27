/**
 * Admin Handler
 * Handles admin commands
 */

const logger = require('../utils/logger');
const storageService = require('../services/storageService');
const supabaseService = require('../services/supabaseService');
const dataService = require('../services/dataService');
const { extractPhoneNumber, getCurrentDate, formatDate } = require('../utils/helpers');
const { config } = require('../config');

class AdminHandler {
  isAdmin(phone) {
    const userPhone = extractPhoneNumber(phone);
    const adminPhone = extractPhoneNumber(config.supervisor.phone);
    return userPhone === adminPhone;
  }

  async handleStats(msg) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    try {
      const date = getCurrentDate();
      const stats = await storageService.getDailyStats(date);

      const response = 
        '📊 *Statistik Hari Ini*\n' +
        `📅 Tanggal: ${formatDate(date)}\n\n` +
        `✅ Masuk: ${stats.attendance.masuk}\n` +
        `🏠 Pulang: ${stats.attendance.pulang}\n` +
        `👥 Total Unik: ${stats.attendance.unique}\n\n` +
        `📝 Total Customer: ${stats.customers}`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling stats', error);
      await msg.reply('❌ Terjadi kesalahan saat mengambil statistik.');
    }
  }

  async handleRekap(msg, dateStr) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    try {
      let date = dateStr || getCurrentDate();
      
      if (dateStr === 'kemarin') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        date = d.toISOString().split('T')[0];
      } else if (dateStr === 'hari ini') {
        date = getCurrentDate();
      }

      const attendance = await storageService.getAttendance({ date });
      
      let response = `📋 *Rekap Absensi ${formatDate(date)}*\n\n`;

      if (attendance.length === 0) {
        response += 'Tidak ada data absensi.';
      } else {
        const grouped = {};
        attendance.forEach(a => {
          if (!grouped[a.phone]) grouped[a.phone] = { masuk: false, pulang: false };
          grouped[a.phone][a.type] = true;
        });

        Object.entries(grouped).forEach(([phone, data]) => {
          response += `• ${phone}: `;
          response += data.masuk ? '✅ Masuk' : '❌ Belum Masuk';
          response += ' | ';
          response += data.pulang ? '✅ Pulang' : '❌ Belum Pulang';
          response += '\n';
        });
      }

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling rekap', error);
      await msg.reply('❌ Terjadi kesalahan saat mengambil rekap.');
    }
  }

  async handleBroadcast(msg, message) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    if (!message) {
      await msg.reply('❌ Gunakan format: /broadcast [pesan]');
      return;
    }

    try {
      const spgList = await storageService.getSpgList();
      let successCount = 0;

      for (const phone of spgList) {
        try {
          const chatId = `${phone}@c.us`;
          await this.client.sendMessage(chatId, `📢 *Pengumuman Admin*\n\n${message}`);
          successCount++;
        } catch (error) {
          logger.error(`Failed to send broadcast to ${phone}`, error);
        }
      }

      await msg.reply(`✅ Broadcast berhasil dikirim ke ${successCount} SPG/SPB.`);
    } catch (error) {
      logger.error('Error handling broadcast', error);
      await msg.reply('❌ Terjadi kesalahan saat mengirim broadcast.');
    }
  }

  async handleAdminHelp(msg) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    const response = 
      '👑 *Menu Admin/Supervisor*\n\n' +
      '*Perintah Absensi:*\n' +
      '/stats - Statistik hari ini\n' +
      '/rekap [tanggal] - Rekap absensi\n' +
      '/broadcast [pesan] - Kirim pesan ke semua\n' +
      '/hapus_absen [nomor_hp] - Hapus absensi hari ini\n\n' +
      '*Contoh Perintah:*\n' +
      '/hapus_absen 0812345678';

    await msg.reply(response);
  }

  async handleHapusAbsen(msg, targetPhone) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    if (!targetPhone) {
      await msg.reply('❌ Gunakan format: /hapus_absen [nomor_hp]\nContoh: /hapus_absen 0812345678');
      return;
    }

    try {
      let cleanPhone = targetPhone.trim().replace(/^0/, '62');
      if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

      const date = getCurrentDate();
      
      const success = await storageService.deleteAttendance(cleanPhone, date);

      if (success) {
        await msg.reply(`✅ Berhasil menghapus absensi ${cleanPhone} untuk tanggal ${date}`);
        logger.info(`Admin deleted attendance for ${cleanPhone} on ${date}`);
      } else {
        await msg.reply(`❌ Data absensi ${cleanPhone} untuk hari ini tidak ditemukan.`);
      }
    } catch (error) {
      logger.error('Error handling hapus_absen command', error);
      await msg.reply('❌ Terjadi kesalahan saat menghapus data.');
    }
  }
}

module.exports = new AdminHandler();
