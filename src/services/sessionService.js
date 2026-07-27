/**
 * Session Service (Baileys Version)
 */

class SessionService {
  constructor() {
    this.sessions = new Map();
  }

  setSession(phone, state, data = {}) {
    this.sessions.set(phone, {
      state,
      data,
      timestamp: Date.now(),
    });
  }

  getSession(phone) {
    const session = this.sessions.get(phone);
    if (session && Date.now() - session.timestamp > 30 * 60 * 1000) {
      this.sessions.delete(phone);
      return null;
    }
    return session || null;
  }

  clearSession(phone) {
    this.sessions.delete(phone);
  }
}

module.exports = new SessionService();
