# 📚 WhatsApp-Web.js Documentation Analysis

## 📋 Overview

**Library:** whatsapp-web.js v1.34.7
**Type:** Node.js library for interacting with WhatsApp Web
**Official Docs:** https://docs.wwebjs.dev/
**GitHub:** https://github.com/wwebjs/whatsapp-web.js/

---

## 🎯 Key Concepts

### What is whatsapp-web.js?
A powerful Node.js library that connects to WhatsApp Web, allowing you to:
- Send and receive messages
- Handle media (photos, videos, documents)
- Manage groups and contacts
- Listen to events (message received, status changes, etc.)
- Automate WhatsApp interactions

### How It Works
- Connects to official WhatsApp Web (reduces ban risks)
- Uses Puppeteer to control a headless Chrome browser
- Maintains session through authentication strategies
- Object-oriented API for easy usage

---

## 🏗️ Core Classes & Interfaces

### 1. **Client** (Main Class)
The primary interface for interacting with WhatsApp.

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});
```

**Main Methods:**
- `client.initialize()` - Start the client
- `client.sendMessage(chatId, content)` - Send message
- `client.getState()` - Get connection state
- `client.getChats()` - Get all chats
- `client.getContacts()` - Get all contacts
- `client.getChatById(chatId)` - Get specific chat
- `client.getContactById(contactId)` - Get specific contact
- `client.createGroup(name, participants)` - Create group
- `client.destroy()` - Disconnect and cleanup

**Events:**
- `qr` - QR code received (scan with phone)
- `ready` - Client is ready
- `authenticated` - Authentication successful
- `auth_failure` - Authentication failed
- `message` - New message received
- `message_create` - Message created (sent/received)
- `message_revoke_everyone` - Message deleted for everyone
- `message_revoke_me` - Message deleted for me
- `message_ack` - Message acknowledgment changed
- `group_join` - User joined group
- `group_leave` - User left group
- `group_update` - Group updated
- `disconnected` - Client disconnected
- `change_state` - Connection state changed
- `change_battery` - Battery status changed

### 2. **Message**
Represents a WhatsApp message.

**Properties:**
- `id` - Message ID
- `body` - Message text content
- `from` - Sender ID (phone@c.us)
- `to` - Recipient ID
- `timestamp` - Unix timestamp
- `hasMedia` - Boolean if message has media
- `type` - Message type (chat, image, video, document, etc.)
- `isForwarded` - If message is forwarded
- `isStatus` - If message is a status update
- `isStarred` - If message is starred
- `isGif` - If media is a GIF
- `author` - Author (in groups)
- `fromMe` - If sent by current user
- `hasQuotedMsg` - If message quotes another message
- `location` - Location data (if location message)
- `mentionedIds` - Array of mentioned contact IDs
- `links` - Array of links in message

**Methods:**
- `msg.reply(content)` - Reply to the message
- `msg.forward(chatId)` - Forward message
- `msg.delete(everyone)` - Delete message
- `msg.star()` - Star message
- `msg.unstar()` - Unstar message
- `msg.react(emoji)` - React to message with emoji
- `msg.downloadMedia()` - Download media attachment
- `msg.getQuotedMessage()` - Get quoted message
- `msg.getChat()` - Get chat where message was sent
- `msg.getContact()` - Get sender contact
- `msg.getMentions()` - Get mentioned contacts

### 3. **Chat**
Represents a WhatsApp chat (DM or group).

**Properties:**
- `id` - Chat ID
- `name` - Chat name
- `isGroup` - Boolean if group chat
- `isReadOnly` - If chat is read-only
- `unreadCount` - Number of unread messages
- `timestamp` - Last activity timestamp
- `archived` - If chat is archived
- `pinned` - If chat is pinned
- `isMuted` - If chat is muted
- `muteExpiration` - Mute expiration timestamp
- `lastMessage` - Last message in chat

**Methods:**
- `chat.sendMessage(content, options)` - Send message
- `chat.fetchMessages(options)` - Fetch message history
- `chat.sendSeen()` - Mark as read
- `chat.sendStateTyping()` - Show typing indicator
- `chat.sendStateRecording()` - Show recording indicator
- `chat.clearState()` - Clear typing/recording state
- `chat.delete()` - Delete chat
- `chat.clearMessages()` - Clear all messages
- `chat.archive()` - Archive chat
- `chat.unarchive()` - Unarchive chat
- `chat.pin()` - Pin chat
- `chat.unpin()` - Unpin chat
- `chat.mute(expiration)` - Mute chat
- `chat.unmute()` - Unmute chat

### 4. **Contact**
Represents a WhatsApp contact.

**Properties:**
- `id` - Contact ID
- `number` - Phone number
- `name` - Contact name
- `pushname` - Name shown in notifications
- `shortName` - Short name
- `isMe` - If contact is the current user
- `isUser` - If contact is a WhatsApp user
- `isGroup` - If contact is a group
- `isWAContact` - If contact is a WhatsApp contact
- `isMyContact` - If contact is in address book
- `isBlocked` - If contact is blocked
- `profilePicThumbObj` - Profile picture thumbnail

**Methods:**
- `contact.getAbout()` - Get contact's about/status
- `contact.getProfilePicUrl()` - Get profile picture URL
- `contact.getCommonGroups()` - Get common groups
- `contact.block()` - Block contact
- `contact.unblock()` - Unblock contact

### 5. **MessageMedia**
Represents media attachments.

```javascript
const media = MessageMedia.fromFilePath('./image.jpg');

