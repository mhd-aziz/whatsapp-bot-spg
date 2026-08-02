/**
 * Attendance Handler (Baileys Version)
 */

const fs = require('fs').promises;
const storageService = require('../services/storageService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const { extractPhoneNumber, getCurrentDate, formatIndonesianDate, validateImageBuffer } = require('../utils/helpers');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

class AttendanceHandler {
  async handleCheckIn(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const today = getCurrentDate();

      if (await storageService.hasAttendance(phone, today, 'masuk')) {
        await msg.reply('❌ Kamu sudah absen masuk hari ini!\n\nGunakan /pulang untuk absen pulang.');
        return;
      }

      sessionService.setSession(phone, 'waiting_photo_checkin', { timestamp: Date.now() });
      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen masuk.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling check-in command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleCheckOut(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const today = getCurrentDate();

      if (await storageService.hasAttendance(phone, today, 'pulang')) {
        await msg.reply('❌ Kamu sudah absen pulang hari ini!');
        return;
      }

      sessionService.setSession(phone, 'waiting_photo_checkout', { timestamp: Date.now() });
      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen pulang.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling check-out command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleStatus(msg, sock) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const today = getCurrentDate();
      const records = await storageService.getAttendanceByDateAndPhone(today, phone);

      if (!records || records.length === 0) {
        await msg.reply('📋 *Status Absensi Hari Ini*\n\n❌ Belum ada absensi.\n\nKirim /masuk untuk absen masuk.');
        return;
      }

      // Keep only the latest record of each type
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

      await msg.reply(
        `📋 *Status Absensi Hari Ini*\n\n` +
        `📅 Tanggal: ${formatIndonesianDate(today)}\n\n` +
        `✅ Masuk: ${formatTime(latest.masuk)}${latest.masuk && latest.masuk.photo ? ' 📷' : ''}\n` +
        `🏠 Pulang: ${formatTime(latest.pulang)}${latest.pulang && latest.pulang.photo ? ' 📷' : ''}`
      );

      // Send the SPG's own photos (masuk & pulang) as attachments
      for (const record of [latest.masuk, latest.pulang]) {
        if (!record || !record.photo) continue;
        try {
          const image = await fs.readFile(storageService.getPhotoPath(record.photo));
          const label = record.type === 'masuk' ? 'Foto Masuk' : 'Foto Pulang';
          await sock.sendMessage(msg.from, { image, caption: `${label} — ${formatTime(record)}` });
        } catch (error) {
          logger.warn(`Photo not found for status: ${record.photo}`, error);
        }
      }
    } catch (error) {
      logger.error('Error handling status command', error);
      await msg.reply('❌ Terjadi kesalahan saat mengecek status.');
    }
  }

  async handlePhotoMessage(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    if (!session || !session.state) return false;
    if (session.state !== 'waiting_photo_checkin' && session.state !== 'waiting_photo_checkout') return false;

    if (Date.now() - session.data.timestamp > SESSION_TIMEOUT_MS) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Session absensi sudah expired.\n\nSilakan kirim /masuk atau /pulang lagi.');
      return true;
    }

    if (!msg.hasMedia) {
      await msg.reply('⚠️ Kirim foto, bukan teks.\n\nKirim foto lokasi kamu untuk absen.');
      return true;
    }

    const attendanceType = session.state === 'waiting_photo_checkin' ? 'masuk' : 'pulang';

    try {
      await msg.reply('⏳ Sedang memproses absensi...');
      const buffer = await msg.downloadMedia();

      if (!buffer) {
        await msg.reply('❌ Gagal mengunduh foto. Silakan kirim foto lagi.');
        return true;
      }

      const validation = validateImageBuffer(buffer);
      if (!validation.ok) {
        await msg.reply(`❌ ${validation.error} Silakan kirim foto lain.`);
        return true;
      }

      const photoFilename = `${phone}_${Date.now()}.jpg`;
      const savedPhoto = await storageService.savePhoto({ data: buffer.toString('base64') }, photoFilename);
      if (!savedPhoto) {
        await msg.reply('❌ Gagal menyimpan foto ke server. Coba kirim foto lagi.');
        return true;
      }

      await storageService.saveAttendance({
        phone,
        type: attendanceType,
        photo: savedPhoto,
        latitude: null,
        longitude: null,
      });
      sessionService.clearSession(phone);

      const emoji = attendanceType === 'masuk' ? '✅' : '🏠';
      const label = attendanceType === 'masuk' ? 'MASUK' : 'PULANG';
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      await msg.reply(
        `${emoji} *Absensi ${label} Berhasil!*\n\n` +
        `📅 Tanggal: ${getCurrentDate()}\n` +
        `⏰ Waktu: ${time}\n` +
        (savedPhoto ? `📷 Foto: Tersimpan\n` : '') +
        `\nTerima kasih!`
      );

      return true;
    } catch (error) {
      logger.error(`Error processing ${attendanceType} attendance`, error);
      await msg.reply('❌ Terjadi kesalahan saat memproses absensi.');
      return true;
    }
  }
}

module.exports = new AttendanceHandler();
