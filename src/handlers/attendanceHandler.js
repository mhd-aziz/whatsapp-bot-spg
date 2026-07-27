/**
 * Attendance Handler (Baileys Version)
 */

const storageService = require('../services/storageService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const { extractPhoneNumber, getCurrentDate } = require('../utils/helpers');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

class AttendanceHandler {
  async handleMasuk(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const todayAttendance = await storageService.getTodayAttendance(phone);

      if (todayAttendance && todayAttendance.type === 'masuk') {
        await msg.reply('❌ Kamu sudah absen masuk hari ini!\n\nGunakan /pulang untuk absen pulang.');
        return;
      }

      sessionService.setSession(phone, 'waiting_photo_masuk', { timestamp: Date.now() });
      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen masuk.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling masuk command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handlePulang(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const todayAttendance = await storageService.getTodayAttendance(phone);

      if (todayAttendance && todayAttendance.type === 'pulang') {
        await msg.reply('❌ Kamu sudah absen pulang hari ini!');
        return;
      }

      sessionService.setSession(phone, 'waiting_photo_pulang', { timestamp: Date.now() });
      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen pulang.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling pulang command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleStatus(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const todayAttendance = await storageService.getTodayAttendance(phone);

      if (!todayAttendance) {
        await msg.reply('📋 *Status Absensi Hari Ini*\n\n❌ Belum ada absensi.\n\nKirim /masuk untuk absen masuk.');
        return;
      }

      const emoji = todayAttendance.type === 'masuk' ? '✅' : '🏠';
      const label = todayAttendance.type === 'masuk' ? 'MASUK' : 'PULANG';

      await msg.reply(
        `📋 *Status Absensi Hari Ini*\n\n` +
        `${emoji} Status: *${label}*\n` +
        `📅 Tanggal: ${todayAttendance.date}\n` +
        `⏰ Waktu: ${todayAttendance.timestamp}\n` +
        (todayAttendance.photo ? `📷 Foto: Tersimpan\n` : '')
      );
    } catch (error) {
      logger.error('Error handling status command', error);
      await msg.reply('❌ Terjadi kesalahan saat mengecek status.');
    }
  }

  async handlePhotoMessage(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    if (!session || !session.state) return false;

    if (Date.now() - session.data.timestamp > SESSION_TIMEOUT_MS) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Session absensi sudah expired.\n\nSilakan kirim /masuk atau /pulang lagi.');
      return true;
    }

    if (!msg.hasMedia) {
      await msg.reply('⚠️ Kirim foto, bukan teks.\n\nKirim foto lokasi kamu untuk absen.');
      return true;
    }

    const attendanceType = session.state === 'waiting_photo_masuk' ? 'masuk' : 'pulang';
    sessionService.clearSession(phone);

    try {
      await msg.reply('⏳ Sedang memproses absensi...');
      const buffer = await msg.downloadMedia();
      
      if (!buffer) {
        await msg.reply('❌ Gagal mengunduh foto. Silakan coba lagi dengan /' + attendanceType);
        return true;
      }

      const photoFilename = `${phone}_${Date.now()}.jpg`;
      const savedPhoto = await storageService.savePhoto({ data: buffer.toString('base64') }, photoFilename);

      await storageService.saveAttendance({
        phone,
        type: attendanceType,
        photo: savedPhoto,
        latitude: null,
        longitude: null,
      });

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
