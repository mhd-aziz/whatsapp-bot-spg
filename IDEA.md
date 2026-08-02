# IDEA.md — Acuan Kerja untuk Agent AI

> Dokumen ini adalah **sumber kebenaran** bagi agent AI (Claude, Codex, OpenCode, atau lainnya) yang diminta membantu mengerjakan project ini. Baca dokumen ini **sebelum** mengubah kode apa pun, dan hormati aturan di bawah.

---

## 1. Tujuan Project

WhatsApp Bot untuk **monitoring SPG/SPB Grab** — mencatat absensi masuk/pulang (dengan foto) dan registrasi customer. Dipakai oleh user dan tim SPG/SPB-nya.

## 2. Stack & Requirement

| Komponen | Keterangan |
|---|---|
| **Node.js** | `>= 22.5` (wajib — memakai `node:sqlite` bawaan) |
| **Baileys** | `@whiskeysockets/baileys@7.0.0-rc14` (WAHA — koneksi WhatsApp Web) |
| **Database** | SQLite via `node:sqlite` → file `data/spg.db` (tanpa dependency eksternal) |
| **Lainnya** | `express` (health check port 3000), `moment`, `pino`, `dotenv`, `qrcode-terminal` |

> ⚠️ **PENTING:** Versi Baileys harus selalu yang terbaru. Server WhatsApp menolak versi lama dengan error `405 Connection Failure` (tanpa QR code muncul). Terakhir diperbaiki 2026-08-02 dengan upgrade rc13 → rc14.

## 3. Struktur & Arsitektur

```
whatsapp-bot-spg/
├── index.js                  # Entry point (signal handler + start)
├── src/
│   ├── app.js                # WhatsAppBot: koneksi Baileys, health server, shutdown
│   ├── config/index.js       # Env → config (PORT, SUPERVISOR_PHONES, paths)
│   ├── handlers/
│   │   ├── commandHandler.js     # Router pesan + gerbang supervisor
│   │   ├── attendanceHandler.js  # Absen masuk/pulang/status + proses foto
│   │   ├── customerHandler.js    # Registrasi/list/total customer
│   │   └── adminHandler.js       # Stats/rekap/broadcast/hapus absen
│   ├── services/
│   │   ├── databaseService.js    # Wrapper SQLite (node:sqlite) + skema tabel
│   │   ├── dataService.js        # Query attendance & customer
│   │   ├── storageService.js     # Facade tunggal untuk handler + simpan foto
│   │   └── sessionService.js     # Session state per nomor (timeout 30 mnt)
│   └── utils/
│       ├── helpers.js            # extractPhoneNumber, getCurrentDate, getTimestamp, resolveDate
│       └── logger.js             # Logger timestamp + level
├── data/                    # Dibuat otomatis: spg.db + photos/
├── auth_info_baileys/       # Sesi WhatsApp (dibuat otomatis, JANGAN di-commit)
├── .env                     # Konfigurasi rahasia (JANGAN di-commit / dibaca)
└── package.json
```

**Alur pesan:** `app.js` (Baileys event) → `commandHandler.handleMessage` (adaptasi pesan) → handler fitur → `storageService` → `dataService` → `databaseService` (SQLite).

## 4. Konvensi KODE (WAJIB — kesepakatan user)

1. **Identifier kode dalam bahasa Inggris**: nama function, variabel, file, kolom DB, session state (`handleCheckIn`, `waiting_photo_checkin`, `spg_phone`).
2. **Command WhatsApp tetap bahasa Indonesia**: `/masuk`, `/pulang`, `/status`, `/rekap`, `/hapus_absen`, dst.
3. **Nilai data `type` absensi** tetap `'masuk'` / `'pulang'` (domain Indonesia, dipakai di laporan).
4. **Pesan balasan bot** dalam bahasa Indonesia.
5. Hanya boleh mengubah kode **setelah mendapat persetujuan user** — jangan semena-mena. Jangan commit/push tanpa diminta.

## 5. Perintah Bot

### Publik (semua SPG/SPB)

