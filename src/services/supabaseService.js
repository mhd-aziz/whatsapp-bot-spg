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

  isAvailable() {
    return this.isConnected && this.client !== null;
  }

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
      return data;
    } catch (error) {
      logger.error('Failed to save attendance to Supabase', error.message);
      return null;
    }
  }

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

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get attendance from Supabase', error.message);
      return [];
    }
  }

  async deleteAttendance(phone, date) {
    if (!this.isAvailable()) return false;

    try {
      const { error } = await this.client
        .from('attendance')
        .delete()
        .eq('phone', phone)
        .eq('date', date);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to delete attendance from Supabase', error.message);
      return false;
    }
  }

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
      return data;
    } catch (error) {
      logger.error('Failed to save customer to Supabase', error.message);
      return null;
    }
  }

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

  async getStats(date) {
    if (!this.isAvailable()) {
      return { attendance: { masuk: 0, pulang: 0 }, customers: 0 };
    }

    try {
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

module.exports = new SupabaseService();
