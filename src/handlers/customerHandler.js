/**
 * Customer Handler (Baileys Version)
 */

const storageService = require('../services/storageService');
const logger = require('../utils/logger');
const { extractPhoneNumber } = require('../utils/helpers');

class CustomerHandler {
  async handleCustomerHelp(msg) {
    await msg.reply(
      '📝 *Registrasi Pelanggan Baru*\n\n' +
      'Silakan kirim data dengan format:\n' +
      '*Nama#NomorHP#Kota*\n\n' +
      'Contoh: Budi#081234567890#Jakarta'
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

      await storageService.saveCustomer({
        name,
        phone,
        city,
        spg_phone: spgPhone,
      });

      await msg.reply(`✅ Pelanggan *${name}* berhasil didaftarkan!`);
    } catch (error) {
      logger.error('Error saving customer data', error);
      await msg.reply('❌ Gagal menyimpan data pelanggan.');
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
