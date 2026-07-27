/**
 * Admin Handler
 * Handles admin commands (statistics, reports, etc.)
 */

const storageService = require('../services/storageService');
const logger = require('../utils/logger');
const { config } = require('../config');
const { extractPhoneNumber, getCurrentDate } = require('../utils/helpers');

class AdminHandler {
  /**
   * Check if user is supervisor/admin
   * @param {string} from - WhatsApp ID
   * @returns {boolean}
   */
  isAdmin(from) {
    const phone = extractPhoneNumber(from);
    const supervisorPhone = config.supervisor.phone.replace(/[@c.us]/g, '');
    return phone === supervisorPhone || from === config.supervisor.phone;
  }

  /**
   * Handle 'stats' command - show daily statistics
   * @param {Object} msg - WhatsApp message object
   */
  async handleStats(msg) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    const today = getCurrentDate();
    
    try {
      const stats = await storageService.getDailyStats(today);
      
      const response = 
        '📊 *Laporan Harian*\n\n' +
        `📅 Tanggal: ${stats.date}\n\n` +
        '*Absensi:*\n' +
        `✅ Masuk: ${stats.attendance.masuk} orang\n` +
        `✅ Pulang: ${stats.attendance.pulang} orang\n\n` +
        '*Customer:*\n' +
        `👤 Terdaftar: ${stats.customers} orang`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling stats command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'rekap' command - show attendance recap
   * @param {Object} msg - WhatsApp message object
   * @param {string} params - Command parameters (date or date range)
   */
  async handleRekap(msg, params) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    try {
      let date = getCurrentDate();
      
      // Parse date parameter if provided
      if (params) {
        // Accept formats: YYYY-MM-DD or DD-MM-YYYY
        const cleanParam = params.trim();
        
        // Try DD-MM-YYYY format
        const dmyMatch = cleanParam.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmyMatch) {
          date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        }
        // Try YYYY-MM-DD format
        else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanParam)) {
          date = cleanParam;
        }
        // Today/yesterday shortcuts
        else if (cleanParam.toLowerCase() === 'kemarin') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          date = yesterday.toISOString().split('T')[0];
        }
        else if (cleanParam.toLowerCase() !== 'hari ini') {
          await msg.reply(
            '❌ Format tanggal tidak valid!\n\n' +
            'Gunakan format:\n' +
            '- YYYY-MM-DD (contoh: 2024-01-15)\n' +
            '- DD-MM-YYYY (contoh: 15-01-2024)\n' +
            '- hari ini\n' +
            '- kemarin'
          );
          return;
        }
      }

      const stats = await storageService.getDailyStats(date);
      const spgList = await storageService.getSpgList();
      
      // Get attendance details
      const attendance = await storageService.getAttendance({ date });
      const masukList = attendance.filter(a => a.type === 'masuk');
      const pulangList = attendance.filter(a => a.type === 'pulang');

      let response = 
        `📋 *Rekap Absensi*\n` +
        `📅 Tanggal: ${date}\n\n`;

      if (masukList.length > 0) {
        response += '*✅ Masuk:*\n';
        masukList.forEach(a => {
          const time = new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          response += `   ${a.phone.slice(-6)} - ${time}\n`;
        });
        response += '\n';
      }

      if (pulangList.length > 0) {
        response += '*✅ Pulang:*\n';
        pulangList.forEach(a => {
          const time = new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          response += `   ${a.phone.slice(-6)} - ${time}\n`;
        });
        response += '\n';
      }

      // Missing people
      const masukPhones = new Set(masukList.map(a => a.phone));
      const pulangPhones = new Set(pulangList.map(a => a.phone));
      const belumPulang = [...masukPhones].filter(p => !pulangPhones.has(p));

      if (belumPulang.length > 0) {
        response += '*⚠️ Belum Pulang:*\n';
        belumPulang.forEach(p => {
          response += `   ${p.slice(-6)}\n`;
        });
        response += '\n';
      }

      response += 
        `*Ringkasan:*\n` +
        `Total SPG/SPB: ${spgList.length}\n` +
        `Hadir: ${masukList.length}\n` +
        `Sudah Pulang: ${pulangList.length}\n` +
        `Customer Baru: ${stats.customers}`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling rekap command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'broadcast' command - send message to all SPG/SPB
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   * @param {string} message - Message to broadcast
   */
  async handleBroadcast(msg, client, message) {
    if (!this.isAdmin(msg.from)) {
      await msg.reply('❌ Perintah ini hanya untuk admin/supervisor.');
      return;
    }

    if (!message) {
      await msg.reply(
        '📢 *Broadcast Message*\n\n' +
        'Untuk mengirim pesan ke semua SPG/SPB:\n' +
        '/broadcast [pesan]\n\n' +
        'Contoh:\n' +
        '/broadcast Jangan lupa absen ya!'
      );
      return;
    }

    try {
      const spgList = await storageService.getSpgList();
      
      if (spgList.length === 0) {
        await msg.reply('❌ Tidak ada SPG/SPB terdaftar.');
        return;
      }

      await msg.reply(`⏳ Mengirim broadcast ke ${spgList.length} SPG/SPB...`);

      let successCount = 0;
      let failCount = 0;

      for (const phone of spgList) {
        try {
          const chatId = phone.includes('@') ? phone : `${phone}@c.us`;
          await client.sendMessage(chatId, `📢 *Pesan Broadcast*\n\n${message}`);
          successCount++;
          
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          failCount++;
          logger.error(`Failed to send broadcast to ${phone}`, err.message);
        }
      }

      const response = 
        '✅ *Broadcast Selesai*\n\n' +
        `📤 Terkirim: ${successCount}\n` +
        `❌ Gagal: ${failCount}`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling broadcast command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'help' command for admin
   * @param {Object} msg - WhatsApp message object
   */
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
      '/broadcast [pesan] - Kirim pesan ke semua\n\n' +
      '*Format Tanggal:*\n' +
      '- YYYY-MM-DD (2024-01-15)\n' +
      '- DD-MM-YYYY (15-01-2024)\n' +
      '- hari ini / kemarin';

    await msg.reply(response);
  }
}

module.exports = new AdminHandler();