// Or from URL
const media = await MessageMedia.fromUrl('https://example.com/image.jpg');

// Send media
await client.sendMessage(chatId, media, {
    caption: 'Check this out!'
});
```

**Properties:**
- `mimetype` - MIME type
- `data` - Base64 encoded data
- `filename` - File name

**Methods:**
- `MessageMedia.fromFilePath(path)` - Create from file
- `MessageMedia.fromUrl(url, options)` - Create from URL

### 6. **Location**
Represents a location message.

```javascript
const location = new Location(latitude, longitude, description);
await client.sendMessage(chatId, location);
```

### 7. **Auth Strategies**

#### **NoAuth**
No authentication (not recommended for production).

```javascript
const client = new Client({
    authStrategy: new NoAuth()
});
```

#### **LocalAuth** (Recommended)
Stores session locally.

```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'client-one',
        dataPath: './.wwebjs_auth'
    })
});
```

#### **RemoteAuth**
Stores session remotely (database, cloud storage).

```javascript
const client = new Client({
    authStrategy: new RemoteAuth({
        store: customStore,
        backupSyncIntervalMs: 300000
    })
});
```

---

## 🎨 Common Patterns

### Basic Bot Setup

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    if (msg.body === '!ping') {
        await msg.reply('pong');
    }
});

client.initialize();
```

### Sending Messages

```javascript
// Text message
await client.sendMessage('628123456789@c.us', 'Hello!');

// Media message
const media = MessageMedia.fromFilePath('./photo.jpg');
await client.sendMessage('628123456789@c.us', media, {
    caption: 'Check this photo!'
});

// Location
const location = new Location(-6.2088, 106.8456, 'Jakarta');
await client.sendMessage('628123456789@c.us', location);

// Reply to message
await msg.reply('Got your message!');
```

### Handling Media

```javascript
client.on('message', async (msg) => {
    if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        
        // Save to file
        const fs = require('fs');
        fs.writeFileSync(
            `./downloads/${msg.id.id}.${media.mimetype.split('/')[1]}`,
            media.data,
            'base64'
        );
    }
});
```

### Group Operations

```javascript
// Create group
const result = await client.createGroup('My Group', [
    '628123456789@c.us',
    '628987654321@c.us'
]);

// Get group participants
const chat = await msg.getChat();
if (chat.isGroup) {
    console.log('Participants:', chat.participants);
}

// Add participant
await chat.addParticipants(['628111222333@c.us']);

// Remove participant
await chat.removeParticipants(['628111222333@c.us']);

// Promote to admin
await chat.promoteParticipants(['628111222333@c.us']);

// Demote from admin
await chat.demoteParticipants(['628111222333@c.us']);

// Leave group
await chat.leave();
```

### Message Formatting

```javascript
// Bold
await client.sendMessage(chatId, '*bold text*');

// Italic
await client.sendMessage(chatId, '_italic text_');

// Strikethrough
await client.sendMessage(chatId, '~strikethrough~');

// Monospace
await client.sendMessage(chatId, '```monospace```');

// Mention
await client.sendMessage(chatId, 'Hello @628123456789', {
    mentions: ['628123456789@c.us']
});
```

---

## ⚙️ Configuration Options

### Client Options

```javascript
const client = new Client({
    // Authentication strategy
    authStrategy: new LocalAuth({
        clientId: 'my-bot',
        dataPath: './.wwebjs_auth'
    }),
    
    // Puppeteer options
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: '/path/to/chrome' // Optional
    },
    
    // Web cache options
    webVersionCache: {
        type: 'local',
        path: './.wwebjs_cache'
    },
    
    // Other options
    qrMaxRetries: 5,
    restartOnAuthFail: true,
    takeoverOnConflict: false,
    takeoverTimeoutMs: 0
});
```

