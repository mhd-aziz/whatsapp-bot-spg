const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

// ──────────────────────────────────────────
// Health Check HTTP Server (untuk Fly.io)
// ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', bot: 'WhatsApp Bot SPG', uptime: process.uptime() }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});
healthServer.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
});

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: process.env.CLIENT_NAME || 'spg-bot',
        dataPath: process.env.DATA_PATH || './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    }
});

// Data storage (sementara pakai JSON, nanti bisa upgrade ke Google Sheets)
const DATA_DIR = './data';
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

// Buat folder jika belum ada
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR);
if (!fs.existsSync(ATTENDANCE_FILE)) fs.writeFileSync(ATTENDANCE_FILE, '[]');
if (!fs.existsSync(CUSTOMERS_FILE)) fs.writeFileSync(CUSTOMERS_FILE, '[]');

// State management untuk conversation flow
const userStates = {};

// Helper functions
function loadJSON(filepath) {
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getTimestamp() {
    return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function formatPhoneNumber(phone) {
    // Normalisasi format nomor
    return phone.replace(/[^\d]/g, '');
}

// QR Code untuk login
client.on('qr', (qr) => {
    console.log('📱 Scan QR Code ini dengan WhatsApp kamu:');
    qrcode.generate(qr, { small: true });
});

// Bot ready
client.on('ready', () => {
    console.log('✅ Bot WhatsApp SPG/SPB siap digunakan!');
    console.log('⏰ Bot aktif sejak:', getTimestamp());
});

// Handler pesan masuk
client.on('message', async (message) => {
    const chat = await message.getChat();
    const sender = message.from;
    const senderPhone = formatPhoneNumber(sender);
    const text = message.body.trim();

    // Ignore group messages
    if (chat.isGroup) return;

    console.log(`📩 Pesan dari ${sender}: ${text}`);

    // Command handler
    if (text.startsWith('/')) {
        await handleCommand(message, text, sender, senderPhone);
    } else {
        // Handle conversation flow (untuk input customer data)
        await handleConversation(message, text, sender, senderPhone);
    }
});

// Handle commands
async function handleCommand(message, text, sender, senderPhone) {
    const command = text.toLowerCase().split(' ')[0];

    switch (command) {
        case '/start':
        case '/help':
            await sendHelpMessage(message);
            break;

        case '/masuk':
            await handleCheckIn(message, sender, senderPhone);
            break;

        case '/pulang':
            await handleCheckOut(message, sender, senderPhone);
            break;

        case '/customer':
            await startCustomerFlow(message, sender, senderPhone);
            break;

        case '/laporan':
            await sendDailyReport(message, sender, senderPhone);
            break;

        case '/status':
            await sendUserStatus(message, sender, senderPhone);
            break;

        default:
            await message.reply('❌ Command tidak dikenal. Ketik /help untuk melihat daftar command.');
    }
}

// Send help message
async function sendHelpMessage(message) {
    const helpText = `
🤖 *Bot Monitoring SPG/SPB Grab*

*Command yang tersedia:*

📍 */masuk* - Absen masuk kerja (kirim foto lokasi)
📍 */pulang* - Absen pulang kerja (kirim foto lokasi)
👥 */customer* - Input data customer baru
📊 */laporan* - Lihat laporan harian
ℹ️ */status* - Cek status absensi kamu hari ini
❓ */help* - Tampilkan pesan ini

*Cara pakai:*
1. Ketik /masuk saat mulai kerja
2. Kirim foto lokasi kamu
3. Ketik /customer untuk input data customer
4. Ketik /pulang saat selesai kerja

_by avv_ ❤️
    `.trim();

    await message.reply(helpText);
}

// Handle check-in
async function handleCheckIn(message, sender, senderPhone) {
    const attendance = loadJSON(ATTENDANCE_FILE);
    const today = getTodayDate();
    
    // Cek apakah sudah check-in hari ini
    const existingCheckIn = attendance.find(
        a => a.phone === senderPhone && a.date === today && a.type === 'masuk'
    );

    if (existingCheckIn) {
        await message.reply('⚠️ Kamu sudah absen masuk hari ini pada ' + existingCheckIn.timestamp);
        return;
    }

    // Set state untuk menunggu foto
    userStates[senderPhone] = {
        action: 'check_in',
        timestamp: Date.now()
    };

    await message.reply('📸 Silakan kirim foto lokasi kamu sekarang untuk absen masuk.');
}

// Handle check-out
async function handleCheckOut(message, sender, senderPhone) {
    const attendance = loadJSON(ATTENDANCE_FILE);
    const today = getTodayDate();
    
    // Cek apakah sudah check-in
    const checkIn = attendance.find(
        a => a.phone === senderPhone && a.date === today && a.type === 'masuk'
    );

    if (!checkIn) {
        await message.reply('⚠️ Kamu belum absen masuk hari ini. Ketik /masuk terlebih dahulu.');
        return;
    }

    // Cek apakah sudah check-out
    const existingCheckOut = attendance.find(
        a => a.phone === senderPhone && a.date === today && a.type === 'pulang'
    );

    if (existingCheckOut) {
        await message.reply('⚠️ Kamu sudah absen pulang hari ini pada ' + existingCheckOut.timestamp);
        return;
    }

    // Set state untuk menunggu foto
    userStates[senderPhone] = {
        action: 'check_out',
        timestamp: Date.now()
    };

    await message.reply('📸 Silakan kirim foto lokasi kamu sekarang untuk absen pulang.');
}

// Start customer data input flow
async function startCustomerFlow(message, sender, senderPhone) {
    userStates[senderPhone] = {
        action: 'customer_input',
        step: 'nama',
        data: {},
        timestamp: Date.now()
    };

    await message.reply('👥 *Input Data Customer Baru*\n\n📝 Silakan ketik *nama customer*:');
}

// Handle conversation flow
async function handleConversation(message, text, sender, senderPhone) {
    const state = userStates[senderPhone];

    if (!state) return;

    // Timeout check (10 menit)
    if (Date.now() - state.timestamp > 600000) {
        delete userStates[senderPhone];
        await message.reply('⏱️ Sesi telah habis. Silakan ulangi dari awal.');
        return;
    }

    // Handle foto untuk check-in/out
    if (message.hasMedia && (state.action === 'check_in' || state.action === 'check_out')) {
        await handlePhotoSubmission(message, sender, senderPhone, state);
        return;
    }

    // Handle customer data input
    if (state.action === 'customer_input') {
        await handleCustomerInput(message, text, sender, senderPhone, state);
    }
}

// Handle photo submission
async function handlePhotoSubmission(message, sender, senderPhone, state) {
    try {
        const media = await message.downloadMedia();
        
        if (!media || !media.mimetype.startsWith('image/')) {
            await message.reply('❌ File harus berupa foto/gambar. Silakan kirim ulang.');
            return;
        }

        // Save photo
        const today = getTodayDate();
        const timestamp = Date.now();
        const filename = `${senderPhone}_${state.action}_${timestamp}.${media.mimetype.split('/')[1]}`;
        const filepath = path.join(PHOTOS_DIR, filename);
        
        fs.writeFileSync(filepath, media.data, 'base64');

        // Save attendance record
        const attendance = loadJSON(ATTENDANCE_FILE);
        const record = {
            phone: senderPhone,
            sender: sender,
            date: today,
            type: state.action === 'check_in' ? 'masuk' : 'pulang',
            timestamp: getTimestamp(),
            photo: filename
        };

        attendance.push(record);
        saveJSON(ATTENDANCE_FILE, attendance);

        // Clear state
        delete userStates[senderPhone];

        const emoji = state.action === 'check_in' ? '🟢' : '🔴';
        const actionText = state.action === 'check_in' ? 'MASUK' : 'PULANG';
        
        await message.reply(`✅ ${emoji} Absen *${actionText}* berhasil!\n\n⏰ ${getTimestamp()}\n📸 Foto tersimpan\n\n_Terima kasih!_`);

    } catch (error) {
        console.error('Error handling photo:', error);
        await message.reply('❌ Terjadi kesalahan saat memproses foto. Silakan coba lagi.');
    }
}

// Handle customer data input flow
async function handleCustomerInput(message, text, sender, senderPhone, state) {
    switch (state.step) {
        case 'nama':
            state.data.nama = text;
            state.step = 'hp';
            state.timestamp = Date.now();
            await message.reply('📱 Silakan ketik *nomor HP customer* (format: 08xxx):');
            break;

        case 'hp':
            // Validasi nomor HP
            if (!/^(08|628|\+628)\d{8,12}$/.test(text.replace(/\s/g, ''))) {
                await message.reply('❌ Format nomor HP tidak valid. Silakan ketik ulang (contoh: 081234567890):');
                return;
            }
            state.data.hp = text.replace(/\s/g, '');
            state.step = 'kota';
            state.timestamp = Date.now();
            await message.reply('🏙️ Silakan ketik *kota customer*:');
            break;

        case 'kota':
            state.data.kota = text;
            
            // Save customer data
            const customers = loadJSON(CUSTOMERS_FILE);
            const customerRecord = {
                ...state.data,
                spg_phone: senderPhone,
                spg_sender: sender,
                date: getTodayDate(),
                timestamp: getTimestamp()
            };
            
            customers.push(customerRecord);
            saveJSON(CUSTOMERS_FILE, customers);

            // Clear state
            delete userStates[senderPhone];

            await message.reply(`✅ *Data customer berhasil tersimpan!*

👤 Nama: ${state.data.nama}
📱 HP: ${state.data.hp}
🏙️ Kota: ${state.data.kota}

_Terima kasih! Data telah masuk ke sistem._`);
            break;
    }
}

// Send daily report
async function sendDailyReport(message, sender, senderPhone) {
    const today = getTodayDate();
    const attendance = loadJSON(ATTENDANCE_FILE);
    const customers = loadJSON(CUSTOMERS_FILE);

    // Filter data hari ini
    const todayAttendance = attendance.filter(a => a.date === today);
    const todayCustomers = customers.filter(c => c.date === today);

    // Group by phone
    const checkIns = todayAttendance.filter(a => a.type === 'masuk');
    const checkOuts = todayAttendance.filter(a => a.type === 'pulang');

    // Check if supervisor (bisa di-customize)
    const isSupervisor = true; // Nanti bisa ditambah validasi nomor supervisor

    let reportText = `📊 *LAPORAN HARIAN*\n📅 ${today}\n\n`;

    if (isSupervisor) {
        // Laporan lengkap untuk supervisor
        reportText += `👥 *ABSENSI SPG/SPB*\n`;
        reportText += `✅ Check-in: ${checkIns.length} orang\n`;
        reportText += `✅ Check-out: ${checkOuts.length} orang\n\n`;

        if (checkIns.length > 0) {
            reportText += `*Detail Check-in:*\n`;
            checkIns.forEach((record, idx) => {
                reportText += `${idx + 1}. ${record.sender.split('@')[0]} - ${record.timestamp}\n`;
            });
            reportText += `\n`;
        }

        reportText += `👥 *DATA CUSTOMER*\n`;
        reportText += `📝 Total: ${todayCustomers.length} customer\n\n`;

        if (todayCustomers.length > 0) {
            reportText += `*Detail Customer:*\n`;
            todayCustomers.forEach((c, idx) => {
                reportText += `${idx + 1}. ${c.nama} - ${c.kota} (${c.hp})\n`;
            });
        }
    } else {
        // Laporan personal untuk SPG
        const myAttendance = todayAttendance.filter(a => a.phone === senderPhone);
        const myCustomers = todayCustomers.filter(c => c.spg_phone === senderPhone);

        reportText += `*Status Absensi Kamu:*\n`;
        const myCheckIn = myAttendance.find(a => a.type === 'masuk');
        const myCheckOut = myAttendance.find(a => a.type === 'pulang');

        reportText += myCheckIn ? `✅ Masuk: ${myCheckIn.timestamp}\n` : `❌ Belum absen masuk\n`;
        reportText += myCheckOut ? `✅ Pulang: ${myCheckOut.timestamp}\n` : `⏳ Belum absen pulang\n`;

        reportText += `\n*Data Customer Kamu:*\n`;
        reportText += `📝 Total: ${myCustomers.length} customer\n`;
    }

    reportText += `\n_by avv_ ❤️`;

    await message.reply(reportText);
}

// Send user status
async function sendUserStatus(message, sender, senderPhone) {
    const today = getTodayDate();
    const attendance = loadJSON(ATTENDANCE_FILE);
    const customers = loadJSON(CUSTOMERS_FILE);

    const myAttendance = attendance.filter(a => a.phone === senderPhone && a.date === today);
    const myCustomers = customers.filter(c => c.spg_phone === senderPhone && c.date === today);

    const checkIn = myAttendance.find(a => a.type === 'masuk');
    const checkOut = myAttendance.find(a => a.type === 'pulang');

    let statusText = `ℹ️ *STATUS KAMU HARI INI*\n📅 ${today}\n\n`;

    statusText += `*Absensi:*\n`;
    statusText += checkIn ? `✅ Masuk: ${checkIn.timestamp}\n` : `❌ Belum absen masuk\n`;
    statusText += checkOut ? `✅ Pulang: ${checkOut.timestamp}\n` : `⏳ Belum absen pulang\n`;

    statusText += `\n*Customer:*\n`;
    statusText += `📝 Total hari ini: ${myCustomers.length} customer\n`;

    if (myCustomers.length > 0) {
        statusText += `\n*Daftar customer:*\n`;
        myCustomers.forEach((c, idx) => {
            statusText += `${idx + 1}. ${c.nama} (${c.kota})\n`;
        });
    }

    await message.reply(statusText);
}

// Initialize bot
client.initialize();

console.log('🚀 Starting WhatsApp Bot SPG/SPB...');
