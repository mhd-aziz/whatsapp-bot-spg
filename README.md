# WhatsApp Bot SPG/SPB Monitoring

Bot WhatsApp untuk monitoring SPG (Sales Promotion Girl) dan SPB (Sales Promotion Boy) dengan fitur absensi dan registrasi customer.

## ✨ Fitur

### 📍 Absensi
- ✅ Absen masuk dengan foto selfie
- ✅ Absen pulang dengan foto selfie
- ✅ Cek status absensi harian
- ✅ Penyimpanan lokasi GPS (opsional)

### 👥 Customer Management
- ✅ Registrasi customer baru (nama, HP, kota)
- ✅ Lihat daftar customer
- ✅ Statistik customer harian

### 👑 Admin/Supervisor
- ✅ Laporan statistik harian
- ✅ Rekap absensi per tanggal
- ✅ Broadcast pesan ke semua SPG/SPB
- ✅ Monitoring real-time

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/mhd-aziz/whatsapp-bot-spg.git
cd whatsapp-bot-spg
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan konfigurasi:

```env
# Wajib diisi
SUPERVISOR_PHONE=628123456789  # Nomor WhatsApp admin/supervisor

# Opsional (jika menggunakan Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Opsional (jika menggunakan Google Sheets)
GOOGLE_SHEETS_ID=your-spreadsheet-id
```

### 4. Jalankan Bot

**Mode Production:**
```bash
npm start
```

**Mode Development (dengan auto-reload):**
```bash
npm run dev
```

### 5. Scan QR Code

Setelah bot berjalan, scan QR code yang muncul di terminal dengan aplikasi WhatsApp di smartphone Anda.

## 📱 Cara Penggunaan

### Untuk SPG/SPB

#### Absensi Masuk
1. Buka chat dengan bot
2. Kirim perintah `/masuk`
3. Lampirkan foto selfie di lokasi
4. Bot akan konfirmasi absensi masuk

#### Absensi Pulang
1. Kirim perintah `/pulang`
2. Lampirkan foto selfie di lokasi
3. Bot akan konfirmasi absensi pulang

#### Cek Status Absensi
```
/status
```

#### Registrasi Customer Baru
Format: `nama#hp#kota`

Contoh:
```
Budi Santoso#081234567890#Jakarta
```

Atau gunakan command:
```
/customer Budi Santoso#081234567890#Jakarta
```

#### Lihat Daftar Customer
```
/list
```

#### Total Customer
```
/total
```

### Untuk Admin/Supervisor

#### Statistik Harian
```
/stats
```

#### Rekap Absensi
```
/rekap                  # Hari ini
/rekap kemarin          # Kemarin
/rekap 2024-01-15       # Tanggal tertentu (YYYY-MM-DD)
/rekap 15-01-2024       # Tanggal tertentu (DD-MM-YYYY)
```

#### Broadcast Pesan
```
/broadcast Jangan lupa absen ya!
```

#### Menu Admin
```
/admin
```

## 📂 Struktur Folder

```
whatsapp-bot-spg/
├── src/
│   ├── config/              # Konfigurasi aplikasi
│   │   └── index.js
│   ├── handlers/            # Handler untuk setiap fitur
│   │   ├── attendanceHandler.js
│   │   ├── customerHandler.js
│   │   ├── adminHandler.js
│   │   └── commandHandler.js
│   ├── services/            # Service layer
│   │   ├── dataService.js         # Local JSON storage
│   │   ├── supabaseService.js     # Supabase integration
│   │   ├── googleSheetsService.js # Google Sheets integration
│   │   └── storageService.js      # Unified storage interface
│   ├── utils/               # Utility functions
│   │   ├── helpers.js
│   │   └── logger.js
│   └── app.js               # Main application
├── data/                    # Data storage
│   ├── photos/              # Foto absensi
│   ├── attendance.json      # Data absensi
│   └── customers.json       # Data customer
├── .env                     # Environment variables (buat sendiri)
├── .env.example             # Template environment variables
├── index.js                 # Entry point
├── package.json
└── README.md
```

## 💾 Penyimpanan Data

Bot mendukung 3 metode penyimpanan:

1. **Local JSON** (default, selalu aktif)
   - Data disimpan di folder `data/`
   - Tidak perlu konfigurasi tambahan

2. **Supabase** (opsional, untuk database cloud)
   - Setup di [supabase.com](https://supabase.com)
   - Tambahkan konfigurasi di `.env`

3. **Google Sheets** (opsional, untuk backup)
   - Setup Google Service Account
   - Download `credentials.json`
   - Tambahkan konfigurasi di `.env`

## 🔧 Troubleshooting

### Bot tidak bisa scan QR code
- Pastikan Chrome/Chromium terinstall
- Coba tambahkan `PUPPETEER_EXECUTABLE_PATH` di `.env`

### Error saat install dependencies
```bash
npm install --legacy-peer-deps
```

### WhatsApp logout sendiri
- Gunakan nomor WhatsApp yang jarang dipakai
- Jangan scan QR code di multiple device

## 📝 Environment Variables

Pastikan semua environment variables sudah diset di file `.env`:

**Wajib:**
- `SUPERVISOR_PHONE` - Nomor WhatsApp admin/supervisor

**Opsional:**
- `SUPABASE_URL` - URL project Supabase
- `SUPABASE_ANON_KEY` - Anon key dari Supabase
- `GOOGLE_SHEETS_ID` - ID Google Spreadsheet
- `GOOGLE_CREDENTIALS_FILE` - Path ke file credentials JSON

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan buat Pull Request atau buka Issue untuk bug report atau feature request.

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## 👨‍💻 Author

Dibuat dengan ❤️ untuk monitoring SPG/SPB

## 🆘 Support

Jika ada pertanyaan atau butuh bantuan, silakan buka Issue di GitHub repository.
