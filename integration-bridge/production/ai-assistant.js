/**
 * AI Assistant for Rules & Campaign Creation
 * Helps users create effective upsell rules and campaigns
 */

import { CoralInsightsEngine } from './coral-insights-engine.js';
import { UpsellEngineManager } from './upsell-engine-manager.js';

class AIAssistant {
  constructor(config) {
    this.config = config;
    this.coralEngine = new CoralInsightsEngine(config);
    this.upsellManager = new UpsellEngineManager(config);
    
    this.logger = {
      info: (message, data = {}) => console.log(`[AI ASSISTANT] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[AI ASSISTANT] ${message}`, data),
      error: (message, data = {}) => console.error(`[AI ASSISTANT] ${message}`, data),
      debug: (message, data = {}) => {
        if (config.logging?.level === 'debug') {
          console.log(`[AI ASSISTANT DEBUG] ${message}`, data);
        }
      }
    };
  }

  /**
   * Main assistant function - helps users create rules and campaigns
   */
  async assistUser(user_id, request) {
    try {
      this.logger.info('Processing user request', { user_id, request_type: request.type });
      
      switch (request.type) {
        case 'create_rule':
          return await this.assistWithRuleCreation(user_id, request);
        case 'create_campaign':
          return await this.assistWithCampaignCreation(user_id, request);
        case 'optimize_existing':
          return await this.assistWithOptimization(user_id, request);
        case 'analyze_performance':
          return await this.assistWithPerformanceAnalysis(user_id, request);
        case 'auto_generate':
          return await this.autoGenerateFromInsights(user_id, request);
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      this.logger.error('Assistant request failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assist with rule creation
   */
  async assistWithRuleCreation(user_id, request) {
    const { rule_type, business_goal, target_products, constraints } = request;
    
    try {
      // Generate insights to inform rule creation
      const insights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: '30d',
        insight_types: ['bundle', 'trend', 'segment']
      });

      // Create rule based on insights and user requirements
      const rule = this.createRuleFromInsights(rule_type, business_goal, target_products, constraints, insights);
      
      // Use existing product ID for the insight ID if available
      let insightId = `assistant-rule-${Date.now()}`;
      if (target_products && target_products.length > 0) {
        const firstProduct = target_products[0];
        if (firstProduct && (firstProduct.length !== 36 || !firstProduct.includes('-'))) {
          insightId = `assistant-rule-${firstProduct}`;
        }
      }
      
      // Validate and create the rule
      const result = await this.upsellManager.processCoralInsights([{
        id: insightId,
        type: 'assistant_rule',
        title: `AI-Generated Rule: ${rule.name}`,
        description: rule.description,
        confidence: 0.8,
        data: rule,
        upsell_engine_actions: {
          rules: [{
            type: 'create_rule',
            rule_data: rule
          }]
        },
        created_at: new Date().toISOString()
      }], user_id);

      return {
        success: true,
        rule_created: result.rules_created > 0,
        rule_id: result.rules_created > 0 ? 'new-rule-id' : null,
        recommendations: this.generateRuleRecommendations(rule_type, insights),
        insights_used: insights.length
      };
    } catch (error) {
      this.logger.error('Rule creation assistance failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assist with campaign creation
   */
  async assistWithCampaignCreation(user_id, request) {
    const { campaign_type, business_goals, target_audience, budget, timeline } = request;
    
    try {
      // Generate insights to inform campaign creation
      const insights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: '90d',
        insight_types: ['trend', 'segment', 'performance']
      });

      // Create campaign based on insights and user requirements
      const campaign = this.createCampaignFromInsights(campaign_type, business_goals, target_audience, budget, timeline, insights);
      
      // Validate and create the campaign
      const result = await this.upsellManager.processCoralInsights([{
        id: `assistant-campaign-${Date.now()}`,
        type: 'assistant_campaign',
        title: `AI-Generated Campaign: ${campaign.name}`,
        description: campaign.description,
        confidence: 0.8,
        data: campaign,
        upsell_engine_actions: {
          campaigns: [{
            type: 'create_campaign',
            campaign_data: campaign
          }]
        },
        created_at: new Date().toISOString()
      }], user_id);

      return {
        success: true,
        campaign_created: result.campaigns_created > 0,
        campaign_id: result.campaigns_created > 0 ? 'new-campaign-id' : null,
        recommendations: this.generateCampaignRecommendations(campaign_type, insights),
        insights_used: insights.length
      };
    } catch (error) {
      this.logger.error('Campaign creation assistance failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assist with optimization of existing rules/campaigns
   */
  async assistWithOptimization(user_id, request) {
    const { target_type, target_ids, optimization_goal } = request;
    
    try {
      // Analyze current performance
      const performanceInsights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: '30d',
        insight_types: ['performance']
      });

      // Generate optimization recommendations
      const optimizations = this.generateOptimizationRecommendations(target_type, target_ids, optimization_goal, performanceInsights);
      
      // Apply optimizations
      const result = await this.upsellManager.processCoralInsights(optimizations, user_id);

      return {
        success: true,
        optimizations_applied: result.rules_updated + result.campaigns_updated,
        recommendations: optimizations,
        performance_improvement: this.calculatePerformanceImprovement(optimizations)
      };
    } catch (error) {
      this.logger.error('Optimization assistance failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assist with performance analysis
   */
  async assistWithPerformanceAnalysis(user_id, request) {
    const { analysis_type, time_period, metrics } = request;
    
    try {
      // Generate comprehensive insights
      const insights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: time_period || '30d',
        insight_types: ['bundle', 'trend', 'segment', 'performance']
      });

      // Analyze performance and generate recommendations
      const analysis = this.analyzePerformance(insights, analysis_type, metrics);
      
      return {
        success: true,
        analysis: analysis,
        insights: insights,
        recommendations: this.generatePerformanceRecommendations(analysis),
        next_actions: this.suggestNextActions(analysis)
      };
    } catch (error) {
      this.logger.error('Performance analysis assistance failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Auto-generate rules and campaigns from insights
   */
  async autoGenerateFromInsights(user_id, request) {
    const { generation_type, confidence_threshold, max_items } = request;
    
    try {
      // Generate comprehensive insights
      const insights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: '90d',
        insight_types: ['bundle', 'trend', 'segment', 'performance']
      });

      // Filter insights by confidence threshold
      const filteredInsights = insights.filter(insight => insight.confidence >= (confidence_threshold || 0.7));
      
      // Limit number of items
      const limitedInsights = filteredInsights.slice(0, max_items || 10);

      // Process insights to create rules and campaigns
      const result = await this.upsellManager.processCoralInsights(limitedInsights, user_id);

      return {
        success: true,
        insights_processed: limitedInsights.length,
        rules_created: result.rules_created,
        campaigns_created: result.campaigns_created,
        total_insights: insights.length,
        filtered_insights: filteredInsights.length,
        recommendations: this.generateAutoGenerationRecommendations(limitedInsights)
      };
    } catch (error) {
      this.logger.error('Auto-generation assistance failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create rule from insights
   */
  createRuleFromInsights(rule_type, business_goal, target_products, constraints, insights) {
    const bundleInsights = insights.filter(i => i.type === 'bundle_opportunity');
    const segmentInsights = insights.filter(i => i.type === 'customer_segment');
    
    let rule = {
      name: '',
      description: '',
      trigger_type: rule_type,
      trigger_conditions: {},
      target_products: target_products || [],
      display_type: 'popup',
      priority: 50,
      status: 'draft'
    };

    switch (rule_type) {
      case 'category':
        rule = this.createCategoryRule(business_goal, bundleInsights, constraints);
        break;
      case 'cart_value':
        rule = this.createCartValueRule(business_goal, insights, constraints);
        break;
      case 'time_based':
        rule = this.createTimeBasedRule(business_goal, insights, constraints);
        break;
      default:
        throw new Error(`Unknown rule type: ${rule_type}`);
    }

    return rule;
  }

  /**
   * Create category-based rule
   */
  createCategoryRule(business_goal, bundleInsights, constraints) {
    const bestBundle = bundleInsights[0];
    
    return {
      name: `Category Rule: ${bestBundle?.data?.primary_category || 'General'} Cross-Sell`,
      description: `Automatically suggest complementary products when ${bestBundle?.data?.primary_category || 'specific category'} items are in cart`,
      trigger_type: 'category',
      trigger_conditions: {
        category: bestBundle?.data?.primary_category || 'general',
        category_operator: 'contains'
      },
      target_products: bestBundle?.data?.secondary_id ? [bestBundle.data.secondary_id] : [],
      display_type: 'popup',
      priority: 60,
      status: 'draft'
    };
  }

  /**
   * Create cart value rule
   */
  createCartValueRule(business_goal, insights, constraints) {
    const trendInsights = insights.filter(i => i.type === 'trend_analysis');
    const revenueTrend = trendInsights.find(t => t.data.metric === 'revenue');
    
    const threshold = revenueTrend?.data?.current_value * 0.8 || 100; // 80% of current AOV
    
    return {
      name: `Cart Value Rule: Premium Products`,
      description: `Suggest premium products when cart value exceeds $${threshold}`,
      trigger_type: 'cart_value',
      trigger_conditions: {
        cart_value_operator: 'greater_than',
        cart_value_min: threshold
      },
      target_products: constraints?.premium_products || [],
      display_type: 'popup',
      priority: 70,
      status: 'draft'
    };
  }

  /**
   * Create time-based rule
   */
  createTimeBasedRule(business_goal, insights, constraints) {
    return {
      name: `Time-Based Rule: Engagement Optimization`,
      description: `Show upsell offers after 2 minutes of engagement to reduce cart abandonment`,
      trigger_type: 'time_based',
      trigger_conditions: {
        time_on_site_operator: 'greater_than',
        time_on_site_min: 120 // 2 minutes
      },
      target_products: constraints?.recommended_products || [],
      display_type: 'popup',
      priority: 50,
      status: 'draft'
    };
  }

  /**
   * Create campaign from insights
   */
  createCampaignFromInsights(campaign_type, business_goals, target_audience, budget, timeline, insights) {
    const bundleInsights = insights.filter(i => i.type === 'bundle_opportunity');
    const segmentInsights = insights.filter(i => i.type === 'customer_segment');
    
    let campaign = {
      name: '',
      description: '',
      campaign_type: campaign_type,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + (timeline || 30) * 24 * 60 * 60 * 1000).toISOString(),
      business_goals: business_goals,
      target_audience: target_audience,
      trigger_products: [],
      upsell_products: [],
      pricing_rules: [],
      display_settings: {
        display_type: 'popup',
        trigger_timing: 'immediate',
        display_frequency: 'once'
      },
      priority_level: 'medium',
      status: 'draft'
    };

    switch (campaign_type) {
      case 'bundle':
        campaign = this.createBundleCampaign(bundleInsights, business_goals, budget);
        break;
      case 'cross-sell':
        campaign = this.createCrossSellCampaign(bundleInsights, target_audience);
        break;
      case 'seasonal':
        campaign = this.createSeasonalCampaign(insights, business_goals, timeline);
        break;
      case 'clearance':
        campaign = this.createClearanceCampaign(insights, business_goals);
        break;
      default:
        throw new Error(`Unknown campaign type: ${campaign_type}`);
    }

    return campaign;
  }

  /**
   * Create bundle campaign
   */
  createBundleCampaign(bundleInsights, business_goals, budget) {
    const bestBundle = bundleInsights[0];
    
    return {
      name: `Bundle Campaign: ${bestBundle?.data?.primary} + ${bestBundle?.data?.secondary}`,
      description: `Special bundle pricing for ${bestBundle?.data?.primary} and ${bestBundle?.data?.secondary}`,
      campaign_type: 'bundle',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      business_goals: business_goals || {
        target_metric: 'revenue',
        target_value: bestBundle?.data?.estimated_revenue || 1000,
        goal_description: `Increase revenue through ${bestBundle?.data?.primary} + ${bestBundle?.data?.secondary} bundles`
      },
      trigger_products: bestBundle?.data?.primary_id ? [bestBundle.data.primary_id] : [],
      upsell_products: bestBundle?.data?.secondary_id ? [bestBundle.data.secondary_id] : [],
      pricing_rules: [{
        type: 'percentage_discount',
        value: 10,
        applies_to: bestBundle?.data?.secondary_id ? [bestBundle.data.secondary_id] : [],
        conditions: {
          cart_value_min: bestBundle?.data?.primary_price || 0
        }
      }],
      display_settings: {
        display_type: 'popup',
        trigger_timing: 'immediate',
        display_frequency: 'once'
      },
      priority_level: 'high',
      status: 'draft'
    };
  }

  /**
   * Create cross-sell campaign
   */
  createCrossSellCampaign(bundleInsights, target_audience) {
    const bestBundle = bundleInsights[0];
    
    return {
      name: `Cross-Sell Campaign: ${bestBundle?.data?.secondary}`,
      description: `Recommend ${bestBundle?.data?.secondary} to customers who buy ${bestBundle?.data?.primary}`,
      campaign_type: 'cross-sell',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      business_goals: {
        target_metric: 'conversion_rate',
        target_value: 0.12,
        goal_description: `Increase conversion rate for ${bestBundle?.data?.secondary}`
      },
      target_audience: target_audience || {},
      trigger_products: bestBundle?.data?.primary_id ? [bestBundle.data.primary_id] : [],
      upsell_products: bestBundle?.data?.secondary_id ? [bestBundle.data.secondary_id] : [],
      pricing_rules: [{
        type: 'percentage_discount',
        value: 5,
        applies_to: bestBundle?.data?.secondary_id ? [bestBundle.data.secondary_id] : []
      }],
      display_settings: {
        display_type: 'popup',
        trigger_timing: 'after_delay',
        delay_seconds: 5,
        display_frequency: 'once'
      },
      priority_level: 'medium',
      status: 'draft'
    };
  }

  /**
   * Create seasonal campaign
   */
  createSeasonalCampaign(insights, business_goals, timeline) {
    const trendInsights = insights.filter(i => i.type === 'trend_analysis');
    const revenueTrend = trendInsights.find(t => t.data.metric === 'revenue');
    
    return {
      name: 'Seasonal Revenue Campaign',
      description: `Capitalize on ${revenueTrend?.data?.trend || 'current'} revenue trend`,
      campaign_type: 'seasonal',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + (timeline || 14) * 24 * 60 * 60 * 1000).toISOString(),
      business_goals: business_goals || {
        target_metric: 'revenue',
        target_value: revenueTrend?.data?.current_value * 1.2 || 1000,
        goal_description: `Accelerate revenue growth`
      },
      trigger_products: [],
      upsell_products: [],
      pricing_rules: [{
        type: 'percentage_discount',
        value: 15,
        applies_to: [],
        conditions: {
          cart_value_min: 50
        }
      }],
      display_settings: {
        display_type: 'popup',
        trigger_timing: 'immediate',
        display_frequency: 'once'
      },
      priority_level: 'high',
      status: 'draft'
    };
  }

  /**
   * Create clearance campaign
   */
  createClearanceCampaign(insights, business_goals) {
    return {
      name: 'Clearance Campaign',
      description: 'Clear slow-moving inventory with special pricing',
      campaign_type: 'clearance',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      business_goals: business_goals || {
        target_metric: 'units_sold',
        target_value: 100,
        goal_description: 'Clear inventory and generate cash flow'
      },
      trigger_products: [],
      upsell_products: [],
      pricing_rules: [{
        type: 'percentage_discount',
        value: 25,
        applies_to: [],
        conditions: {
          cart_value_min: 25
        }
      }],
      display_settings: {
        display_type: 'popup',
        trigger_timing: 'immediate',
        display_frequency: 'once'
      },
      urgency_settings: {
        countdown_timer: true,
        limited_quantity: true,
        scarcity_messaging: 'Limited time offer!'
      },
      priority_level: 'urgent',
      status: 'draft'
    };
  }

  /**
   * Generate rule recommendations
   */
  generateRuleRecommendations(rule_type, insights) {
    const recommendations = [];
    
    if (rule_type === 'category') {
      const bundleInsights = insights.filter(i => i.type === 'bundle_opportunity');
      recommendations.push({
        type: 'bundle_opportunity',
        message: `Found ${bundleInsights.length} bundle opportunities. Consider creating category rules for each.`,
        priority: 'high'
      });
    }
    
    if (rule_type === 'cart_value') {
      const trendInsights = insights.filter(i => i.type === 'trend_analysis');
      recommendations.push({
        type: 'trend_analysis',
        message: `Revenue trend: ${trendInsights[0]?.data?.trend || 'stable'}. Adjust cart value thresholds accordingly.`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate campaign recommendations
   */
  generateCampaignRecommendations(campaign_type, insights) {
    const recommendations = [];
    
    const segmentInsights = insights.filter(i => i.type === 'customer_segment');
    if (segmentInsights.length > 0) {
      recommendations.push({
        type: 'customer_segments',
        message: `Found ${segmentInsights.length} customer segments. Consider creating targeted campaigns for each.`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(target_type, target_ids, optimization_goal, performanceInsights) {
    // Implementation for optimization recommendations
    return [];
  }

  /**
   * Analyze performance
   */
  analyzePerformance(insights, analysis_type, metrics) {
    // Implementation for performance analysis
    return {
      summary: 'Performance analysis summary',
      recommendations: [],
      trends: []
    };
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(analysis) {
    // Implementation for performance recommendations
    return [];
  }

  /**
   * Suggest next actions
   */
  suggestNextActions(analysis) {
    // Implementation for next action suggestions
    return [];
  }

  /**
   * Generate auto-generation recommendations
   */
  generateAutoGenerationRecommendations(insights) {
    // Implementation for auto-generation recommendations
    return [];
  }

  /**
   * Calculate performance improvement
   */
  calculatePerformanceImprovement(optimizations) {
    // Implementation for performance improvement calculation
    return 0.15; // 15% improvement
  }
}

export { AIAssistant }; 