### Message Send Options

```javascript
await client.sendMessage(chatId, content, {
    // Link preview
    linkPreview: true,
    
    // Send as reply
    quotedMessageId: msg.id._serialized,
    
    // Mentions
    mentions: ['628123456789@c.us'],
    
    // Media options
    caption: 'Photo caption',
    sendMediaAsSticker: false,
    sendMediaAsDocument: false,
    
    // Parse vCards
    parseVCards: true,
    
    // Media filename
    media: {
        filename: 'custom-name.jpg'
    }
});
```

---

## 🔍 Best Practices

### 1. **Error Handling**
Always wrap API calls in try-catch:

```javascript
client.on('message', async (msg) => {
    try {
        await msg.reply('Response');
    } catch (error) {
        console.error('Error sending message:', error);
    }
});
```

### 2. **Rate Limiting**
Avoid sending too many messages at once:

```javascript
async function sendBulkMessages(recipients, message) {
    for (const recipient of recipients) {
        await client.sendMessage(recipient, message);
        // Wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

### 3. **Session Management**
Use LocalAuth for persistent sessions:

```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'my-unique-client-id'
    })
});
```

### 4. **Clean Shutdown**
Always destroy client on exit:

```javascript
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
});
```

### 5. **Media Handling**
Check media size before downloading:

```javascript
if (msg.hasMedia && msg._data.size < 10000000) { // 10MB
    const media = await msg.downloadMedia();
    // Process media
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: QR Code Not Working
**Solution:** Make sure you're using the latest version and check Puppeteer args.

### Issue 2: Session Expired
**Solution:** Delete `.wwebjs_auth` folder and re-authenticate.

### Issue 3: Message Not Sending
**Solution:** Check if phone number format is correct (`628xxx@c.us`).

### Issue 4: Media Download Fails
**Solution:** Increase timeout and check internet connection.

### Issue 5: Bot Gets Banned
**Solution:** 
- Use residential IP
- Don't send spam
- Add delays between messages
- Use official WhatsApp numbers

---

## 📊 Current Implementation Analysis

### What We're Using Correctly ✅

1. **Client Initialization**
   - ✅ LocalAuth for session persistence
   - ✅ Proper Puppeteer configuration
   - ✅ QR code display with qrcode-terminal

2. **Event Handlers**
   - ✅ `qr` event for authentication
   - ✅ `ready` event for connection
   - ✅ `message` event for receiving messages
   - ✅ `disconnected` event handling

3. **Message Handling**
   - ✅ `msg.reply()` for responses
   - ✅ `msg.hasMedia` for media detection
   - ✅ `msg.downloadMedia()` for photos
   - ✅ Command parsing with `/` prefix

### What We Could Improve 🔧

1. **Add Message Acknowledgment Tracking**
   ```javascript
   client.on('message_ack', (msg, ack) => {
       // Track delivery status
   });
   ```

2. **Add Typing Indicators**
   ```javascript
   const chat = await msg.getChat();
   await chat.sendStateTyping();
   // Process command
   await chat.clearState();
   ```

3. **Add Group Detection**
   ```javascript
   const chat = await msg.getChat();
   if (chat.isGroup) {
       // Handle group-specific logic
   }
   ```

4. **Add Contact Info**
   ```javascript
   const contact = await msg.getContact();
   console.log('Name:', contact.pushname);
   ```

5. **Add Message Reactions**
   ```javascript
   await msg.react('✅'); // React with emoji
   ```

6. **Better Media Handling**
   ```javascript
   if (msg.hasMedia) {
       const media = await msg.downloadMedia();
       if (media.mimetype.startsWith('image/')) {
           // Handle image
       } else if (media.mimetype.startsWith('video/')) {
           // Handle video
       }
   }
   ```

---

## 🎯 Recommendations for Our Bot

### Immediate Improvements

1. **Add typing indicator before processing commands**
2. **Add message reactions for acknowledgment**
3. **Improve error messages with emoji**
4. **Add contact name in logs**
5. **Add group chat support (optional)**

### Future Enhancements

1. **Message templates for common responses**
2. **Scheduled messages**
3. **Auto-reply for off-hours**
4. **Message queue for better rate limiting**
5. **Webhook support for external integrations**

---

## 📚 Resources

- **Official Docs:** https://docs.wwebjs.dev/
- **GitHub:** https://github.com/wwebjs/whatsapp-web.js
- **Examples:** https://github.com/wwebjs/whatsapp-web.js/tree/main/example
- **TypeScript Types:** Included in package (`index.d.ts`)

---

**Version:** 1.34.7  
**Last Updated:** 2026-07-26  
**Status:** ✅ Documentation Complete
