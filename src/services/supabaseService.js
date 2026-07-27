/**
 * Supabase Service
 * Handles database operations with Supabase (PostgreSQL)
 */

const { createClient } = require('@supabase/supabase-js');
const { config } = require('../config');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    if (!config.supabase.url || !config.supabase.anonKey) {
      logger.warn('Supabase credentials not configured. Using local storage only.');
      return;
    }

    try {
      this.client = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false,
        },
      });
      this.isConnected = true;
      logger.info('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase client', error.message);
    }
  }

  /**
   * Check if Supabase is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  // ==================== ATTENDANCE METHODS ====================

  /**
   * Save attendance record to Supabase
   * @param {Object} record - Attendance record
   * @returns {Promise<Object|null>} Saved record or null
   */
  async saveAttendance(record) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client
        .from('attendance')
        .insert([{
          phone: record.phone,
          date: record.date,
          type: record.type,
          photo_url: record.photoUrl || null,
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          timestamp: record.timestamp,
        }])
        .select()
        .single();

      if (error) throw error;
      logger.debug('Attendance saved to Supabase', data.id);
      return data;
    } catch (error) {
      logger.error('Failed to save attendance to Supabase', error.message);
      return null;
    }
  }

  /**
   * Get attendance records from Supabase
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAttendance(options = {}) {
    if (!this.isAvailable()) return [];

    try {
      let query = this.client.from('attendance').select('*');

      if (options.phone) {
        query = query.eq('phone', options.phone);
      }
      if (options.date) {
        query = query.eq('date', options.date);
      }
      if (options.startDate && options.endDate) {
        query = query.gte('date', options.startDate).lte('date', options.endDate);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get attendance from Supabase', error.message);
      return [];
    }
  }

  // ==================== CUSTOMER METHODS ====================

  /**
   * Save customer record to Supabase
   * @param {Object} customer - Customer data
   * @returns {Promise<Object|null>}
   */
  async saveCustomer(customer) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client
        .from('customers')
        .insert([{
          nama: customer.nama,
          hp: customer.hp,
          kota: customer.kota || null,
          spg_phone: customer.spgPhone,
          date: customer.date,
          timestamp: customer.timestamp,
        }])
        .select()
        .single();

      if (error) throw error;
      logger.debug('Customer saved to Supabase', data.id);
      return data;
    } catch (error) {
      logger.error('Failed to save customer to Supabase', error.message);
      return null;
    }
  }

  /**
   * Get customer records from Supabase
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getCustomers(options = {}) {
    if (!this.isAvailable()) return [];

    try {
      let query = this.client.from('customers').select('*');

      if (options.spgPhone) {
        query = query.eq('spg_phone', options.spgPhone);
      }
      if (options.date) {
        query = query.eq('date', options.date);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get customers from Supabase', error.message);
      return [];
    }
  }

  // ==================== USER METHODS ====================

  /**
   * Get or create user profile
   * @param {string} phone - User phone number
   * @param {string} name - User name (optional)
   * @returns {Promise<Object|null>}
   */
  async getOrCreateUser(phone, name = null) {
    if (!this.isAvailable()) return null;

    try {
      // Try to get existing user
      const { data: existingUser, error: fetchError } = await this.client
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (existingUser) return existingUser;

      // Create new user
      const { data: newUser, error: createError } = await this.client
        .from('users')
        .insert([{
          phone,
          name: name || phone,
          role: 'spg', // Default role
        }])
        .select()
        .single();

      if (createError) throw createError;
      logger.info('New user created in Supabase', phone);
      return newUser;
    } catch (error) {
      logger.error('Failed to get/create user in Supabase', error.message);
      return null;
    }
  }

  /**
   * Update user profile
   * @param {string} phone - User phone number
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>}
   */
  async updateUser(phone, updates) {
    if (!this.isAvailable()) return null;

    try {
      const { data, error } = await this.client
        .from('users')
        .update(updates)
        .eq('phone', phone)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update user in Supabase', error.message);
      return null;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get statistics from Supabase
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  async getStats(date) {
    if (!this.isAvailable()) {
      return { attendance: { masuk: 0, pulang: 0 }, customers: 0 };
    }

    try {
      // Get attendance count
      const { count: masukCount } = await this.client
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', date)
        .eq('type', 'masuk');

      const { count: pulangCount } = await this.client
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', date)
        .eq('type', 'pulang');

      // Get customer count
      const { count: customerCount } = await this.client
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('date', date);

      return {
        attendance: {
          masuk: masukCount || 0,
          pulang: pulangCount || 0,
        },
        customers: customerCount || 0,
      };
    } catch (error) {
      logger.error('Failed to get stats from Supabase', error.message);
      return { attendance: { masuk: 0, pulang: 0 }, customers: 0 };
    }
  }
}

// Export singleton instance
module.exports = new SupabaseService();
