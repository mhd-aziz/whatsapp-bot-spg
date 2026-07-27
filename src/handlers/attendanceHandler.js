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

// Session timeout: 5 minutes
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
// Max retries for downloadMedia
const MAX_DOWNLOAD_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
      sessionService.setSession(phone, {
        command: 'waiting_photo_masuk',
        timestamp: Date.now(),
      });

      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen masuk.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling masuk command', error);
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

      // Check if already checked out today
      const todayAttendance = await storageService.getTodayAttendance(phone);

      if (todayAttendance && todayAttendance.type === 'pulang') {
        await msg.reply('❌ Kamu sudah absen pulang hari ini!');
        return;
      }

      // Set session state: waiting for photo
      sessionService.setSession(phone, {
        command: 'waiting_photo_pulang',
        timestamp: Date.now(),
      });

      await msg.reply('📸 Kirim foto lokasi kamu sekarang untuk absen pulang.\n\n⏰ Session berlaku 5 menit.');
    } catch (error) {
      logger.error('Error handling pulang command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Check if session is still valid (not expired)
   * @param {Object} session - Session object
   * @returns {boolean}
   */
  isSessionValid(session) {
    if (!session || !session.timestamp) return false;
    return (Date.now() - session.timestamp) < SESSION_TIMEOUT_MS;
  }

  /**
   * Download media with retry logic
   * @param {Object} msg - WhatsApp message
   * @param {string} phone - Phone number for logging
   * @returns {Object|null} Media object or null
   */
  async downloadMediaWithRetry(msg, phone) {
    for (let attempt = 1; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.data) {
          return media;
        }
        logger.warn(`Download attempt ${attempt}/${MAX_DOWNLOAD_RETRIES} returned empty media`, { phone });
      } catch (error) {
        logger.warn(`Download attempt ${attempt}/${MAX_DOWNLOAD_RETRIES} failed`, {
          phone,
          error: error.message,
        });
      }

      // Wait before retry (except last attempt)
      if (attempt < MAX_DOWNLOAD_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
    return null;
  }

  /**
   * Handle photo message - STEP 2: Process attendance
   * @param {Object} msg - WhatsApp message object
   */
  async handlePhotoMessage(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    // No active session → ignore photo (not in attendance flow)
    if (!session || !session.command) {
      return false;
    }

    // Check session timeout
    if (!this.isSessionValid(session)) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Session absensi sudah expired.\n\nSilakan kirim /masuk atau /pulang lagi.');
      return true;
    }

    // Must have media
    if (!msg.hasMedia) {
      await msg.reply('⚠️ Kirim foto, bukan teks.\n\nKirim foto lokasi kamu untuk absen.');
      return true;
    }

    const attendanceType = session.command === 'waiting_photo_masuk' ? 'masuk' : 'pulang';

    // Clear session immediately (prevent double processing)
    sessionService.clearSession(phone);

    try {
      // Step 1: Send processing message
      await msg.reply('⏳ Sedang memproses absensi...');

      // Step 2: Download photo with retry
      const media = await this.downloadMediaWithRetry(msg, phone);

      if (!media) {
        logger.error('Failed to download media after all retries', { phone, type: attendanceType });
        await msg.reply('❌ Gagal mengunduh foto setelah beberapa percobaan.\n\nSilakan coba lagi dengan /' + attendanceType);
        return true;
      }

      // Step 3: Save photo
      const photoFilename = `${phone}_${Date.now()}.jpg`;
      const savedPhoto = await storageService.savePhoto(media, photoFilename);

      // Step 4: Save attendance record
      const record = await storageService.saveAttendance({
        phone,
        type: attendanceType,
        photo: savedPhoto,
        latitude: null,
        longitude: null,
      });

      // Step 5: Send confirmation
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

      logger.info(`Attendance ${attendanceType} recorded`, {
        phone,
        date: getCurrentDate(),
        photo: savedPhoto,
      });

      return true;
    } catch (error) {
      logger.error(`Error processing ${attendanceType} attendance`, error);
      await msg.reply('❌ Terjadi kesalahan saat memproses absensi.\n\nSilakan coba lagi.');
      return true;
    }
  }
}

module.exports = new AttendanceHandler();
