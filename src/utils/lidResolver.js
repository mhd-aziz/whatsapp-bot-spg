/**
 * LID Resolver
 * WhatsApp's LID (Linked ID) is a 15-digit hidden identifier used for contacts
 * whose phone number is private. Messages from such contacts arrive with a LID
 * jid (e.g. 190700876505124@lid) instead of the phone jid.
 * This module maps LID → phone number using Baileys' lid-mapping files
 * (auth_info_baileys/lid-mapping-<phone>.json) plus live 'lid-mapping.update'
 * events, so supervisor checks and attendance records see real phone numbers.
 */

const fs = require('fs');
const path = require('path');

const AUTH_DIR = 'auth_info_baileys';
const lidToPhone = new Map();

/** Reload mappings from lid-mapping-<phone>.json files on disk. */
function refreshFromDisk() {
  if (!fs.existsSync(AUTH_DIR)) return;
  for (const file of fs.readdirSync(AUTH_DIR)) {
    const match = file.match(/^lid-mapping-(\d+)\.json$/);
    if (!match) continue;
    try {
      const lid = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, file), 'utf8')).trim();
      if (lid && !lidToPhone.has(lid)) lidToPhone.set(lid, match[1]);
    } catch {
      // ignore malformed mapping files
    }
  }
}

/** Register a mapping from Baileys 'lid-mapping.update' events. */
function registerLidMapping(lid, phone) {
  if (lid && phone) lidToPhone.set(String(lid), String(phone));
}

/** Heuristic: WhatsApp LIDs are 15-digit numbers starting with 1. */
function isLikelyLid(user) {
  return /^\d{15}$/.test(user) && user.startsWith('1');
}

/**
 * Resolve a WhatsApp jid to a phone number, converting LID jids when possible.
 * @param {string} whatsappId - jid like 62812345678@s.whatsapp.net or 1907...@lid
 * @returns {string} phone number (LID falls back to itself if unmapped)
 */
function resolvePhone(whatsappId) {
  const user = String(whatsappId || '').split('@')[0];
  if (!isLikelyLid(user)) return user;
  if (!lidToPhone.has(user)) refreshFromDisk(); // mapping baru bisa muncul kapan saja
  return lidToPhone.get(user) || user;
}

module.exports = { refreshFromDisk, registerLidMapping, resolvePhone };
