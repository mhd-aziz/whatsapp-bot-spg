/**
 * Customer Handler (Baileys Version)
 * Supports photo attachment: /customer wizard → kirim foto bukti
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
      '📝 *Registrasi Pelanggan Baru* (wizard)\n\n' +
      'Ketik /customer lalu ikuti pertanyaan:\n' +
      '1️⃣ Nama customer\n' +
      '2️⃣ Nomor HP (08xx atau 628xx)\n' +
      '3️⃣ Kota\n\n' +
      '📸 Terakhir kirim foto customer/bukti.\n\n' +
      'Ketik *batal* kapan saja untuk membatalkan.'
    );
  }

  /** Mulai wizard registrasi customer. Args opsional = nama sudah diisi. */
  async handleCustomerReg(msg, args) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const prefillName = (args || '').trim();

      if (prefillName) {
        sessionService.setSession(phone, 'customer_reg_phone', { name: prefillName });
        await msg.reply(
          `📱 Nomor HP untuk *${prefillName}*?\n\n` +
          'Gunakan 08xx atau 628xx. Ketik *batal* untuk membatalkan.'
        );
        return;
      }

      sessionService.setSession(phone, 'customer_reg_name', {});
      await msg.reply('👤 Siapa nama customer?\n\nKetik *batal* untuk membatalkan.');
    } catch (error) {
      logger.error('Error starting customer registration', error);
      await msg.reply('❌ Gagal memulai registrasi customer.');
    }
  }

  /** Balasan selama wizard registrasi: nama → HP → kota → simpan + minta foto */
  async handleCustomerRegReply(msg, body) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const lower = (body || '').trim().toLowerCase();

      if (lower === 'batal' || lower === 'cancel' || lower === 'keluar') {
        sessionService.clearSession(phone);
        await msg.reply('❌ Dibatalkan. Customer tidak jadi didaftarkan.');
        return;
      }

      const session = sessionService.getSession(phone);
      if (!session || !session.state || !session.state.startsWith('customer_reg_')) {
        await msg.reply('ℹ️ Sesi registrasi sudah habis. Ketik /customer untuk mulai lagi.');
        return;
      }

      if (session.state === 'customer_reg_name') {
        const name = body.trim();
        if (!name) {
          await msg.reply('⚠️ Nama tidak boleh kosong. Ketik *batal* untuk membatalkan.');
          return;
        }
        sessionService.setSession(phone, 'customer_reg_phone', { name });
        await msg.reply(
          `📱 Nomor HP untuk *${name}*?\n\n` +
          'Gunakan 08xx atau 628xx. Ketik *batal* untuk membatalkan.'
        );
        return;
      }

      if (session.state === 'customer_reg_phone') {
        const phoneRaw = body.trim();
        if (!/^\d{9,}$/.test(phoneRaw)) {
          await msg.reply('⚠️ No HP tidak valid. Gunakan angka saja (contoh: 087876629341).\n\nKetik *batal* untuk membatalkan.');
          return;
        }
        sessionService.setSession(phone, 'customer_reg_city', { ...session.data, phone: phoneRaw });
        await msg.reply(`📍 Kota untuk *${session.data.name}*?\n\nKetik *batal* untuk membatalkan.`);
        return;
      }

      if (session.state === 'customer_reg_city') {
        const city = body.trim();
        if (!city) {
          await msg.reply('⚠️ Kota tidak boleh kosong. Ketik *batal* untuk membatalkan.');
          return;
        }
        const { name, phone: phoneRaw } = session.data;
        const saved = await storageService.saveCustomer({
          name,
          phone: phoneRaw,
          city,
          spg_phone: phone,
        });
        sessionService.setSession(phone, 'waiting_photo_customer', {
          timestamp: Date.now(),
          customerId: saved.id,
        });
        await msg.reply(
          `✅ Pelanggan *${name}* berhasil didaftarkan!\n\n` +
          '📸 Sekarang kirim foto customer/bukti (berlaku 5 menit).'
        );
        return;
      }
    } catch (error) {
      logger.error('Error in customer registration wizard', error);
      await msg.reply('❌ Terjadi kesalahan. Mulai lagi dengan /customer.');
    }
  }

  async handleCustomerPhoto(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    if (!session || session.state !== 'waiting_photo_customer') return false;

    if (Date.now() - session.data.timestamp > SESSION_TIMEOUT_MS) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Session foto customer sudah expired.\n\nSilakan kirim /customer lagi.');
      return true;
    }

    const customerId = session.data.customerId;
    sessionService.clearSession(phone);

    if (!customerId) {
      logger.warn(`Customer photo session without customerId: ${phone}`);
      await msg.reply('❌ Data customer tidak ditemukan. Silakan daftar ulang dengan /customer.');
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
      if (!savedPhoto) {
        await msg.reply('❌ Gagal menyimpan foto ke server. Coba kirim foto lagi.');
        return true;
      }
      await storageService.updateCustomerPhoto(customerId, savedPhoto);

      await msg.reply('✅ Foto customer berhasil disimpan!');
      return true;
    } catch (error) {
      logger.error('Error saving customer photo', error);
      await msg.reply('❌ Terjadi kesalahan saat menyimpan foto.');
      return true;
    }
  }

  /** Foto baru saat edit wizard (state edit_customer_photo) */
  async handleEditCustomerPhoto(msg) {
    const phone = extractPhoneNumber(msg.from);
    const session = sessionService.getSession(phone);

    if (!session || session.state !== 'edit_customer_photo') return false;

    if (Date.now() - session.data.timestamp > SESSION_TIMEOUT_MS) {
      sessionService.clearSession(phone);
      await msg.reply('⏰ Sesi edit foto sudah expired.\n\nSilakan ketik /editcust lagi.');
      return true;
    }

    const customerId = session.data.customerId;
    const customer = await this.getCustomerById(phone, customerId);
    if (!customer) {
      sessionService.clearSession(phone);
      await msg.reply('❌ Customer tidak ditemukan. Mulai lagi dengan /editcust.');
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
      if (!savedPhoto) {
        await msg.reply('❌ Gagal menyimpan foto ke server. Coba kirim foto lagi.');
        return true;
      }
      await storageService.updateCustomerPhoto(customerId, savedPhoto);
      sessionService.clearSession(phone);
      await msg.reply(`✅ Foto customer *${customer.name}* berhasil diganti!`);
      logger.info(`Customer photo updated: id=${customerId} by ${phone}`);
      return true;
    } catch (error) {
      logger.error('Error saving customer photo (edit)', error);
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
      // Prefer exact name match; only show a choice list when no exact match exists
      const exact = matches.find((c) => c.name.toLowerCase() === query);
      const ambiguous = !exact && matches.length > 1;
      const target = exact || matches[0];

      if (matches.length === 0) {
        await msg.reply(`🔍 Customer dengan nama *"${rawQuery}"* tidak ditemukan.`);
        return;
      }

      if (ambiguous) {
        let text = `🔎 Ditemukan *${matches.length}* customer dengan nama mirip:\n\n`;
        matches.forEach((c, i) => {
          text += `${i + 1}. ${c.name} (${c.phone}) - ${c.city}\n`;
        });
        text += `\nKetik nama yang lebih spesifik, contoh: /detailcust ${matches[0].name}`;
        await msg.reply(text);
        return;
      }

      const c = target;
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

  async handleEditCustomer(msg, args) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const query = (args || '').trim();
      const customers = await storageService.getSpgCustomers(phone);

      if (customers.length === 0) {
        await msg.reply('📋 Belum ada pelanggan untuk diedit.\nDaftarkan dulu dengan /customer.');
        return;
      }

      // Tanpa argumen → tampilkan semua customer bernomor (terbaru di atas)
      if (!query) {
        sessionService.setSession(phone, 'edit_customer_select', {});
        await msg.reply(
          this.buildCustomerMenu(customers, 'Customer mana yang mau diedit? Balas *nomornya*:')
        );
        return;
      }

      // Dengan nama → cari (exact match langsung dipilih)
      const lower = query.toLowerCase();
      const matches = customers.filter((c) => c.name.toLowerCase().includes(lower));

      if (matches.length === 0) {
        await msg.reply(
          `🔍 Customer dengan nama *"${query}"* tidak ditemukan.\n\nKetik /editcust (tanpa nama) untuk melihat daftar semua customer.`
        );
        return;
      }

      const exact = matches.find((c) => c.name.toLowerCase() === lower);
      if (exact) {
        sessionService.setSession(phone, 'edit_customer_field', { customerId: exact.id });
        await msg.reply(this.buildFieldMenu(exact));
        return;
      }

      sessionService.setSession(phone, 'edit_customer_select', {});
      await msg.reply(
        this.buildCustomerMenu(
          matches,
          `Ditemukan *${matches.length}* customer dengan nama mirip. Balas *nomornya*:`
        )
      );
    } catch (error) {
      logger.error('Error starting customer edit', error);
      await msg.reply('❌ Gagal memulai edit customer.');
    }
  }

  /** Balasan selama wizard edit: nomor customer → field → nilai baru → batal */
  async handleEditCustomerReply(msg, body) {
    try {
      const phone = extractPhoneNumber(msg.from);
      const lower = (body || '').trim().toLowerCase();

      if (lower === 'batal' || lower === 'cancel' || lower === 'keluar') {
        sessionService.clearSession(phone);
        await msg.reply('❌ Dibatalkan. Tidak ada yang diubah.');
        return;
      }

      const session = sessionService.getSession(phone);
      if (!session || !session.state || !session.state.startsWith('edit_customer_')) {
        await msg.reply('ℹ️ Sesi edit sudah habis. Ketik /editcust untuk mulai lagi.');
        return;
      }

      if (session.state === 'edit_customer_select') {
        const idx = parseInt(body, 10);
        if (isNaN(idx) || idx < 1) {
          await msg.reply('⚠️ Balas dengan *nomor* customer (contoh: 1).\n\nAtau ketik *batal* untuk keluar.');
          return;
        }
        const customers = await storageService.getSpgCustomers(phone);
        const customer = customers[idx - 1];
        if (!customer) {
          await msg.reply(`⚠️ Nomor ${idx} tidak ada di daftar. Balas nomor yang benar.\n\nAtau ketik *batal* untuk keluar.`);
          return;
        }
        sessionService.setSession(phone, 'edit_customer_field', { customerId: customer.id });
        await msg.reply(this.buildFieldMenu(customer));
        return;
      }

      if (session.state === 'edit_customer_field') {
        if (body === '4') {
          const customer = await this.getCustomerById(phone, session.data.customerId);
          if (!customer) {
            sessionService.clearSession(phone);
            await msg.reply('❌ Customer tidak ditemukan. Mulai lagi dengan /editcust.');
            return;
          }
          sessionService.setSession(phone, 'edit_customer_photo', {
            timestamp: Date.now(),
            customerId: customer.id,
          });
          await msg.reply(
            `📸 Kirim foto baru untuk *${customer.name}*.\n\n` +
            'Ketik *lewat* untuk tetap pakai foto lama, atau *batal* untuk keluar.'
          );
          return;
        }
        const fieldMap = { 1: 'name', 2: 'phone', 3: 'city' };
        const field = fieldMap[body];
        if (!field) {
          await msg.reply('⚠️ Balas dengan nomor pilihan (1, 2, 3, atau 4).\n\nAtau ketik *batal* untuk keluar.');
          return;
        }
        const customer = await this.getCustomerById(phone, session.data.customerId);
        if (!customer) {
          sessionService.clearSession(phone);
          await msg.reply('❌ Customer tidak ditemukan. Mulai lagi dengan /editcust.');
          return;
        }
        sessionService.setSession(phone, 'edit_customer_value', { customerId: customer.id, field });
        const labelMap = { name: 'Nama', phone: 'No. HP', city: 'Kota' };
        await msg.reply(
          `✏️ ${labelMap[field]} baru untuk *${customer.name}* (sekarang: ${customer[field] || '-'}):\n\n` +
          'Ketik nilainya, atau *batal* untuk keluar.'
        );
        return;
      }

      if (session.state === 'edit_customer_value') {
        const { customerId, field } = session.data;
        const customer = await this.getCustomerById(phone, customerId);
        if (!customer) {
          sessionService.clearSession(phone);
          await msg.reply('❌ Customer tidak ditemukan. Mulai lagi dengan /editcust.');
          return;
        }
        const value = body.trim();
        if (!value) {
          await msg.reply('⚠️ Nilai tidak boleh kosong.\n\nKetik *batal* untuk keluar.');
          return;
        }
        if (field === 'phone' && !/^\d{9,}$/.test(value)) {
          await msg.reply('⚠️ No HP tidak valid. Gunakan angka saja (contoh: 087876629341).\n\nAtau ketik *batal* untuk keluar.');
          return;
        }
        if (customer[field] === value) {
          sessionService.clearSession(phone);
          const labelMap = { name: 'Nama', phone: 'No. HP', city: 'Kota' };
          await msg.reply(`ℹ️ ${labelMap[field]} customer *${customer.name}* memang sudah *${value}* — tidak ada yang diubah.`);
          return;
        }
        const result = await storageService.updateCustomer(customerId, { [field]: value });
        sessionService.clearSession(phone);
        if (!result || Number(result.changes) === 0) {
          await msg.reply('❌ Gagal mengubah data. Coba lagi dengan /editcust.');
          return;
        }
        const labelMap = { name: 'Nama', phone: 'No. HP', city: 'Kota' };
        const oldValue = customer[field] || '-';
        await msg.reply(
          `✅ Data customer *${customer.name}* berhasil diubah!\n\n${labelMap[field]}: ${oldValue} → ${value}`
        );
        logger.info(`Customer updated: id=${customerId} field=${field} by ${phone}`);
        return;
      }

      if (session.state === 'edit_customer_photo') {
        const customer = await this.getCustomerById(phone, session.data.customerId);
        if (!customer) {
          sessionService.clearSession(phone);
          await msg.reply('❌ Customer tidak ditemukan. Mulai lagi dengan /editcust.');
          return;
        }
        if (lower === 'lewat') {
          sessionService.clearSession(phone);
          await msg.reply(`ℹ️ Foto customer *${customer.name}* tetap memakai foto yang lama.`);
          return;
        }
        await msg.reply(
          '📸 Kirim foto baru, ketik *lewat* untuk tetap pakai foto lama, atau *batal* untuk keluar.'
        );
        return;
      }

      await msg.reply('ℹ️ Sesi edit tidak dikenal. Ketik /editcust untuk mulai lagi.');
    } catch (error) {
      logger.error('Error handling customer edit reply', error);
      await msg.reply('❌ Terjadi kesalahan saat edit. Ketik /editcust untuk mulai lagi.');
    }
  }

  buildCustomerMenu(customers, header) {
    const MAX_SHOW = 20;
    let text = `📝 *Edit Customer*\n\n${header}\n\n`;
    const shown = customers.slice(0, MAX_SHOW);
    shown.forEach((c, i) => {
      text += `${i + 1}. ${c.name} (${c.phone}) - ${c.city}\n`;
    });
    const rest = customers.length - shown.length;
    if (rest > 0) {
      text += `\n…dan ${rest} customer lainnya. Ketik /editcust <nama> untuk mencarinya.\n`;
    }
    text += '\nBalas *angka* untuk memilih, atau ketik *batal* untuk keluar.';
    return text;
  }

  buildFieldMenu(customer) {
    const photoStatus = customer.photo ? 'Ada 📸' : 'Tidak ada';
    return (
      `📝 Edit customer *${customer.name}*\n` +
      `📱 No. HP: ${customer.phone}\n` +
      `📍 Kota: ${customer.city || '-'}\n` +
      `📸 Foto: ${photoStatus}\n\n` +
      'Mau edit apa? Balas *nomornya*:\n' +
      '1. Nama\n' +
      '2. No HP\n' +
      '3. Kota\n' +
      '4. Foto\n\n' +
      'Ketik *batal* untuk keluar.'
    );
  }

  async getCustomerById(phone, id) {
    const customers = await storageService.getSpgCustomers(phone);
    return customers.find((c) => c.id === id) || null;
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
