# WhatsApp Bot SPG/SPB Monitoring

Bot WhatsApp untuk monitoring SPG (Sales Promotion Girl) dan SPB (Sales Promotion Boy) dengan fitur absensi dan registrasi customer.

## ✨ Fitur

### 📍 Absensi
- ✅ Absen masuk dengan foto selfie (`/masuk`)
- ✅ Absen pulang dengan foto selfie (`/pulang`)
- ✅ Cek status absensi harian (`/status`)
- ✅ Anti duplikasi: tidak bisa absen masuk/pulang dua kali dalam sehari

### 👥 Customer Management
- ✅ Registrasi customer baru — format `Nama#NomorHP#Kota`
- ✅ Lihat daftar customer (`/list`)
- ✅ Statistik customer harian (`/total`)

### 👑 Admin/Supervisor
- ✅ Laporan statistik harian (`/stats`)
- ✅ Rekap absensi per tanggal (`/rekap` — bisa `kemarin` atau `8 oktober 2026`)
- ✅ Detail absensi + foto SPG per nomor (`/detail`)
- ✅ Broadcast pesan ke semua SPG/SPB (`/broadcast`)
- ✅ Hapus data absensi user (`/hapus_absen` — terima `08xx` atau `628xx`)
- 🔒 Perintah admin **hanya bisa dipakai nomor supervisor** yang terdaftar

## 🚀 Instalasi

### 1. Install Dependencies

```bash
npm install
```

> Membutuhkan **Node.js >= 22.5** (memakai `node:sqlite` bawaan, tanpa database eksternal).

### 2. Konfigurasi Environment

Salin template ke file environment yang sesuai (dipilih otomatis oleh bot berdasarkan `NODE_ENV`):

```bash
cp .env.example .env.dev    # untuk development  → npm run start:dev
cp .env.example .env.prod   # untuk production   → npm run start:prod
```

Isi `SUPERVISOR_PHONES` di file yang dipakai:

```env
# Nomor WhatsApp supervisor — bisa lebih dari satu, pisahkan dengan koma.
# Format internasional tanpa "+", contoh:
SUPERVISOR_PHONES=628123456789,628987654321
```

> `.env.dev` / `.env.prod` berisi data sensitif dan **tidak di-commit** (ada di `.gitignore`).

### 3. Jalankan Bot

```bash
npm run start:dev    # development (memakai .env.dev)
npm run start:prod   # production  (memakai .env.prod)
# atau: npm start    # default NODE_ENV=dev → memakai .env.dev
```

### 4. Scan QR Code

Scan QR code yang muncul di terminal dengan aplikasi WhatsApp di smartphone Anda (nomor yang dipakai untuk bot).

## 📱 Cara Penggunaan

### Untuk SPG/SPB

| Perintah | Fungsi |
|----------|--------|
| `/masuk` | Absen masuk — lanjut kirim foto selfie di lokasi |
| `/pulang` | Absen pulang — lanjut kirim foto selfie di lokasi |
| `/status` | Cek status absensi hari ini |
| `/customer` | Registrasi customer baru (format `Nama#HP#Kota`) |
| `/list` | Daftar customer yang kamu daftarkan |
| `/total` | Total customer kamu |
| `/help` | Daftar perintah |
| `/ping` | Cek bot aktif |

**Registrasi customer** juga bisa langsung kirim pesan tanpa command:

```
Budi Santoso#081234567890#Jakarta
```

### Untuk Admin/Supervisor

| Perintah | Fungsi |
|----------|--------|
| `/stats` | Statistik hari ini |
| `/rekap` | Rekap absensi hari ini |
| `/rekap kemarin` | Rekap kemarin |
| `/rekap 8 oktober 2026` | Rekap tanggal tertentu (format Indonesia) |
| `/rekap 2024-01-15` | Rekap tanggal tertentu (YYYY-MM-DD) |
| `/rekap 15-01-2024` | Rekap tanggal tertentu (DD-MM-YYYY) |
| `/detail 087876629341` | Detail absensi + foto masuk/pulang hari ini (bisa 08xx atau 628xx) |
| `/broadcast Pesan...` | Kirim pesan ke semua SPG/SPB |
| `/hapus_absen 628123456789` | Hapus absen user hari ini (bisa 08xx atau 628xx) |
| `/admin` | Menu admin |

## 💾 Penyimpanan Data

- **SQLite** — semua data tersimpan di `data/spg.db` (tabel `attendance` & `customers`)
- **Foto absensi** — tersimpan di folder `data/photos/`
- Tidak butuh konfigurasi tambahan; database dibuat otomatis saat bot pertama kali dijalankan

## 📂 Struktur Folder

```
whatsapp-bot-spg/
├── index.js                  # Entry point
├── src/
│   ├── app.js                # Koneksi WhatsApp (Baileys) + health check
│   ├── config/               # Konfigurasi (env, supervisor, paths)
│   ├── handlers/             # Handler per fitur
│   │   ├── commandHandler.js     # Router perintah + proteksi supervisor
│   │   ├── attendanceHandler.js  # Absensi masuk/pulang/status
│   │   ├── customerHandler.js    # Registrasi & daftar customer
│   │   └── adminHandler.js       # Stats/rekap/broadcast/hapus absen
│   ├── services/             # Service layer
│   │   ├── databaseService.js    # SQLite (node:sqlite)
│   │   ├── dataService.js        # Query attendance & customer
│   │   └── storageService.js     # Facade penyimpanan + foto
│   └── utils/                # helpers.js, logger.js
├── data/                     # Dibuat otomatis: spg.db, photos/
├── auth_info_baileys/        # Sesi WhatsApp (dibuat otomatis, jangan di-commit)
├── .env.dev / .env.prod      # Konfigurasi rahasia (buat dari .env.example, jangan di-commit)
└── package.json
```

## 🔧 Troubleshooting

### Bot tidak muncul QR code
- Pastikan tidak ada proses bot lain yang berjalan (port 3000) — `lsof -i:3000`
- Hapus folder `auth_info_baileys/` lalu mulai ulang untuk login ulang

### WhatsApp logout sendiri
- Gunakan nomor WhatsApp yang jarang dipakai
- Jangan scan QR code di multiple device

### Perintah admin ditolak
- Pastikan nomor Anda terdaftar di `SUPERVISOR_PHONES` dengan format internasional tanpa `+` (contoh `628123456789`)

## 📝 Environment Variables

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `SUPERVISOR_PHONES` | ✅ | Nomor admin, pisahkan dengan koma jika lebih dari satu |
| `PORT` | ❌ | Port health check server (default `3000`) |
| `NODE_ENV` | ❌ | `production` / `development` (development menampilkan log debug) |

## 📄 License

MIT License
