/**
 * WhatsApp Bot Application (Baileys Version)
 * Main application logic for SPG/SPB monitoring bot
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { config, validateConfig } = require('./config');
const commandHandler = require('./handlers/commandHandler');
const storageService = require('./services/storageService');
const logger = require('./utils/logger');

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.app = null;
    this.server = null;
    this.isReady = false;
  }

  async initialize() {
    logger.info('Initializing WhatsApp Bot (Baileys)...');
    validateConfig();
    await storageService.initialize();
    this.initializeServer();
    await this.connectToWhatsApp();
  }

  initializeServer() {
    this.app = express();
    const port = config.bot.port;

    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        bot: this.isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    });

    this.server = this.app.listen(port, () => {
      logger.info(`Health check server running on port ${port}`);
    });
  }

  async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    this.sock = makeWASocket({
      logger: pino({ level: 'error' }),
      printQRInTerminal: true,
      auth: state,
      browser: ['SPG Monitoring Bot', 'Chrome', '1.0.0'],
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.botEvent('QR Code received', 'Scan with WhatsApp');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        this.isReady = false;
        logger.warn('WhatsApp disconnected', lastDisconnect?.error);
        if (shouldReconnect) {
          await this.connectToWhatsApp();
        }
      } else if (connection === 'open') {
        this.isReady = true;
        logger.botEvent('Bot Ready', 'WhatsApp connected successfully');
        console.log('✅ Bot WhatsApp siap digunakan!\n');
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.key.fromMe) {
          await this.handleMessage(msg);
        }
      }
    });
  }

  async handleMessage(msg) {
    const jid = msg.key.remoteJid;
    if (jid.includes('@g.us') || jid === 'status@broadcast') return;

    // Adapt Baileys message to match the handler's expectation
    const adaptedMsg = {
      from: jid,
      body: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
      hasMedia: !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.documentMessage),
      type: msg.message?.imageMessage ? 'image' : 'chat',
      original: msg,
      reply: async (text) => {
        await this.sock.sendMessage(jid, { text }, { quoted: msg });
      },
      downloadMedia: async () => {
        return await downloadMediaMessage(msg, 'buffer', {});
      },
    };

    try {
      await commandHandler.handleMessage(adaptedMsg, this.sock);
    } catch (error) {
      logger.error('Error handling message', error);
    }
  }

  async shutdown() {
    logger.info('Shutting down bot...');

    try {
      if (this.sock) this.sock.end(undefined);
    } catch (error) {
      logger.error('Error closing WhatsApp socket', error.message);
    }

    try {
      if (this.server) this.server.close();
    } catch (error) {
      logger.error('Error closing health server', error.message);
    }

    process.exit(0);
  }
}

module.exports = new WhatsAppBot();