| Perintah | Fungsi |
|---|---|
| `/masuk` → kirim foto | Absen masuk (anti duplikat per hari) |
| `/pulang` → kirim foto | Absen pulang (anti duplikat per hari) |
| `/status` | Status absensi hari ini (record TERBARU) |
| `/customer` / pesan `Nama#HP#Kota` | Registrasi customer |
| `/list`, `/total` | Daftar & jumlah customer pribadi |
| `/help`, `/ping` | Bantuan, cek aktif |

### Admin (hanya nomor di `SUPERVISOR_PHONES`)

| Perintah | Fungsi |
|---|---|
| `/stats` | Statistik hari ini (masuk/pulang/SPG aktif/customer) |
| `/rekap` [`kemarin` \| `DD-MM-YYYY` \| `YYYY-MM-DD`] | Rekap absensi per tanggal |
| `/broadcast <pesan>` | Kirim pesan ke semua SPG terdaftar |
| `/hapus_absen <nomor>` | Reset absensi nomor tsb untuk hari ini |
| `/admin` | Menu admin |

**Gerbang supervisor** ada di `commandHandler.js` (`ADMIN_COMMANDS` + cek `config.supervisor.phones`). Nomor yang tidak terdaftar mendapat `⛔ Perintah ini khusus supervisor.`

## 6. Skema Database (`data/spg.db`)

```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,          -- nomor SPG tanpa @s.whatsapp.net
  date TEXT NOT NULL,           -- YYYY-MM-DD
  type TEXT NOT NULL CHECK (type IN ('masuk','pulang')),
  timestamp TEXT NOT NULL,      -- ISO
  photo TEXT, latitude REAL, longitude REAL
);
CREATE INDEX idx_attendance_phone_date ON attendance (phone, date);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT,
  spg_phone TEXT NOT NULL, date TEXT NOT NULL, timestamp TEXT NOT NULL
);
CREATE INDEX idx_customers_spg_date ON customers (spg_phone, date);
```

Catatan desain: absen masuk & pulang = **2 record terpisah**; `getTodayAttendance` mengambil record **terbaru** (`ORDER BY id DESC LIMIT 1`) sehingga `/status` benar setelah pulang.

## 7. Setup & Perintah

```bash
cp .env.example .env          # lalu isi SUPERVISOR_PHONES (bisa multi, pisah koma)
npm install
npm start                     # scan QR di terminal dengan WhatsApp
npm test                      # syntax check semua file JS
npm run verify                # load semua modul
```

`.env` minimum:

```env
PORT=3000
SUPERVISOR_PHONES=628123456789,628987654321   # format internasional tanpa +
```

## 8. Aturan & Batasan (dari user — HORMATI)

- User **wajib menyetujui** setiap perubahan fitur/file; agent AI tidak boleh berubah-ubah sendiri.
- **Jangan pernah** membaca/menampilkan isi `.env` atau kredensial; jangan commit `auth_info_baileys/` (sudah di `.gitignore`).
- `data/` dan `auth_info_baileys/` adalah artefak runtime — boleh dihapus untuk reset (login ulang / data uji), tidak boleh di-commit.
- Jangan install dependency baru tanpa persetujuan user.
- Testing disarankan via mock (lihat riwayat: `mock-whatsapp-test` di `/tmp` pernah dipakai) atau boot singkat; jangan scan QR atas nama user.

## 9. Riwayat Perubahan Penting (2026-08-02)

- Migrasi penyimpanan: JSON/Supabase/Google Sheets → **SQLite** (`node:sqlite`); service `supabaseService` & `googleSheetsService` dihapus.
- Fix bug kritis: double-init `EADDRINUSE` (crash saat start), field customer tidak cocok (data hilang), 5 perintah memanggil method tak ada (`/list /total /stats /rekap /broadcast`), duplikasi absen & status salah.
- `SUPERVISOR_PHONE` (1 nomor) → **`SUPERVISOR_PHONES`** (multi-nomor via env, tanpa hardcode).
- Standarisasi nama kode bahasa Inggris; command tetap Indonesia.
- Hapus 12 file usang (`.sh`, `.md` era lama, service cloud).
- Baileys `rc13` → `rc14` (perbaiki 405 Connection Failure).
