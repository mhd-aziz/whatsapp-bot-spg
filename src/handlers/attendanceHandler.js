/**
 * Attendance Handler
 * Handles attendance commands (masuk, pulang)
 */

const storageService = require('../services/storageService');
const logger = require('../utils/logger');
const { extractPhoneNumber, getCurrentDate, getTimestamp } = require('../utils/helpers');

class AttendanceHandler {
  /**
   * Handle 'masuk' command
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   */
  async handleMasuk(msg, client) {
    const phone = extractPhoneNumber(msg.from);
    
    try {
      // Check if already checked in today
      const todayAttendance = await storageService.getTodayAttendance(phone);
      
      if (todayAttendance && todayAttendance.type === 'masuk') {
        await msg.reply('❌ Kamu sudah absen masuk hari ini!\n\nGunakan /pulang untuk absen pulang.');
        return;
      }

      // Check if message has media
      if (!msg.hasMedia) {
        await msg.reply(
          '📸 *Absen Masuk*\n\n' +
          'Untuk absen masuk, kirim perintah:\n' +
          '/masuk\n\n' +
          'Dan lampirkan foto selfie kamu di lokasi.'
        );
        return;
      }

      // Verify media type is image
      if (msg.type !== 'image' && msg.type !== 'sticker') {
        await msg.reply('❌ Hanya foto/gambar yang diterima untuk absensi.\n\nKirim ulang dengan foto selfie kamu.');
        return;
      }

      // Download photo with retry logic
      await msg.reply('⏳ Sedang memproses absensi...');
      
      let media;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          media = await msg.downloadMedia();
          if (media && media.data) {
            break; // Success
          }
        } catch (downloadError) {
          retryCount++;
          
          // Extract error details more carefully
          let errorMsg = 'Unknown error';
          let errorStack = '';
          
          if (downloadError) {
            if (typeof downloadError === 'string') {
              errorMsg = downloadError;
            } else if (downloadError.message) {
              errorMsg = downloadError.message;
            } else if (downloadError.toString && typeof downloadError.toString === 'function') {
              errorMsg = downloadError.toString();
            } else {
              // Try to stringify the error object
              try {
                errorMsg = JSON.stringify(downloadError);
              } catch (e) {
                errorMsg = 'Error object cannot be serialized';
              }
            }
            
            if (downloadError.stack) {
              errorStack = downloadError.stack;
            }
          }
          
          if (retryCount >= maxRetries) {
            logger.error('Error downloading media for masuk after retries', `${errorMsg}\n${errorStack}`);
            // SKIP FOTO - Continue without photo instead of failing
            logger.warn('Continuing attendance without photo due to download error');
            await msg.reply('⚠️ Gagal download foto, tapi absensi tetap diproses...');
            media = null; // Set null to skip photo
            break;
          }
          
          // Wait before retry
          logger.warn(`Retry downloading media (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!media || !media.data) {
        logger.warn('No media data available, proceeding without photo');
      }

      // Save photo if available
      let savedPhoto = null;
      if (media && media.data) {
        const photoFilename = `${phone}_${Date.now()}.jpg`;
        savedPhoto = await storageService.savePhoto(media, photoFilename);
        
        if (!savedPhoto) {
          logger.warn('Failed to save photo, continuing without it');
        }
      }

      // Get location if available
      let latitude = null;
      let longitude = null;
      
      if (msg.location) {
        latitude = msg.location.latitude;
        longitude = msg.location.longitude;
      }

      // Save attendance
      const record = await storageService.saveAttendance({
        phone,
        type: 'masuk',
        photo: savedPhoto,
        latitude,
        longitude,
      });

      // Send confirmation
      const response = 
        '✅ *Absen Masuk Berhasil!*\n\n' +
        `📅 Tanggal: ${record.date}\n` +
        `⏰ Waktu: ${new Date(record.timestamp).toLocaleTimeString('id-ID')}\n` +
        `📸 Foto: Tersimpan\n` +
        (latitude ? `📍 Lokasi: ${latitude}, ${longitude}\n` : '') +
        '\nSelamat bekerja! 💪';

      await msg.reply(response);
      logger.info(`Attendance recorded: ${phone} - masuk`);
    } catch (error) {
      logger.error('Error handling masuk command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'pulang' command
   * @param {Object} msg - WhatsApp message object
   * @param {Object} client - WhatsApp client
   */
  async handlePulang(msg, client) {
    const phone = extractPhoneNumber(msg.from);
    
    try {
      // Check if already checked in today
      const todayAttendance = await storageService.getTodayAttendance(phone);
      
      if (!todayAttendance || todayAttendance.type !== 'masuk') {
        await msg.reply('❌ Kamu belum absen masuk hari ini!\n\nGunakan /masuk terlebih dahulu.');
        return;
      }

      if (todayAttendance.type === 'pulang') {
        await msg.reply('❌ Kamu sudah absen pulang hari ini!');
        return;
      }

      // Check if message has photo
      if (!msg.hasMedia) {
        await msg.reply(
          '📸 *Absen Pulang*\n\n' +
          'Untuk absen pulang, kirim perintah:\n' +
          '/pulang\n\n' +
          'Dan lampirkan foto selfie kamu di lokasi.'
        );
        return;
      }

      // Download photo with retry logic
      await msg.reply('⏳ Sedang memproses absensi...');
      
      let media;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          media = await msg.downloadMedia();
          if (media && media.data) {
            break; // Success
          }
        } catch (downloadError) {
          retryCount++;
          
          // Extract error details more carefully
          let errorMsg = 'Unknown error';
          let errorStack = '';
          
          if (downloadError) {
            if (typeof downloadError === 'string') {
              errorMsg = downloadError;
            } else if (downloadError.message) {
              errorMsg = downloadError.message;
            } else if (downloadError.toString && typeof downloadError.toString === 'function') {
              errorMsg = downloadError.toString();
            } else {
              // Try to stringify the error object
              try {
                errorMsg = JSON.stringify(downloadError);
              } catch (e) {
                errorMsg = 'Error object cannot be serialized';
              }
            }
            
            if (downloadError.stack) {
              errorStack = downloadError.stack;
            }
          }
          
          if (retryCount >= maxRetries) {
            logger.error('Error downloading media for masuk after retries', `${errorMsg}\n${errorStack}`);
            // SKIP FOTO - Continue without photo instead of failing
            logger.warn('Continuing attendance without photo due to download error');
            await msg.reply('⚠️ Gagal download foto, tapi absensi tetap diproses...');
            media = null; // Set null to skip photo
            break;
          }
          
          // Wait before retry
          logger.warn(`Retry downloading media (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!media || !media.data) {
        logger.warn('No media data available, proceeding without photo');
      }

      // Save photo if available
      let savedPhoto = null;
      if (media && media.data) {
        const photoFilename = `${phone}_${Date.now()}.jpg`;
        savedPhoto = await storageService.savePhoto(media, photoFilename);
        
        if (!savedPhoto) {
          logger.warn('Failed to save photo, continuing without it');
        }
      }

      // Get location if available
      let latitude = null;
      let longitude = null;
      
      if (msg.location) {
        latitude = msg.location.latitude;
        longitude = msg.location.longitude;
      }

      // Save attendance
      const record = await storageService.saveAttendance({
        phone,
        type: 'pulang',
        photo: savedPhoto,
        latitude,
        longitude,
      });

      // Send confirmation
      const response = 
        '✅ *Absen Pulang Berhasil!*\n\n' +
        `📅 Tanggal: ${record.date}\n` +
        `⏰ Waktu: ${new Date(record.timestamp).toLocaleTimeString('id-ID')}\n` +
        `📸 Foto: Tersimpan\n` +
        (latitude ? `📍 Lokasi: ${latitude}, ${longitude}\n` : '') +
        '\nTerima kasih atas kerja keras hari ini! 🎉';

      await msg.reply(response);
      logger.info(`Attendance recorded: ${phone} - pulang`);
    } catch (error) {
      logger.error('Error handling pulang command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'status' command - check attendance status
   * @param {Object} msg - WhatsApp message object
   */
  async handleStatus(msg) {
    const phone = extractPhoneNumber(msg.from);
    
    try {
      const todayAttendance = await storageService.getTodayAttendance(phone);
      
      if (!todayAttendance) {
        await msg.reply(
          '📊 *Status Absensi Hari Ini*\n\n' +
          '❌ Belum absen masuk\n\n' +
          'Gunakan /masuk untuk absen masuk.'
        );
        return;
      }

      const masukTime = new Date(todayAttendance.timestamp).toLocaleTimeString('id-ID');
      
      let response = '📊 *Status Absensi Hari Ini*\n\n';
      
      if (todayAttendance.type === 'masuk') {
        response += 
          `✅ Sudah absen masuk\n` +
          `⏰ Waktu: ${masukTime}\n\n` +
          'Jangan lupa absen pulang dengan /pulang';
      } else if (todayAttendance.type === 'pulang') {
        response += 
          `✅ Sudah absen masuk\n` +
          `✅ Sudah absen pulang\n` +
          `⏰ Waktu pulang: ${masukTime}\n\n` +
          'Terima kasih! 🎉';
      }

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling status command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }
}

module.exports = new AttendanceHandler();
