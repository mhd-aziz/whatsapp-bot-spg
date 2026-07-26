# 🤖 WhatsApp Bot SPG/SPB Monitoring

Bot WhatsApp untuk membantu supervisor memonitor SPG/SPB Grab secara otomatis.

> _by avv_ ❤️

---

## 📋 Fitur

| Fitur | Command | Keterangan |
|-------|---------|------------|
| Absen Masuk | `/masuk` | SPG kirim foto lokasi → auto tersimpan |
| Absen Pulang | `/pulang` | SPG kirim foto lokasi → auto tersimpan |
| Input Customer | `/customer` | Isi data customer lewat chat, tanpa buka Google Form |
| Laporan Harian | `/laporan` | Lihat rekap absensi + customer hari ini |
| Status Pribadi | `/status` | Cek status absensi diri sendiri |

---

## 🚀 Cara Install & Jalankan

### 1. Install Node.js
Download dari https://nodejs.org (pilih versi LTS)

### 2. Clone / download folder ini

### 3. Install dependencies
```bash
npm install
```

### 4. Setup konfigurasi
```bash
cp .env.example .env
# Edit file .env sesuai kebutuhan
```

### 5. Jalankan bot
```bash
npm start
```

### 6. Scan QR Code
- Akan muncul QR code di terminal
- Buka WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat
- Scan QR code tersebut
- Bot siap digunakan! ✅

---

## 💬 Contoh Penggunaan

### SPG Absen Masuk:
```
SPG:  /masuk
Bot:  📸 Silakan kirim foto lokasi kamu sekarang
SPG:  [kirim foto]
Bot:  ✅ 🟢 Absen MASUK berhasil!
      ⏰ 26 Juli 2026, 08:15 WIB
      📸 Foto tersimpan
```

### Input Data Customer:
```
SPG:  /customer
Bot:  👥 Input Data Customer Baru
      📝 Silakan ketik nama customer:
SPG:  Budi Santoso
Bot:  📱 Silakan ketik nomor HP customer:
SPG:  081234567890
Bot:  🏙️ Silakan ketik kota customer:
SPG:  Jakarta
Bot:  ✅ Data customer berhasil tersimpan!
      👤 Nama: Budi Santoso
      📱 HP: 081234567890
      🏙️ Kota: Jakarta
```

### Supervisor Lihat Laporan:
```
Supervisor: /laporan
Bot:  📊 LAPORAN HARIAN
      📅 2026-07-26

      👥 ABSENSI SPG/SPB
      ✅ Check-in: 5 orang
      ✅ Check-out: 3 orang

      👥 DATA CUSTOMER
      📝 Total: 12 customer
```

---

## 📁 Struktur Folder

```
whatsapp-bot-spg/
├── index.js              # Main bot file
├── package.json          # Dependencies
├── .env.example          # Template konfigurasi
├── .env                  # Konfigurasi (buat sendiri)
├── flow-diagram.html     # Diagram flow sistem
└── data/
    ├── attendance.json   # Data absensi
    ├── customers.json    # Data customer
    └── photos/           # Foto absensi tersimpan di sini
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **WhatsApp**: whatsapp-web.js
- **Database**: JSON file (bisa upgrade ke Google Sheets)
- **Language**: JavaScript

---

## 🔮 Upgrade Selanjutnya (opsional)

- [ ] Integrasi Google Sheets API untuk data lebih rapi
- [ ] Notifikasi otomatis jika SPG belum absen jam 09.00
- [ ] Dashboard web sederhana untuk supervisor
- [ ] Export laporan ke Excel
- [ ] Verifikasi lokasi GPS

---

## ❓ Troubleshooting

**QR Code tidak muncul?**
→ Coba jalankan `npm install` ulang

**Bot tidak merespons?**
→ Pastikan WhatsApp sudah tersambung (scan QR ulang)

**Foto tidak tersimpan?**
→ Pastikan folder `data/photos/` ada dan bisa ditulis
