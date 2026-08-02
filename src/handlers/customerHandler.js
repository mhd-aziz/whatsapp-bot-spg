/**
 * Customer Handler (Baileys Version)
 * Supports photo attachment: /customer Nama#NoHp#Kota → kirim foto bukti
 */

const fs = require('fs').promises;
const storageService = require('../services/storageService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const { extractPhoneNumber, validateImageBuffer, formatIndonesianDate } = require('../utils/helpers');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

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

  async handleListCustomers(msg) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const customers = await storageService.getSpgCustomers(phone);

      if (customers.length === 0) {
        await msg.reply('📋 Belum ada pelanggan yang kamu daftarkan.');
        return;
      }

      let list = '📋 *Daftar Pelangganmu:*\n\n';
      customers.forEach((c, i) => {
        list += `${i + 1}. ${c.name} (${c.phone}) - ${c.city}\n`;
      });

      await msg.reply(list);
    } catch (error) {
      logger.error('Error listing customers', error);
      await msg.reply('❌ Gagal mengambil daftar pelanggan.');
    }
  }

  async handleCustomerDetail(msg, sock, args) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const rawQuery = (args || '').trim();
      const query = rawQuery.toLowerCase();

      if (!query) {
        await msg.reply('⚠️ Gunakan: /detailcust <nama>\n\nContoh: /detailcust Budi');
        return;
      }

      const customers = await storageService.getSpgCustomers(phone);
      const matches = customers.filter((c) => c.name.toLowerCase().includes(query));

      if (matches.length === 0) {
        await msg.reply(`🔍 Customer dengan nama *"${rawQuery}"* tidak ditemukan.`);
        return;
      }

      if (matches.length > 1) {
        let text = `🔎 Ditemukan *${matches.length}* customer dengan nama mirip:\n\n`;
        matches.forEach((c, i) => {
          text += `${i + 1}. ${c.name} (${c.phone}) - ${c.city}\n`;
        });
        text += `\nKetik nama yang lebih spesifik, contoh: /detailcust ${matches[0].name}`;
        await msg.reply(text);
        return;
      }

      const c = matches[0];
      let time = '-';
      try {
        time = new Date(c.timestamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        // keep '-'
      }

      await msg.reply(
        `📋 *Detail Customer*\n\n` +
        `👤 Nama: ${c.name}\n` +
        `📱 No. HP: ${c.phone}\n` +
        `📍 Kota: ${c.city || '-'}\n` +
        `📅 Tanggal: ${formatIndonesianDate(c.date)}\n` +
        `⏰ Jam: ${time}`
      );

      if (c.photo) {
        try {
          const image = await fs.readFile(storageService.getPhotoPath(c.photo));
          await sock.sendMessage(msg.from, { image, caption: `📸 Foto ${c.name}` });
        } catch (error) {
          logger.warn(`Customer photo not found: ${c.photo}`, error);
        }
      }
    } catch (error) {
      logger.error('Error getting customer detail', error);
      await msg.reply('❌ Gagal mengambil detail customer.');
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
