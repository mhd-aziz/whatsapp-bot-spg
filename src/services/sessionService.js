/**
 * Session Service
 * Manages temporary user session states for multi-step flows
 */

class SessionService {
  constructor() {
    // In-memory session storage: { phone: { state, data, timestamp } }
    this.sessions = new Map();
    
    // Auto-cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Set user session
   * @param {string} phone - User phone number
   * @param {string} state - Session state (e.g., 'waiting_photo_masuk')
   * @param {object} data - Additional session data
   */
  setSession(phone, state, data = {}) {
    this.sessions.set(phone, {
      state,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get user session
   * @param {string} phone - User phone number
   * @returns {object|null} Session object or null
   */
  getSession(phone) {
    const session = this.sessions.get(phone);
    
    // Check if session expired (30 minutes)
    if (session && Date.now() - session.timestamp > 30 * 60 * 1000) {
      this.clearSession(phone);
      return null;
    }
    
    return session || null;
  }

  /**
   * Clear user session
   * @param {string} phone - User phone number
   */
  clearSession(phone) {
    this.sessions.delete(phone);
  }

  /**
   * Check if user has active session
   * @param {string} phone - User phone number
   * @returns {boolean}
   */
  hasSession(phone) {
    return this.getSession(phone) !== null;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expireTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [phone, session] of this.sessions.entries()) {
      if (now - session.timestamp > expireTime) {
        this.sessions.delete(phone);
      }
    }
  }
}

module.exports = new SessionService();
