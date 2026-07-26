# 🧪 LOCAL TESTING GUIDE - WhatsApp Bot SPG

## 🎯 Tujuan: Test Bot Sendiri Dulu Sebelum Kasih ke Gebetan

---

## 📋 Checklist Testing

- [ ] Bot bisa login (scan QR berhasil)
- [ ] Command `/help` berfungsi
- [ ] Command `/masuk` + foto berhasil
- [ ] Command `/pulang` + foto berhasil
- [ ] Command `/customer` flow lengkap
- [ ] Command `/laporan` tampil data
- [ ] Command `/status` tampil status
- [ ] Data tersimpan di folder `data/`

---

## 🚀 Step-by-Step Local Testing

### Step 1: Install Dependencies

```bash
cd C:\Users\muham\whatsapp-bot-spg
npm install
```

**Expected output:**
```
added 50+ packages
```

---

### Step 2: Setup .env File

```bash
cp .env.example .env
```

Atau buat file `.env` manual dengan isi:
```env
CLIENT_NAME="SPG_Testing_Bot"
SUPERVISOR_PHONE=+6281234567890
ALLOWED_PHONE_PREFIXES=+628,+62
ADMIN_PASSWORD=admin123
```

**Ganti nomor supervisor dengan nomor HP kamu sendiri untuk testing!**

---

### Step 3: Jalankan Bot

```bash
npm start
```

**Expected output:**
```
🚀 Starting WhatsApp Bot SPG/SPB...
📱 Scan QR Code ini dengan WhatsApp kamu:
[QR CODE MUNCUL DI TERMINAL]
```

---

### Step 4: Scan QR Code

1. Buka WhatsApp di HP
2. Klik menu (titik tiga) → **Perangkat Tertaut**
3. Klik **Tautkan Perangkat**
4. Scan QR code yang muncul di terminal

**Expected:**
```
✅ Bot WhatsApp SPG/SPB siap digunakan!
⏰ Bot aktif sejak: [timestamp]
```

---

### Step 5: Testing Commands

**Test dari HP kamu sendiri** (chat ke nomor WhatsApp yang di-scan):

#### Test 1: Help Command
```
Kamu ketik: /help

Bot balasan:
🤖 Bot Monitoring SPG/SPB Grab
[daftar command]
```

#### Test 2: Absen Masuk
```
Kamu ketik: /masuk

Bot balasan:
📸 Silakan kirim foto lokasi kamu sekarang

Kamu kirim foto random

Bot balasan:
✅ 🟢 Absen MASUK berhasil!
⏰ [timestamp]
```

#### Test 3: Input Customer
```
Kamu ketik: /customer

Bot: 📝 Silakan ketik nama customer:
Kamu: Budi Test

Bot: 📱 Silakan ketik nomor HP customer:
Kamu: 081234567890

Bot: 🏙️ Silakan ketik kota customer:
Kamu: Jakarta

Bot: ✅ Data customer berhasil tersimpan!
```

#### Test 4: Status
```
Kamu ketik: /status

Bot balasan:
ℹ️ STATUS KAMU HARI INI
[detail status]
```

#### Test 5: Laporan
```
Kamu ketik: /laporan

Bot balasan:
📊 LAPORAN HARIAN
[rekap data]
```

#### Test 6: Absen Pulang
```
Kamu ketik: /pulang

Bot balasan:
📸 Silakan kirim foto lokasi kamu sekarang

Kamu kirim foto random

Bot balasan:
✅ 🔴 Absen PULANG berhasil!
```

---

### Step 6: Verifikasi Data Tersimpan

Cek folder `data/`:

```bash
ls -la data/
```

**Expected:**
```
data/
├── attendance.json    ← data absensi
├── customers.json     ← data customer
└── photos/
    ├── [phone]_check_in_[timestamp].jpg
    └── [phone]_check_out_[timestamp].jpg
```

Buka `data/attendance.json`:
```json
[
  {
    "phone": "6281234567890",
    "date": "2026-07-26",
    "type": "masuk",
    "timestamp": "26/7/2026 11.45.00",
    "photo": "6281234567890_check_in_1721977500.jpg"
  }
]
```

---

## 🐛 Troubleshooting

### Problem 1: QR Code tidak muncul
**Solution:**
```bash
npm install
# Tunggu selesai, lalu:
npm start
```

### Problem 2: Bot tidak balas
**Solution:**
- Pastikan bot masih running di terminal
- Pastikan WhatsApp masih connected (cek "Perangkat Tertaut")
- Restart bot: `Ctrl+C` lalu `npm start` lagi

### Problem 3: Foto tidak tersimpan
**Solution:**
```bash
mkdir -p data/photos
# Lalu restart bot
```

### Problem 4: Command tidak dikenali
**Solution:**
- Pastikan pakai slash: `/masuk` bukan `masuk`
- Case sensitive: harus lowercase

---

## ✅ Checklist Sebelum Kasih ke Gebetan

Testing tahap 1 (kamu sendiri):
- [ ] Semua command berfungsi normal
- [ ] Foto tersimpan dengan benar
- [ ] Data JSON tersimpan dengan benar
- [ ] Bot bisa jalan 1-2 jam tanpa crash

Testing tahap 2 (teman/orang lain):
- [ ] Minta 1-2 teman coba pakai bot
- [ ] Simulasi 2-3 SPG sekaligus
- [ ] Cek apakah laporan benar

Testing tahap 3 (polish):
- [ ] Screenshot flow bot dari awal sampai akhir
- [ ] Siapkan pitch: "Coba deh test ini..."
- [ ] Siapkan mental kalau dia tetap nolak 😅

---

## 🎬 Demo Script untuk Gebetan

**Versi casual:**

> *"Eh, jadi aku bikinin bot WhatsApp buat bantu monitoring SPG/SPB kamu.*
>
> *Udah aku test sendiri, works perfectly.*
>
> *Mau liat demo? Nanti aku jelasin sambil kamu coba langsung."*

**Versi smooth:**

> *"Aku liat kamu capek tiap hari cek laporan SPG kan...*
>
> *Kebetulan aku lagi belajar bikin automation, jadi aku bikinin prototype bot WhatsApp.*
>
> *SPG tinggal ketik command, semua otomatis masuk sistem. Mau coba?"*

---

## 📊 Testing Log Template

Buat catatan testing kamu:

```
TESTING LOG - [DATE]
====================

Test 1: /help
Status: ✅ / ❌
Notes: ...

Test 2: /masuk + foto
Status: ✅ / ❌
Notes: ...

Test 3: /customer flow
Status: ✅ / ❌
Notes: ...

Test 4: /pulang + foto
Status: ✅ / ❌
Notes: ...

Test 5: /laporan
Status: ✅ / ❌
Notes: ...

Test 6: /status
Status: ✅ / ❌
Notes: ...

BUGS FOUND:
1. ...
2. ...

IMPROVEMENT IDEAS:
1. ...
2. ...
```

---

_Selamat testing! Semoga lancar dan gebetan impressed! ❤️_

_by avv_
