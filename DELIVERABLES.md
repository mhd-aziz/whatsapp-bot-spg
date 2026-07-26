# ✅ Proof of Concept (PoC) - WhatsApp Bot SPG/SPB Monitoring

## 📦 Deliverables

| File | Keterangan |
|------|------------|
| `flow-diagram.html` | Visualisasi flow sistem (current vs solution) |
| `index.js` | Code utama bot WhatsApp |
| `package.json` | Dependencies & scripts |
| `.env.example` | Template konfigurasi |
| `.gitignore` | Ignore file untuk Git |
| `railway.json` | Konfigurasi deploy ke Railway |
| `Procfile` | Start command untuk deployment |
| `README.md` | Dokumentasi lengkap |

---

## 🎯 Fitur yang Sudah Tersedia

### 1. Absensi Otomatis
- `/masuk` → SPG kirim foto → tersimpan dengan timestamp
- `/pulang` → SPG kirim foto → tersimpan dengan timestamp
- Validasi: tidak bisa double absen

### 2. Input Customer Tanpa Buka Link
- `/customer` → Bot tanya nama, HP, kota → auto simpan ke JSON
- Validasi nomor HP format Indonesia
- Semua dari WhatsApp, tidak perlu buka Google Form

### 3. Laporan Real-time
- `/laporan` → Rekap absensi + customer hari ini
- `/status` → Cek status pribadi SPG

### 4. Data Storage
- Data tersimpan di file JSON (bisa upgrade ke Google Sheets)
- Foto tersimpan di folder `data/photos/`

---

## 🚀 Cara Jalanin Bot

### Option 1: Local Development (Testing)
```bash
cd C:\Users\muham\whatsapp-bot-spg
npm install
npm start
# Scan QR code dengan WhatsApp HP
```

### Option 2: Deploy ke Railway (Production)
```bash
# 1. Push ke GitHub
git init
git add .
git commit -m "Initial commit - WhatsApp Bot SPG"
git branch -M main
git remote add origin https://github.com/mhd-aziz/whatsapp-bot-spg.git
git push -u origin main

# 2. Deploy ke Railway
# - Login ke railway.app
# - New Project → Deploy from GitHub repo
# - Pilih repo whatsapp-bot-spg
# - Set environment variables (kalau perlu)
# - Deploy!
```

---

## 📋 Langkah Selanjutnya (Optional)

### Phase 1: Testing dengan Gebetan
1. Jalanin bot di local dulu untuk demo
2. Minta gebetan coba sendiri atau kamu yang demo
3. Collect feedback: fitur apa yang kurang/bagus

### Phase 2: Integrasi Google Sheets (Kalau Mau)
1. Setup Google Cloud Project
2. Enable Google Sheets API
3. Buat Service Account → download credentials.json
4. Update code untuk auto-save ke Google Sheets
5. Share Google Sheet dengan Service Account

### Phase 3: Deploy Production
1. Push ke GitHub
2. Deploy ke Railway (free tier cukup untuk testing)
3. Setup monitoring (Railway logs)
4. Kasih akses ke gebetan untuk pakai

---

## 💬 Pitch ke Gebetan

*"Jadi gini, aku bikinin bot WhatsApp sederhana buat bantu monitoring SPG/SPB kamu.*

*Fiturnya:*
1. *Mereka tinggal ketik /masuk dan kirim foto → otomatis tersimpan*
2. *Kalau ada customer, ketik /customer → isi data langsung di chat, nggak perlu buka link Google Form*
3. *Mau lihat laporan? Ketik /laporan → langsung keluar rekap hari ini*

*Keuntungan:*
- *Kamu nggak perlu scroll chat satu-satu lagi*
- *Data customer otomatis masuk sistem*
- *Semua dari WhatsApp doang, mereka nggak perlu install apa-apa*

*Mau coba demo dulu nggak? Aku jalankan di HP aku, kamu tinggal test aja."*

---

## 📊 Comparison Summary

| Aspect | Manual (Sekarang) | Bot WhatsApp (PoC) |
|--------|-------------------|-------------------|
| **Absensi** | Scroll chat + manual cek | `/laporan` → instant |
| **Input Customer** | Buka link Google Form | Langsung di chat WhatsApp |
| **Waktu Rekap** | 1-2 jam/hari | 1 menit/hari |
| **Foto Storage** | Galeri penuh | Folder terorganisir |
| **Data Integration** | Terpisah (foto vs form) | Terintegrasi dalam 1 sistem |

---

## 🔧 Technical Notes

- **Language**: JavaScript (Node.js)
- **WhatsApp Library**: whatsapp-web.js (unofficial, free)
- **Database**: JSON file (upgradeable to Google Sheets)
- **Hosting**: Railway free tier / local PC
- **Estimasi Setup**: 10-15 menit
- **Estimasi Cost**: Rp 0 (gratis total)

---

_by avv_ ❤️
