/**
 * UpsellEngine Adapter for Integration Bridge
 * Handles communication with UpsellEngine API
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { 
  UpsellRuleSchema,
  CampaignSchema,
  validateData 
} from '../shared/schemas.js';

class UpsellAdapter {
  constructor(config) {
    this.config = config;
    // Use the database config from the main integration config
    this.supabase = createClient(config.database.url, config.database.key);
    this.baseUrl = config.url;
    this.credentials = config.credentials;
    this.isInitialized = false;
    
    this.logger = {
      info: (message, data = {}) => console.log(`[UPSELL] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[UPSELL] ${message}`, data),
      error: (message, data = {}) => console.error(`[UPSELL] ${message}`, data),
      debug: (message, data = {}) => console.log(`[UPSELL DEBUG] ${message}`, data)
    };
  }

  /**
   * Initialize the UpsellEngine adapter
   */
  async initialize() {
    try {
      this.logger.info('Initializing UpsellEngine Adapter');
      
      // Test connection to UpsellEngine
      await this.testConnection();
      
      this.isInitialized = true;
      this.logger.info('UpsellEngine Adapter initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize UpsellEngine adapter', { error: error.message });
      throw error;
    }
  }

  /**
   * Test connection to UpsellEngine
   */
  async testConnection() {
    try {
      // For now, we'll test by checking if we can access the database
      // In a real implementation, you'd make an API call to the UpsellEngine
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      this.logger.debug('UpsellEngine connection test successful');
      return true;
    } catch (error) {
      throw new Error(`UpsellEngine connection test failed: ${error.message}`);
    }
  }

  /**
   * Create a new upsell rule
   */
  async createRule(config) {
    try {
      this.logger.info('Creating upsell rule', config);

      // Check if we have target products and use existing product ID if available
      let ruleId = uuidv4(); // Default to generated UUID
      if (config.actions && config.actions.target_products && config.actions.target_products.length > 0) {
        const firstProduct = config.actions.target_products[0];
        if (firstProduct && (firstProduct.length !== 36 || !firstProduct.includes('-'))) {
          ruleId = `orchestrator-rule-${firstProduct}`;
        }
      }

      const ruleData = {
        id: ruleId,
        user_id: config.user_id,
        name: config.name,
        description: config.description,
        rule_type: config.rule_type,
        conditions: config.conditions,
        actions: config.actions,
        priority: config.priority || 50,
        is_active: config.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate rule data
      const validation = validateData(UpsellRuleSchema, ruleData);
      if (!validation.success) {
        throw new Error(`Invalid rule data: ${JSON.stringify(validation.errors)}`);
      }

      // Insert rule into database
      const { data, error } = await this.supabase
        .from('upsell_rules')
        .insert(ruleData)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Upsell rule created successfully', { ruleId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to create upsell rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new campaign
   */
  async createCampaign(config) {
    try {
      this.logger.info('Creating campaign', config);

      const campaignData = {
        id: uuidv4(),
        user_id: config.user_id,
        name: config.name,
        description: config.description,
        status: config.status || 'draft',
        campaign_type: config.campaign_type,
        content: config.content,
        settings: config.settings,
        performance_metrics: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate campaign data
      const validation = validateData(CampaignSchema, campaignData);
      if (!validation.success) {
        throw new Error(`Invalid campaign data: ${JSON.stringify(validation.errors)}`);
      }

      // Insert campaign into database
      const { data, error } = await this.supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Campaign created successfully', { campaignId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to create campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(config) {
    try {
      this.logger.info('Updating upsell rule', config);

      const { rule_id, updates } = config;

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('upsell_rules')
        .update(updateData)
        .eq('id', rule_id)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Upsell rule updated successfully', { ruleId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to update upsell rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Activate a campaign
   */
  async activateCampaign(config) {
    try {
      this.logger.info('Activating campaign', config);

      const { campaign_id } = config;

      const { data, error } = await this.supabase
        .from('campaigns')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign_id)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Campaign activated successfully', { campaignId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to activate campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(config) {
    try {
      this.logger.info('Getting performance metrics', config);

      const { rule_id, campaign_id, time_period = '30d' } = config;

      let query = this.supabase
        .from('upsell_events')
        .select('*');

      if (rule_id) {
        query = query.eq('rule_id', rule_id);
      }

      if (campaign_id) {
        query = query.eq('campaign_id', campaign_id);
      }

      // Add time filter
      if (time_period) {
        const daysAgo = this.getDaysAgo(time_period);
        query = query.gte('created_at', daysAgo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const metrics = this.calculateMetrics(data);

      this.logger.info('Performance metrics retrieved', { metrics });
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate performance metrics from events
   */
  calculateMetrics(events) {
    const total = events.length;
    const impressions = events.filter(e => e.event_type === 'impression').length;
    const clicks = events.filter(e => e.event_type === 'click').length;
    const conversions = events.filter(e => e.event_type === 'conversion').length;
    const revenue = events
      .filter(e => e.event_type === 'conversion')
      .reduce((sum, e) => sum + (e.revenue || 0), 0);

    return {
      total_events: total,
      impressions,
      clicks,
      conversions,
      revenue,
      conversion_rate: impressions > 0 ? conversions / impressions : 0,
      click_through_rate: impressions > 0 ? clicks / impressions : 0,
      revenue_per_impression: impressions > 0 ? revenue / impressions : 0
    };
  }

  /**
   * Get days ago from time period string
   */
  getDaysAgo(timePeriod) {
    const now = new Date();
    const days = parseInt(timePeriod.replace('d', ''));
    const daysAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return daysAgo.toISOString();
  }
}

export { UpsellAdapter }; 