/**
 * WhatsApp Bot Application
 * Main application logic for SPG/SPB monitoring bot
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { config, validateConfig } = require('./config');
const commandHandler = require('./handlers/commandHandler');
const storageService = require('./services/storageService');
const logger = require('./utils/logger');

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.app = null;
    this.isReady = false;
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    logger.info('Initializing WhatsApp Bot...');
    
    // Validate configuration
    validateConfig();
    
    // Initialize storage services
    await storageService.initialize();
    
    // Initialize Express server (for health check)
    this.initializeServer();
    
    // Initialize WhatsApp client
    this.initializeWhatsApp();
  }

  /**
   * Initialize Express server for health checks
   */
  initializeServer() {
    this.app = express();
    const port = config.bot.port;

    // Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        bot: this.isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', bot: this.isReady });
    });

    this.app.listen(port, () => {
      logger.info(`Health check server running on port ${port}`);
    });
  }

  /**
   * Initialize WhatsApp client
   */
  initializeWhatsApp() {
    // Puppeteer options
    const puppeteerOptions = {
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
    };

    // Add executable path if configured
    if (config.puppeteer.executablePath) {
      puppeteerOptions.executablePath = config.puppeteer.executablePath;
    }

    // Create WhatsApp client
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: config.bot.clientName,
      }),
      puppeteer: puppeteerOptions,
    });

    // Set up event handlers
    this.setupEventHandlers();
    
    // Start the client
    this.client.initialize();
  }

  /**
   * Set up WhatsApp event handlers
   */
  setupEventHandlers() {
    // QR Code event
    this.client.on('qr', (qr) => {
      logger.botEvent('QR Code received', 'Scan with WhatsApp');
      qrcode.generate(qr, { small: true });
      console.log('\n📱 Scan QR code di atas dengan WhatsApp untuk login.\n');
    });

    // Ready event
    this.client.on('ready', () => {
      this.isReady = true;
      logger.botEvent('Bot Ready', 'WhatsApp connected successfully');
      console.log('✅ Bot WhatsApp siap digunakan!\n');
    });

    // Message received event
    this.client.on('message', async (msg) => {
      await this.handleMessage(msg);
    });

    // Message create event (for messages sent by bot or others)
    this.client.on('message_create', async (msg) => {
      // Only handle messages not from the bot itself
      if (!msg.fromMe) {
        await this.handleMessage(msg);
      }
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      logger.warn('WhatsApp disconnected', reason);
      console.log('❌ WhatsApp disconnected. Reason:', reason);
    });

    // Auth failure event
    this.client.on('auth_failure', (msg) => {
      logger.error('Authentication failed', msg);
      console.log('❌ Authentication failed:', msg);
    });

    // Connection event
    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated');
      console.log('🔐 WhatsApp authenticated');
    });

    // Loading screen event
    this.client.on('loading_screen', (percent, message) => {
      if (percent % 20 === 0) {
        logger.debug(`Loading: ${percent}% - ${message}`);
      }
    });

    // State change event
    this.client.on('change_state', (state) => {
      logger.debug('State changed to:', state);
    });
  }

  /**
   * Handle incoming message
   * @param {Object} msg - WhatsApp message object
   */
  async handleMessage(msg) {
    // Skip messages from groups (optional)
    if (msg.from.includes('@g.us')) {
      logger.debug('Group message ignored');
      return;
    }

    // Skip messages from status
    if (msg.from === 'status@broadcast') {
      return;
    }

    // Skip messages without body (media only, etc.)
    if (!msg.body && !msg.hasMedia) {
      return;
    }

    // Log incoming message
    const from = msg.from.split('@')[0];
    logger.debug(`Message from ${from}: ${msg.body?.substring(0, 50) || '(media)'}`);

    // Route message to command handler
    try {
      await commandHandler.handleMessage(msg, this.client);
    } catch (error) {
      logger.error('Error handling message', error);
    }
  }

  /**
   * Send message to specific number
   * @param {string} to - Phone number or WhatsApp ID
   * @param {string} message - Message to send
   */
  async sendMessage(to, message) {
    if (!this.isReady) {
      throw new Error('Bot is not ready');
    }

    const chatId = to.includes('@') ? to : `${to}@c.us`;
    await this.client.sendMessage(chatId, message);
  }

  /**
   * Shutdown the bot gracefully
   */
  async shutdown() {
    logger.info('Shutting down bot...');
    
    if (this.client) {
      await this.client.destroy();
    }
    
    logger.info('Bot shutdown complete');
    process.exit(0);
  }
}

module.exports = new WhatsAppBot();
