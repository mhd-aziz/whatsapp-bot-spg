/**
 * Customer Handler
 * Handles customer registration commands
 */

const storageService = require('../services/storageService');
const logger = require('../utils/logger');
const { extractPhoneNumber, getCurrentDate } = require('../utils/helpers');

class CustomerHandler {
  /**
   * Handle 'customer' command - start customer registration
   * @param {Object} msg - WhatsApp message object
   */
  async handleCustomer(msg) {
    const phone = extractPhoneNumber(msg.from);
    
    try {
      const response = 
        '📝 *Registrasi Customer Baru*\n\n' +
        'Untuk mendaftarkan customer baru, kirim data dengan format:\n\n' +
        'nama_customer#hp_customer#kota\n\n' +
        'Contoh:\n' +
        'Budi Santoso#081234567890#Jakarta\n\n' +
        'Atau gunakan:\n' +
        '/customer nama_customer#hp_customer#kota';

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling customer command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Parse and save customer data
   * @param {Object} msg - WhatsApp message object
   * @param {string} data - Customer data string (nama#hp#kota)
   */
  async handleCustomerData(msg, data) {
    const spgPhone = extractPhoneNumber(msg.from);
    
    try {
      // Parse customer data
      const parts = data.split('#').map(p => p.trim());
      
      if (parts.length < 2) {
        await msg.reply(
          '❌ Format data tidak valid!\n\n' +
          'Gunakan format:\n' +
          'nama_customer#hp_customer#kota\n\n' +
          'Contoh:\n' +
          'Budi Santoso#081234567890#Jakarta'
        );
        return;
      }

      const [nama, hp, kota = ''] = parts;

      // Validate phone number
      if (!hp || hp.length < 10) {
        await msg.reply('❌ Nomor HP tidak valid! Pastikan nomor HP benar.');
        return;
      }

      // Validate name
      if (!nama || nama.length < 2) {
        await msg.reply('❌ Nama customer tidak valid! Minimal 2 karakter.');
        return;
      }

      // Save customer
      const customer = await storageService.saveCustomer({
        nama,
        hp,
        kota,
        spgPhone,
      });

      // Send confirmation
      const response = 
        '✅ *Customer Berhasil Didaftarkan!*\n\n' +
        `👤 Nama: ${customer.nama}\n` +
        `📱 HP: ${customer.hp}\n` +
        `🏙️ Kota: ${customer.kota || '-'}\n` +
        `📅 Tanggal: ${customer.date}\n` +
        `⏰ Waktu: ${new Date(customer.timestamp).toLocaleTimeString('id-ID')}\n\n` +
        'Terima kasih! 🎉';

      await msg.reply(response);
      logger.info(`Customer registered: ${nama} by ${spgPhone}`);
    } catch (error) {
      logger.error('Error handling customer data', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'list' command - list customers added by SPG
   * @param {Object} msg - WhatsApp message object
   */
  async handleList(msg) {
    const spgPhone = extractPhoneNumber(msg.from);
    
    try {
      const customers = await storageService.getCustomers({ spgPhone });
      
      if (customers.length === 0) {
        await msg.reply(
          '📋 *Daftar Customer*\n\n' +
          'Belum ada customer yang terdaftar.\n\n' +
          'Gunakan /customer untuk mendaftarkan customer baru.'
        );
        return;
      }

      // Show only last 10 customers
      const recentCustomers = customers.slice(-10);
      
      let response = '📋 *Daftar Customer (10 Terakhir)*\n\n';
      
      recentCustomers.forEach((c, i) => {
        response += `${i + 1}. ${c.nama}\n`;
        response += `   📱 ${c.hp}\n`;
        response += `   🏙️ ${c.kota || '-'}\n`;
        response += `   📅 ${c.date}\n\n`;
      });

      response += `Total: ${customers.length} customer`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling list command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle 'total' command - show customer count
   * @param {Object} msg - WhatsApp message object
   */
  async handleTotal(msg) {
    const spgPhone = extractPhoneNumber(msg.from);
    const today = getCurrentDate();
    
    try {
      const allCustomers = await storageService.getCustomers({ spgPhone });
      const todayCustomers = allCustomers.filter(c => c.date === today);
      
      const response = 
        '📊 *Statistik Customer*\n\n' +
        `📅 Hari ini: ${todayCustomers.length} customer\n` +
        `📈 Total: ${allCustomers.length} customer`;

      await msg.reply(response);
    } catch (error) {
      logger.error('Error handling total command', error);
      await msg.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }
}

module.exports = new CustomerHandler();
