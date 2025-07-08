/**
 * Production UpsellEngine Manager
 * Manages rules and campaigns based on Coral insights
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { 
  UpsellRuleSchema,
  CampaignSchema,
  validateData 
} from '../shared/schemas.js';

class UpsellEngineManager {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.database.url, config.database.key);
    
    this.logger = {
      info: (message, data = {}) => console.log(`[UPSELL MANAGER] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[UPSELL MANAGER] ${message}`, data),
      error: (message, data = {}) => console.error(`[UPSELL MANAGER] ${message}`, data),
      debug: (message, data = {}) => {
        if (config.logging?.level === 'debug') {
          console.log(`[UPSELL MANAGER DEBUG] ${message}`, data);
        }
      }
    };

    // Test connection in constructor (synchronous)
    this.supabase.from('profiles').select('id').limit(1).then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection failed:', error.message);
      } else {
        console.log('✅ Supabase connection OK, found profiles:', data.length);
      }
    }).catch(err => {
      console.error('❌ Supabase connection test failed:', err.message);
    });
  }

  /**
   * Process Coral insights and create/update rules and campaigns
   */
  async processCoralInsights(insights, user_id) {
    try {
      this.logger.info('Processing Coral insights', { insightCount: insights.length, user_id });
      
      const results = {
        rules_created: 0,
        rules_updated: 0,
        campaigns_created: 0,
        campaigns_updated: 0,
        errors: []
      };

      for (const insight of insights) {
        try {
          const insightResults = await this.processInsight(insight, user_id);
          
          results.rules_created += insightResults.rules_created;
          results.rules_updated += insightResults.rules_updated;
          results.campaigns_created += insightResults.campaigns_created;
          results.campaigns_updated += insightResults.campaigns_updated;
        } catch (error) {
          this.logger.error('Failed to process insight', { insight_id: insight.id, error: error.message });
          results.errors.push({ insight_id: insight.id, error: error.message });
        }
      }

      this.logger.info('Insight processing completed', results);
      return results;
    } catch (error) {
      this.logger.error('Failed to process Coral insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Process individual insight
   */
  async processInsight(insight, user_id) {
    const results = {
      rules_created: 0,
      rules_updated: 0,
      campaigns_created: 0,
      campaigns_updated: 0
    };

    // Process rules
    if (insight.upsell_engine_actions?.rules) {
      for (const ruleAction of insight.upsell_engine_actions.rules) {
        try {
          const ruleResult = await this.processRuleAction(ruleAction, user_id, insight);
          if (ruleResult.created) results.rules_created++;
          if (ruleResult.updated) results.rules_updated++;
        } catch (error) {
          this.logger.error('Failed to process rule action', { ruleAction, error: error.message });
        }
      }
    }

    // Process campaigns
    if (insight.upsell_engine_actions?.campaigns) {
      for (const campaignAction of insight.upsell_engine_actions.campaigns) {
        try {
          const campaignResult = await this.processCampaignAction(campaignAction, user_id, insight);
          if (campaignResult.created) results.campaigns_created++;
          if (campaignResult.updated) results.campaigns_updated++;
        } catch (error) {
          this.logger.error('Failed to process campaign action', { campaignAction, error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * Process rule action
   */
  async processRuleAction(action, user_id, insight) {
    const { type, rule_data } = action;
    
    switch (type) {
      case 'create_rule':
        return await this.createRule(rule_data, user_id, insight);
      case 'update_rule':
        return await this.updateRule(rule_data, user_id, insight);
      case 'update_rule_priority':
        return await this.updateRulePriority(rule_data, user_id, insight);
      default:
        throw new Error(`Unknown rule action type: ${type}`);
    }
  }

  /**
   * Process campaign action
   */
  async processCampaignAction(action, user_id, insight) {
    const { type, campaign_data } = action;
    
    switch (type) {
      case 'create_campaign':
        return await this.createCampaign(campaign_data, user_id, insight);
      case 'update_campaign':
        return await this.updateCampaign(campaign_data, user_id, insight);
      default:
        throw new Error(`Unknown campaign action type: ${type}`);
    }
  }

  /**
   * Create new upsell rule
   */
  async createRule(ruleData, user_id, insight) {
    try {
      // Log the incoming rule data
      this.logger.info('Creating rule with data', { 
        rule_name: ruleData.name,
        trigger_type: ruleData.trigger_type,
        trigger_conditions: ruleData.trigger_conditions
      });
      
      // Normalize rule data from Coral agent format to UpsellEngine format
      const normalizedRuleData = this.normalizeRuleData(ruleData);
      
      // Extract target products before creating the rule
      const targetProducts = normalizedRuleData.target_products || [];
      delete normalizedRuleData.target_products; // Remove from rule data since we'll use junction table
      
      // Validate product IDs if present
      let validatedProducts = [];
      if (targetProducts.length > 0) {
        validatedProducts = await this.validateProductIds(targetProducts, user_id);
        if (validatedProducts.length !== targetProducts.length) {
          this.logger.warn('Some product IDs could not be validated', {
            provided: targetProducts.length,
            validated: validatedProducts.length
          });
        }
      }
      
      // Check if this is a product-specific rule and we have target products
      let ruleId = uuidv4(); // Default to generated UUID
      
      // If this rule has target products and they're existing product IDs, use the first one as the rule ID
      if (validatedProducts.length > 0) {
        const firstTargetProduct = validatedProducts[0];
        if (firstTargetProduct && this.isValidProductId(firstTargetProduct)) {
          ruleId = `rule_${firstTargetProduct}`;
        }
      }

      const rule = {
        id: ruleId,
        user_id,
        ...normalizedRuleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Log the rule before validation
      this.logger.info('Rule before validation', { 
        rule_name: rule.name,
        trigger_type: rule.trigger_type,
        rule_type: rule.rule_type,
        conditions: rule.conditions,
        target_products_count: validatedProducts.length
      });

      // Validate rule data
      const validation = validateData(UpsellRuleSchema, rule);
      if (!validation.success) {
        this.logger.error('Rule validation failed', { 
          errors: validation.errors,
          rule_data: rule
        });
        throw new Error(`Invalid rule data: ${JSON.stringify(validation.errors)}`);
      }

      // Check if similar rule already exists
      const existingRule = await this.findSimilarRule(rule, user_id);
      if (existingRule) {
        this.logger.warn('Similar rule already exists', { existing_rule_id: existingRule.id });
        return { created: false, updated: false, rule_id: existingRule.id };
      }

      // Insert rule
      const { data, error } = await this.supabase
        .from('upsell_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      // Insert target products into junction table
      if (validatedProducts.length > 0) {
        const junctionData = validatedProducts.map(productId => ({
          rule_id: data.id,
          product_id: productId
        }));

        const { error: junctionError } = await this.supabase
          .from('upsell_rule_products')
          .insert(junctionData);

        if (junctionError) {
          this.logger.error('Failed to insert rule products', { error: junctionError.message });
          // Don't throw here, the rule was created successfully
        }
      }

      this.logger.info('Created upsell rule', { 
        rule_id: data.id, 
        rule_name: data.name, 
        trigger_type: data.trigger_type,
        rule_type: data.rule_type,
        target_products_count: validatedProducts.length
      });
      return { created: true, updated: false, rule_id: data.id };
    } catch (error) {
      this.logger.error('Failed to create rule', { error: error.message, rule_data: ruleData });
      throw error;
    }
  }

  /**
   * Validate product IDs against the database
   * @param {string[]} productIds - Array of product IDs to validate
   * @param {string} user_id - User ID for validation
   * @returns {Promise<string[]>} Array of validated product IDs
   */
  async validateProductIds(productIds, user_id) {
    if (!productIds || productIds.length === 0) return [];
    
    const validIds = [];
    
    for (const productId of productIds) {
      if (!productId) continue;
      
      try {
        // Check if product exists in the database
        const { data: product, error } = await this.supabase
          .from('products')
          .select('id')
          .eq('id', productId)
          .eq('user_id', user_id)
          .single();
        
        if (!error && product) {
          validIds.push(productId);
          this.logger.debug('Validated product ID', { product_id: productId });
        } else {
          this.logger.warn('Product ID not found in database', { product_id: productId, user_id });
        }
      } catch (error) {
        this.logger.warn('Error validating product ID', { product_id: productId, error: error.message });
      }
    }
    
    return validIds;
  }

  /**
   * Check if a product ID is valid (not a generated UUID)
   * @param {string} productId - Product ID to validate
   * @returns {boolean} True if valid product ID
   */
  isValidProductId(productId) {
    if (!productId) return false;
    
    // If it's a UUID format, it might be a generated one
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    
    // If it's not a UUID, it's likely a real product ID (e.g., Shopify ID)
    if (!isUuid) return true;
    
    // If it is a UUID, check if it looks like a generated one vs a real product UUID
    // This is a heuristic - you might want to adjust based on your UUID generation pattern
    return false; // For now, assume UUIDs are generated
  }

  /**
   * Normalize rule data from Coral agent format to UpsellEngine format
   */
  normalizeRuleData(ruleData) {
    const normalized = { ...ruleData };
    
    // Log the incoming rule data for debugging
    this.logger.info('Normalizing rule data', { 
      original_trigger_type: ruleData.trigger_type,
      original_trigger_conditions: ruleData.trigger_conditions,
      rule_name: ruleData.name
    });
    
    // Preserve the original trigger_type - DO NOT override it
    if (normalized.trigger_type) {
      // Keep the original trigger_type from Coral agent
      normalized.rule_type = normalized.trigger_type;
    }
    
    // Map trigger_conditions to conditions if needed
    if (normalized.trigger_conditions && !normalized.conditions) {
      normalized.conditions = normalized.trigger_conditions;
    }
    
    // Map target_products to actions if needed
    if (normalized.target_products && !normalized.actions) {
      normalized.actions = {
        action_type: 'show_popup',
        target_products: normalized.target_products,
        message: normalized.description || 'Check out these great products!',
        template_id: null
      };
    }
    
    // Only set defaults if NO trigger_type/rule_type exists
    if (!normalized.trigger_type && !normalized.rule_type) {
      normalized.rule_type = 'cart_value'; // Default fallback only if none exists
    }
    
    // Only set default conditions if none exist
    if (!normalized.trigger_conditions && !normalized.conditions) {
      normalized.conditions = {
        cart_value_operator: 'greater_than',
        cart_value: 100
      };
    }
    
    // Only set default actions if none exist
    if (!normalized.target_products && !normalized.actions) {
      normalized.actions = {
        action_type: 'show_popup',
        target_products: [],
        message: 'Check out these great products!',
        template_id: null
      };
    }
    
    // Log the normalized rule data for debugging
    this.logger.info('Normalized rule data', { 
      final_trigger_type: normalized.trigger_type,
      final_rule_type: normalized.rule_type,
      final_conditions: normalized.conditions,
      rule_name: normalized.name
    });
    
    return normalized;
  }

  /**
   * Update existing rule
   */
  async updateRule(ruleData, user_id, insight) {
    try {
      const { rule_id, updates } = ruleData;
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('upsell_rules')
        .update(updateData)
        .eq('id', rule_id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Updated upsell rule', { rule_id: data.id, rule_name: data.name });
      return { created: false, updated: true, rule_id: data.id };
    } catch (error) {
      this.logger.error('Failed to update rule', { error: error.message, rule_data: ruleData });
      throw error;
    }
  }

  /**
   * Update rule priority
   */
  async updateRulePriority(priorityData, user_id, insight) {
    try {
      const { rule_id, priority_boost } = priorityData;
      
      // Get current rule
      const { data: currentRule, error: fetchError } = await this.supabase
        .from('upsell_rules')
        .select('priority')
        .eq('id', rule_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError) throw fetchError;

      const newPriority = Math.max(1, Math.min(100, currentRule.priority + priority_boost));
      
      const { data, error } = await this.supabase
        .from('upsell_rules')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', rule_id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Updated rule priority', { rule_id: data.id, new_priority: newPriority });
      return { created: false, updated: true, rule_id: data.id };
    } catch (error) {
      this.logger.error('Failed to update rule priority', { error: error.message, priority_data: priorityData });
      throw error;
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(campaignData, user_id, insight) {
    try {
      // Extract product arrays before creating the campaign
      const triggerProducts = campaignData.trigger_products || [];
      const upsellProducts = campaignData.upsell_products || [];
      
      // Remove from campaign data since we'll use junction tables
      delete campaignData.trigger_products;
      delete campaignData.upsell_products;
      
      // Validate trigger product IDs if present
      let validatedTriggerProducts = [];
      if (triggerProducts.length > 0) {
        validatedTriggerProducts = await this.validateProductIds(triggerProducts, user_id);
        if (validatedTriggerProducts.length !== triggerProducts.length) {
          this.logger.warn('Some trigger product IDs could not be validated', {
            provided: triggerProducts.length,
            validated: validatedTriggerProducts.length
          });
        }
      }
      
      // Validate upsell product IDs if present
      let validatedUpsellProducts = [];
      if (upsellProducts.length > 0) {
        validatedUpsellProducts = await this.validateProductIds(upsellProducts, user_id);
        if (validatedUpsellProducts.length !== upsellProducts.length) {
          this.logger.warn('Some upsell product IDs could not be validated', {
            provided: upsellProducts.length,
            validated: validatedUpsellProducts.length
          });
        }
      }
      
      // Check if this is a product-specific campaign and we have trigger products
      let campaignId = uuidv4(); // Default to generated UUID
      
      // If this campaign has trigger products and they're existing product IDs, use the first one as the campaign ID
      if (validatedTriggerProducts.length > 0) {
        const firstTriggerProduct = validatedTriggerProducts[0];
        if (firstTriggerProduct && this.isValidProductId(firstTriggerProduct)) {
          campaignId = `campaign_${firstTriggerProduct}`;
        }
      }

      const campaign = {
        id: campaignId,
        user_id,
        ...campaignData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate campaign data
      const validation = validateData(CampaignSchema, campaign);
      if (!validation.success) {
        throw new Error(`Invalid campaign data: ${JSON.stringify(validation.errors)}`);
      }

      // Check if similar campaign already exists
      const existingCampaign = await this.findSimilarCampaign(campaign, user_id);
      if (existingCampaign) {
        this.logger.warn('Similar campaign already exists', { existing_campaign_id: existingCampaign.id });
        return { created: false, updated: false, campaign_id: existingCampaign.id };
      }

      // Insert campaign
      const { data, error } = await this.supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;

      // Insert trigger products into junction table
      if (validatedTriggerProducts.length > 0) {
        const triggerJunctionData = validatedTriggerProducts.map(productId => ({
          campaign_id: data.id,
          product_id: productId
        }));

        const { error: triggerError } = await this.supabase
          .from('campaign_trigger_products')
          .insert(triggerJunctionData);

        if (triggerError) {
          this.logger.error('Failed to insert campaign trigger products', { error: triggerError.message });
        }
      }

      // Insert upsell products into junction table
      if (validatedUpsellProducts.length > 0) {
        const upsellJunctionData = validatedUpsellProducts.map(productId => ({
          campaign_id: data.id,
          product_id: productId
        }));

        const { error: upsellError } = await this.supabase
          .from('campaign_upsell_products')
          .insert(upsellJunctionData);

        if (upsellError) {
          this.logger.error('Failed to insert campaign upsell products', { error: upsellError.message });
        }
      }

      this.logger.info('Created campaign', { 
        campaign_id: data.id, 
        campaign_name: data.name,
        trigger_products_count: validatedTriggerProducts.length,
        upsell_products_count: validatedUpsellProducts.length
      });
      return { created: true, updated: false, campaign_id: data.id };
    } catch (error) {
      this.logger.error('Failed to create campaign', { error: error.message, campaign_data: campaignData });
      throw error;
    }
  }

  /**
   * Update existing campaign
   */
  async updateCampaign(campaignData, user_id, insight) {
    try {
      const { campaign_id, updates } = campaignData;
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaign_id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Updated campaign', { campaign_id: data.id, campaign_name: data.name });
      return { created: false, updated: true, campaign_id: data.id };
    } catch (error) {
      this.logger.error('Failed to update campaign', { error: error.message, campaign_data: campaignData });
      throw error;
    }
  }

  /**
   * Find similar rule to avoid duplicates
   */
  async findSimilarRule(rule, user_id) {
    try {
      const { data, error } = await this.supabase
        .from('upsell_rules')
        .select('id, name, trigger_type')
        .eq('user_id', user_id)
        .eq('trigger_type', rule.trigger_type)
        .eq('status', 'active');

      if (error) throw error;

      // Check for similar rules based on trigger conditions and target products
      for (const existingRule of data) {
        try {
          // Get target products for existing rule
          const { data: existingProducts } = await this.supabase
            .rpc('get_rule_target_products', { rule_uuid: existingRule.id });
          
          // Compare trigger conditions and target products
          const sameTrigger = JSON.stringify(rule.trigger_conditions) === JSON.stringify(rule.trigger_conditions);
          const sameTargets = JSON.stringify(rule.target_products) === JSON.stringify(existingProducts);
          
          if (sameTrigger && sameTargets) {
            return existingRule;
          }
        } catch (error) {
          this.logger.warn('Failed to get products for existing rule', { 
            rule_id: existingRule.id, 
            error: error.message 
          });
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to find similar rule', { error: error.message });
      return null;
    }
  }

  /**
   * Find similar campaign to avoid duplicates
   */
  async findSimilarCampaign(campaign, user_id) {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('id, name, campaign_type')
        .eq('user_id', user_id)
        .eq('campaign_type', campaign.campaign_type)
        .eq('status', 'active');

      if (error) throw error;

      // Check for similar campaigns based on type, trigger products, and upsell products
      for (const existingCampaign of data) {
        try {
          // Get trigger and upsell products for existing campaign
          const [triggerProducts, upsellProducts] = await Promise.all([
            this.supabase.rpc('get_campaign_trigger_products', { campaign_uuid: existingCampaign.id }),
            this.supabase.rpc('get_campaign_upsell_products', { campaign_uuid: existingCampaign.id })
          ]);
          
          // Compare trigger products and upsell products
          const sameTriggerProducts = JSON.stringify(campaign.trigger_products) === JSON.stringify(triggerProducts.data);
          const sameUpsellProducts = JSON.stringify(campaign.upsell_products) === JSON.stringify(upsellProducts.data);
          
          if (sameTriggerProducts && sameUpsellProducts) {
            return existingCampaign;
          }
        } catch (error) {
          this.logger.warn('Failed to get products for existing campaign', { 
            campaign_id: existingCampaign.id, 
            error: error.message 
          });
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to find similar campaign', { error: error.message });
      return null;
    }
  }

  /**
   * Get active rules for user
   */
  async getActiveRules(user_id) {
    try {
      const { data, error } = await this.supabase
        .from('upsell_rules')
        .select('*')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .eq('status', 'active');

      if (error) throw error;

      // Get target products for each rule using the helper function
      const rulesWithProducts = await Promise.all(
        data.map(async (rule) => {
          try {
            const { data: products } = await this.supabase
              .rpc('get_rule_target_products', { rule_uuid: rule.id });
            
            return {
              ...rule,
              target_products: products || []
            };
          } catch (error) {
            this.logger.warn('Failed to get target products for rule', { 
              rule_id: rule.id, 
              error: error.message 
            });
            return {
              ...rule,
              target_products: []
            };
          }
        })
      );

      return rulesWithProducts;
    } catch (error) {
      this.logger.error('Failed to get active rules', { error: error.message });
      return [];
    }
  }

  /**
   * Get active campaigns for user
   */
  async getActiveCampaigns(user_id) {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'active');

      if (error) throw error;

      // Get trigger and upsell products for each campaign using helper functions
      const campaignsWithProducts = await Promise.all(
        data.map(async (campaign) => {
          try {
            const [triggerProducts, upsellProducts] = await Promise.all([
              this.supabase.rpc('get_campaign_trigger_products', { campaign_uuid: campaign.id }),
              this.supabase.rpc('get_campaign_upsell_products', { campaign_uuid: campaign.id })
            ]);
            
            return {
              ...campaign,
              trigger_products: triggerProducts.data || [],
              upsell_products: upsellProducts.data || []
            };
          } catch (error) {
            this.logger.warn('Failed to get products for campaign', { 
              campaign_id: campaign.id, 
              error: error.message 
            });
            return {
              ...campaign,
              trigger_products: [],
              upsell_products: []
            };
          }
        })
      );

      return campaignsWithProducts;
    } catch (error) {
      this.logger.error('Failed to get active campaigns', { error: error.message });
      return [];
    }
  }

  /**
   * Evaluate upsell offers for current cart
   */
  async evaluateUpsells(cartItems, sessionId, user_id, timeContext = {}) {
    try {
      this.logger.debug('Evaluating upsells', { cartItems, sessionId, user_id });

      // Get active rules and campaigns
      const [activeRules, activeCampaigns] = await Promise.all([
        this.getActiveRules(user_id),
        this.getActiveCampaigns(user_id)
      ]);

      // Evaluate campaigns
      const matchingCampaigns = this.evaluateCampaigns(activeCampaigns, cartItems, timeContext);
      
      // Evaluate rules
      const matchingRules = this.evaluateRules(activeRules, cartItems, timeContext);
      
      // Apply rule overrides from campaigns
      const overriddenRules = this.applyRuleOverrides(matchingRules, matchingCampaigns);
      
      // Select best offer
      const bestOffer = this.selectBestUpsell(matchingCampaigns, overriddenRules, cartItems);
      
      // Track evaluation
      await this.trackUpsellEvaluation(sessionId, cartItems, bestOffer, user_id);
      
      return bestOffer;
    } catch (error) {
      this.logger.error('Failed to evaluate upsells', { error: error.message });
      throw error;
    }
  }

  /**
   * Evaluate campaigns against current cart
   */
  evaluateCampaigns(campaigns, cartItems, timeContext) {
    return campaigns.filter(campaign => {
      // Check if campaign trigger products are in cart
      const hasTriggerProducts = campaign.trigger_products.some(triggerId =>
        cartItems.some(item => item.product_id === triggerId)
      );

      if (!hasTriggerProducts) return false;

      // Check target audience conditions
      if (campaign.target_audience) {
        // Implement target audience evaluation logic
        // For now, return true if trigger products match
      }

      return true;
    });
  }

  /**
   * Evaluate rules against current cart
   */
  evaluateRules(rules, cartItems, timeContext) {
    return rules.filter(rule => {
      const conditions = rule.trigger_conditions;
      
      switch (rule.trigger_type) {
        case 'category':
          return this.evaluateCategoryConditions(conditions, cartItems);
        case 'cart_value':
          return this.evaluateCartValueConditions(conditions, cartItems);
        case 'time_based':
          return this.evaluateTimeConditions(conditions, timeContext);
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate category-based conditions
   */
  evaluateCategoryConditions(conditions, cartItems) {
    const { category, category_operator = 'contains' } = conditions;
    
    if (!category) return false;

    const cartCategories = cartItems.map(item => this.extractCategory(item.title));
    
    switch (category_operator) {
      case 'contains':
        return cartCategories.some(cat => cat === category);
      case 'equals':
        return cartCategories.every(cat => cat === category);
      case 'not_contains':
        return !cartCategories.some(cat => cat === category);
      default:
        return false;
    }
  }

  /**
   * Evaluate cart value conditions
   */
  evaluateCartValueConditions(conditions, cartItems) {
    const { cart_value_operator, cart_value, cart_value_min, cart_value_max } = conditions;
    
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    switch (cart_value_operator) {
      case 'greater_than':
        return cartTotal > (cart_value || cart_value_min);
      case 'less_than':
        return cartTotal < (cart_value || cart_value_max);
      case 'equals':
        return cartTotal === cart_value;
      case 'between':
        return cartTotal >= cart_value_min && cartTotal <= cart_value_max;
      default:
        return false;
    }
  }

  /**
   * Evaluate time-based conditions
   */
  evaluateTimeConditions(conditions, timeContext) {
    const { time_on_site_min, time_on_site_max, active_time_on_site_min } = conditions;
    
    const timeOnSite = timeContext.timeOnSite || 0;
    const activeTimeOnSite = timeContext.activeTimeOnSite || 0;
    
    if (time_on_site_min && timeOnSite < time_on_site_min) return false;
    if (time_on_site_max && timeOnSite > time_on_site_max) return false;
    if (active_time_on_site_min && activeTimeOnSite < active_time_on_site_min) return false;
    
    return true;
  }

  /**
   * Apply rule overrides from campaigns
   */
  applyRuleOverrides(rules, campaigns) {
    const overriddenRules = [...rules];
    
    campaigns.forEach(campaign => {
      if (campaign.rule_overrides) {
        campaign.rule_overrides.forEach(override => {
          const ruleIndex = overriddenRules.findIndex(rule => rule.id === override.rule_id);
          
          if (ruleIndex !== -1) {
            switch (override.override_type) {
              case 'enhance':
                overriddenRules[ruleIndex] = {
                  ...overriddenRules[ruleIndex],
                  priority: overriddenRules[ruleIndex].priority + (override.enhanced_settings?.priority_boost || 0)
                };
                break;
              case 'suppress':
                overriddenRules.splice(ruleIndex, 1);
                break;
            }
          }
        });
      }
    });
    
    return overriddenRules;
  }

  /**
   * Select best upsell offer
   */
  selectBestUpsell(campaigns, rules, cartItems) {
    // Priority order: Campaigns with override > High priority rules > Revenue estimation
    const allOffers = [
      ...campaigns.map(campaign => ({ type: 'campaign', data: campaign, priority: campaign.campaign_priority || 0 })),
      ...rules.map(rule => ({ type: 'rule', data: rule, priority: rule.priority || 0 }))
    ];
    
    // Sort by priority (highest first)
    allOffers.sort((a, b) => b.priority - a.priority);
    
    if (allOffers.length === 0) return null;
    
    const bestOffer = allOffers[0];
    
    return {
      type: bestOffer.type,
      id: bestOffer.data.id,
      title: bestOffer.data.name,
      description: bestOffer.data.description,
      target_products: bestOffer.data.target_products || bestOffer.data.upsell_products,
      display_type: bestOffer.data.display_type || 'popup',
      display_settings: bestOffer.data.display_settings || {},
      pricing_rules: bestOffer.data.pricing_rules || []
    };
  }

  /**
   * Track upsell evaluation
   */
  async trackUpsellEvaluation(sessionId, cartItems, offer, user_id) {
    try {
      const evaluation = {
        id: uuidv4(),
        session_id: sessionId,
        user_id,
        cart_items: cartItems,
        offer_id: offer?.id,
        offer_type: offer?.type,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('upsell_evaluations')
        .insert(evaluation);

      if (error) throw error;
    } catch (error) {
      this.logger.error('Failed to track upsell evaluation', { error: error.message });
    }
  }

  /**
   * Extract category from product title
   */
  extractCategory(title) {
    const categories = {
      'coffee': ['coffee', 'mug', 'beans', 'grinder'],
      'electronics': ['headphones', 'speaker', 'wireless', 'bluetooth'],
      'kitchenware': ['mug', 'grinder', 'kitchen'],
      'food': ['beans', 'organic']
    };
    
    const lowerTitle = title.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
}

export { UpsellEngineManager }; 