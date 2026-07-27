/**
 * Attendance Handler
 * Handles attendance commands (masuk, pulang) with 2-step flow:
 * 1. User sends /masuk or /pulang command → Bot asks for photo
 * 2. User sends photo → Bot processes attendance
 */

const storageService = require('../services/storageService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const { extractPhoneNumber, getCurrentDate, getTimestamp } = require('../utils/helpers');

class AttendanceHandler {
  /**
   * Handle 'masuk' command - STEP 1: Ask for photo
   * @param {Object} msg - WhatsApp message object
   */
  async handleMasuk(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      
      // Check if already checked in today
      const todayAttendance = await storageService.getTodayAttendance(phone);
      
      if (todayAttendance && todayAttendance.type === 'masuk') {
        await msg.reply('❌ Kamu sudah absen masuk hari ini!\n\nGunakan /pulang untuk absen pulang.');
        return;
      }

      // Set session state: waiting for photo
      sessionService.setSession(phone, 'waiting_photo_masuk', {
        command: 'masuk',
        timestamp: Date.now(),
      });

      // Ask for photo
      await msg.reply(
        '📸 *Absen Masuk*\n\n' +
        'Silakan kirim foto selfie kamu di lokasi sekarang.\n\n' +
        '⏱️ Kamu punya waktu 5 menit untuk mengirim foto.'
      );

    } catch (error) {
      logger.error('Error in handleMasuk', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'pulang' command - STEP 1: Ask for photo
   * @param {Object} msg - WhatsApp message object
   */
  async handlePulang(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      
      // Check if already checked in first
      const todayAttendance = await storageService.getTodayAttendance(phone);
      
      if (!todayAttendance || todayAttendance.type !== 'masuk') {
        await msg.reply('❌ Kamu belum absen masuk hari ini!\n\nGunakan /masuk terlebih dahulu.');
        return;
      }

      // Check if already checked out
      const checkoutRecord = await storageService.getCheckoutToday(phone);
      if (checkoutRecord) {
        await msg.reply('❌ Kamu sudah absen pulang hari ini!');
        return;
      }

      // Set session state: waiting for photo
      sessionService.setSession(phone, 'waiting_photo_pulang', {
        command: 'pulang',
        timestamp: Date.now(),
      });

      // Ask for photo
      await msg.reply(
        '📸 *Absen Pulang*\n\n' +
        'Silakan kirim foto selfie kamu di lokasi sekarang.\n\n' +
        '⏱️ Kamu punya waktu 5 menit untuk mengirim foto.'
      );

    } catch (error) {
      logger.error('Error in handlePulang', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle photo message - STEP 2: Process attendance with photo
   * @param {Object} msg - WhatsApp message object with photo
   */
  async handlePhotoMessage(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      
      // Check if user has active session
      const session = sessionService.getSession(phone);
      
      if (!session) {
        // No active session, ignore photo
        return;
      }

      // Verify this is an image
      if (msg.type !== 'image') {
        await msg.reply('❌ Hanya foto/gambar yang diterima.\n\nSilakan kirim foto selfie kamu.');
        return;
      }

      await msg.reply('⏳ Sedang memproses absensi...');

      // Download photo
      let media = null;
      try {
        media = await msg.downloadMedia();
      } catch (error) {
        logger.error('Error downloading media', error);
      }

      // Save photo if available
      let savedPhoto = null;
      if (media && media.data) {
        const photoFilename = `${phone}_${Date.now()}.jpg`;
        savedPhoto = await storageService.savePhoto(media, photoFilename);
      }

      // Process based on session command
      if (session.state === 'waiting_photo_masuk') {
        await this.processMasuk(msg, phone, savedPhoto);
      } else if (session.state === 'waiting_photo_pulang') {
        await this.processPulang(msg, phone, savedPhoto);
      }

      // Clear session after processing
      sessionService.clearSession(phone);

    } catch (error) {
      logger.error('Error in handlePhotoMessage', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Process masuk attendance
   */
  async processMasuk(msg, phone, savedPhoto) {
    const attendance = {
      phone,
      type: 'masuk',
      date: getCurrentDate(),
      timestamp: getTimestamp(),
      photo: savedPhoto || 'no-photo',
      location: 'WhatsApp',
    };

    await storageService.saveAttendance(attendance);

    logger.info(`Attendance masuk recorded for ${phone}`);

    await msg.reply(
      '✅ *Absen Masuk Berhasil!*\n\n' +
      `📅 Tanggal: ${attendance.date}\n` +
      `⏰ Waktu: ${attendance.timestamp}\n` +
      (savedPhoto ? '📸 Foto: Tersimpan\n' : '⚠️ Foto: Gagal disimpan\n') +
      '\nSelamat bekerja! 💪'
    );
  }

  /**
   * Process pulang attendance
   */
  async processPulang(msg, phone, savedPhoto) {
    const attendance = {
      phone,
      type: 'pulang',
      date: getCurrentDate(),
      timestamp: getTimestamp(),
      photo: savedPhoto || 'no-photo',
      location: 'WhatsApp',
    };

    await storageService.saveAttendance(attendance);

    logger.info(`Attendance pulang recorded for ${phone}`);

    await msg.reply(
      '✅ *Absen Pulang Berhasil!*\n\n' +
      `📅 Tanggal: ${attendance.date}\n` +
      `⏰ Waktu: ${attendance.timestamp}\n` +
      (savedPhoto ? '📸 Foto: Tersimpan\n' : '⚠️ Foto: Gagal disimpan\n') +
      '\nTerima kasih atas kerja keras hari ini! 🙏'
    );
  }

  /**
   * Handle 'status' command
   */
  async handleStatus(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const todayAttendance = await storageService.getTodayAttendance(phone);

      if (!todayAttendance) {
        await msg.reply('📊 *Status Absensi Hari Ini*\n\n❌ Belum absen\n\nGunakan /masuk untuk absen masuk.');
        return;
      }

      const checkoutRecord = await storageService.getCheckoutToday(phone);
      
      let status = '📊 *Status Absensi Hari Ini*\n\n';
      status += `✅ Masuk: ${todayAttendance.timestamp}\n`;
      
      if (checkoutRecord) {
        status += `✅ Pulang: ${checkoutRecord.timestamp}\n\n`;
        status += 'Status: Sudah absen lengkap ✨';
      } else {
        status += '\n⏳ Belum absen pulang\n\nGunakan /pulang untuk absen pulang.';
      }

      await msg.reply(status);

    } catch (error) {
      logger.error('Error in handleStatus', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }
}

module.exports = new AttendanceHandler();
