/**
 * Customer Handler (Baileys Version)
 * Supports photo attachment: /customer Nama#NoHp#Kota → kirim foto bukti
 */

const fs = require('fs').promises;
const storageService = require('../services/storageService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const { extractPhoneNumber, validateImageBuffer } = require('../utils/helpers');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_CUSTOMER_PHOTOS_PER_LIST = 10; // cap to avoid flooding chat on large lists

class CustomerHandler {
  async handleCustomerHelp(msg) {
    await msg.reply(
      '📝 *Registrasi Pelanggan Baru*\n\n' +
      'Silakan kirim data dengan format:\n' +
      '*Nama#NomorHP#Kota*\n\n' +
      'Contoh: Budi#081234567890#Jakarta\n\n' +
      '📸 Setelah itu kirim foto customer/bukti (berlaku 5 menit).'
    );
  }

  async handleSaveCustomer(msg, body) {
    try {
      const parts = body.split('#');
      if (parts.length < 3) {
        await msg.reply('⚠️ Format salah. Gunakan: Nama#NomorHP#Kota');
        return;
      }

      const [name, phone, city] = parts.map(p => p.trim());
      if (!name || !phone) {
        await msg.reply('⚠️ Nama dan nomor HP tidak boleh kosong.\n\nFormat: Nama#NomorHP#Kota');
        return;
      }

      const spgPhone = extractPhoneNumber(msg.from);

      const saved = await storageService.saveCustomer({
        name,
        phone,
        city,
        spg_phone: spgPhone,
      });

      // Ask for the customer photo (proof) right after saving the data
      sessionService.setSession(spgPhone, 'waiting_photo_customer', {
        timestamp: Date.now(),
        customerId: saved.id,
      });

      await msg.reply(
        `✅ Pelanggan *${name}* berhasil didaftarkan!\n\n` +
        `📸 Sekarang kirim foto customer/bukti (berlaku 5 menit).`
      );
    } catch (error) {
      logger.error('Error saving customer data', error);
      await msg.reply('❌ Gagal menyimpan data pelanggan.');
    }
  }

  async handleCustomerPhoto(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    if (!session || session.state !== 'waiting_photo_customer') return false;

    if (Date.now() - session.data.timestamp > SESSION_TIMEOUT_MS) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Session foto customer sudah expired.\n\nSilakan kirim /customer Nama#NoHp#Kota lagi.');
      return true;
    }

    const customerId = session.data.customerId;
    sessionService.clearSession(phone);

    if (!customerId) {
      logger.warn(`Customer photo session without customerId: ${phone}`);
      await msg.reply('❌ Data customer tidak ditemukan. Silakan daftar ulang dengan /customer Nama#NoHp#Kota.');
      return true;
    }

    try {
      await msg.reply('⏳ Sedang memproses foto...');
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

      const photoFilename = `customer_${phone}_${Date.now()}.jpg`;
      const savedPhoto = await storageService.savePhoto({ data: buffer.toString('base64') }, photoFilename);
      await storageService.updateCustomerPhoto(customerId, savedPhoto);

      await msg.reply('✅ Foto customer berhasil disimpan!');
      return true;
    } catch (error) {
      logger.error('Error saving customer photo', error);
      await msg.reply('❌ Terjadi kesalahan saat menyimpan foto.');
      return true;
    }
  }

  async handleListCustomers(msg, sock) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const customers = await storageService.getSpgCustomers(phone);

      if (customers.length === 0) {
        await msg.reply('📋 Belum ada pelanggan yang kamu daftarkan.');
        return;
      }

      let list = '📋 *Daftar Pelangganmu:*\n\n';
      customers.forEach((c, i) => {
        list += `${i + 1}. ${c.name} (${c.phone}) - ${c.city}${c.photo ? ' 📷' : ''}\n`;
      });

      await msg.reply(list);

      // Send each customer's photo as an attachment (capped to avoid flooding)
      let sent = 0;
      for (const c of customers) {
        if (!c.photo) continue;
        if (sent >= MAX_CUSTOMER_PHOTOS_PER_LIST) {
          await msg.reply(`…dan ${customers.filter((x) => x.photo).length - sent} foto lainnya.`);
          break;
        }
        try {
          const image = await fs.readFile(storageService.getPhotoPath(c.photo));
          await sock.sendMessage(msg.from, { image, caption: `📸 ${c.name} (${c.phone})` });
          sent += 1;
        } catch (error) {
          logger.warn(`Customer photo not found: ${c.photo}`, error);
        }
      }
    } catch (error) {
      logger.error('Error listing customers', error);
      await msg.reply('❌ Gagal mengambil daftar pelanggan.');
    }
  }

  async handleCustomerCount(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const total = await storageService.getSpgCustomerCount(phone);
      await msg.reply(`📊 Total pelanggan yang kamu daftarkan: *${total}* orang.`);
    } catch (error) {
      logger.error('Error getting customer count', error);
      await msg.reply('❌ Gagal mengambil total pelanggan.');
    }
  }
}

module.exports = new CustomerHandler();
