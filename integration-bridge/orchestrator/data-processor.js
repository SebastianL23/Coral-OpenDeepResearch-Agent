/**
 * Data Processor for Integration Bridge
 * Transforms data between Coral and UpsellEngine formats
 */

import { v4 as uuidv4 } from 'uuid';

class DataProcessor {
  constructor() {
    this.logger = {
      info: (message, data = {}) => console.log(`[PROCESSOR] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[PROCESSOR] ${message}`, data),
      error: (message, data = {}) => console.error(`[PROCESSOR] ${message}`, data),
      debug: (message, data = {}) => console.log(`[PROCESSOR DEBUG] ${message}`, data)
    };
  }

  /**
   * Convert Coral insight to UpsellEngine rule
   */
  convertInsightToRule(insight, user_id) {
    try {
      this.logger.info('Converting insight to rule', { insightId: insight.id, type: insight.type });

      switch (insight.type) {
        case 'bundle_opportunity':
          return this.convertBundleInsightToRule(insight, user_id);
        case 'customer_segment':
          return this.convertCustomerSegmentInsightToRule(insight, user_id);
        case 'trend_analysis':
          return this.convertTrendInsightToRule(insight, user_id);
        case 'performance_insight':
          return this.convertPerformanceInsightToRule(insight, user_id);
        default:
          throw new Error(`Unknown insight type: ${insight.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to convert insight to rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert bundle opportunity insight to rule
   */
  convertBundleInsightToRule(insight, user_id) {
    const { data, logic } = insight;

    // Use existing product ID for the rule if available
    const ruleId = data.secondary_product_id && (data.secondary_product_id.length !== 36 || !data.secondary_product_id.includes('-')) 
      ? `bundle-rule-${data.secondary_product_id}` 
      : `bundle-rule-${Date.now()}`;

    return {
      id: ruleId,
      user_id,
      name: `Bundle: ${data.primary_product} + ${data.secondary_product}`,
      description: insight.description,
      rule_type: 'product_based',
      conditions: {
        product_ids: [data.primary_product_id],
        time_on_site_min: 30, // Show after 30 seconds
        session_count_min: 1
      },
      actions: {
        action_type: 'show_popup',
        target_products: [data.secondary_product_id],
        message: `Complete your purchase! Add ${data.secondary_product} for the perfect bundle.`,
        template_id: 'bundle_offer'
      },
      priority: Math.round(insight.confidence * 100),
      is_active: true
    };
  }

  /**
   * Convert customer segment insight to rule
   */
  convertCustomerSegmentInsightToRule(insight, user_id) {
    const { data, logic } = insight;

    return {
      user_id,
      name: `Segment: ${data.segment_name}`,
      description: insight.description,
      rule_type: 'customer_segment',
      conditions: {
        customer_segments: [data.segment_name],
        cart_value_min: data.criteria?.total_spent_min || 0
      },
      actions: {
        action_type: 'show_popup',
        target_products: [],
        message: `Special offer for ${data.segment_name} customers!`,
        template_id: 'segment_offer'
      },
      priority: Math.round(insight.confidence * 100),
      is_active: true
    };
  }

  /**
   * Convert trend analysis insight to rule
   */
  convertTrendInsightToRule(insight, user_id) {
    const { data, logic } = insight;

    return {
      user_id,
      name: `Trend: ${data.metric} Optimization`,
      description: insight.description,
      rule_type: 'behavior_based',
      conditions: {
        time_on_site_min: 60,
        session_count_min: 1
      },
      actions: {
        action_type: 'show_popup',
        target_products: [],
        message: `Based on ${data.trend} ${data.metric} trends, here's a special offer!`,
        template_id: 'trend_offer'
      },
      priority: Math.round(insight.confidence * 100),
      is_active: true
    };
  }

  /**
   * Convert performance insight to rule
   */
  convertPerformanceInsightToRule(insight, user_id) {
    const { data, logic } = insight;

    return {
      user_id,
      name: `Performance: ${insight.title}`,
      description: insight.description,
      rule_type: 'behavior_based',
      conditions: {
        time_on_site_min: 45,
        session_count_min: 1
      },
      actions: {
        action_type: 'show_popup',
        target_products: [],
        message: 'We noticed you might need help completing your purchase. Here\'s a special offer!',
        template_id: 'performance_offer'
      },
      priority: Math.round(insight.confidence * 100),
      is_active: true
    };
  }

  /**
   * Convert Coral insight to UpsellEngine campaign
   */
  convertInsightToCampaign(insight, user_id) {
    try {
      this.logger.info('Converting insight to campaign', { insightId: insight.id, type: insight.type });

      const campaign = {
        user_id,
        name: `Campaign: ${insight.title}`,
        description: insight.description,
        status: 'draft',
        campaign_type: 'popup',
        content: this.generateCampaignContent(insight),
        settings: this.generateCampaignSettings(insight),
        performance_metrics: {}
      };

      this.logger.info('Campaign generated successfully', { campaignName: campaign.name });
      return campaign;
    } catch (error) {
      this.logger.error('Failed to convert insight to campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate campaign content from insight
   */
  generateCampaignContent(insight) {
    const { type, data, description } = insight;

    switch (type) {
      case 'bundle_opportunity':
        return {
          title: `Complete Your Bundle!`,
          description: `Add ${data.secondary_product} to your cart for the perfect combination.`,
          cta_text: 'Add to Cart',
          image_url: data.secondary_product_image || null,
          styling: {
            background_color: '#f8f9fa',
            text_color: '#212529',
            font_size: '16px'
          }
        };

      case 'customer_segment':
        return {
          title: `Special Offer for ${data.segment_name}!`,
          description: description,
          cta_text: 'Get Offer',
          styling: {
            background_color: '#e3f2fd',
            text_color: '#1565c0',
            font_size: '16px'
          }
        };

      case 'trend_analysis':
        return {
          title: `Trend Alert!`,
          description: `${data.metric} is ${data.trend}. Don't miss out on this opportunity!`,
          cta_text: 'Learn More',
          styling: {
            background_color: '#fff3e0',
            text_color: '#e65100',
            font_size: '16px'
          }
        };

      default:
        return {
          title: insight.title,
          description: insight.description,
          cta_text: 'Get Started',
          styling: {
            background_color: '#f5f5f5',
            text_color: '#333',
            font_size: '16px'
          }
        };
    }
  }

  /**
   * Generate campaign settings from insight
   */
  generateCampaignSettings(insight) {
    const { type, confidence } = insight;

    return {
      trigger_type: 'time_delay',
      trigger_delay: 3000, // 3 seconds
      trigger_scroll_percentage: 50,
      frequency_cap: 1, // Show once per session
      a_b_test_enabled: confidence < 0.8 // A/B test if confidence is low
    };
  }

  /**
   * Process multiple insights and create rules/campaigns
   */
  processInsights(insights, user_id) {
    try {
      this.logger.info('Processing multiple insights', { count: insights.length });

      const rules = [];
      const campaigns = [];

      insights.forEach(insight => {
        try {
          // Convert to rule
          const rule = this.convertInsightToRule(insight, user_id);
          rules.push(rule);

          // Convert to campaign if confidence is high enough
          if (insight.confidence > 0.7) {
            const campaign = this.convertInsightToCampaign(insight, user_id);
            campaigns.push(campaign);
          }
        } catch (error) {
          this.logger.warn('Failed to process insight', { 
            insightId: insight.id, 
            error: error.message 
          });
        }
      });

      this.logger.info('Insights processed successfully', { 
        rulesCount: rules.length, 
        campaignsCount: campaigns.length 
      });

      return { rules, campaigns };
    } catch (error) {
      this.logger.error('Failed to process insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate and clean data before processing
   */
  validateData(data, schema) {
    try {
      // Basic validation - in a real implementation, you'd use Zod schemas
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      return data;
    } catch (error) {
      this.logger.error('Data validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform performance metrics for analysis
   */
  transformPerformanceMetrics(metrics) {
    try {
      return {
        total_events: metrics.total_events || 0,
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0,
        revenue: metrics.revenue || 0,
        conversion_rate: metrics.conversion_rate || 0,
        click_through_rate: metrics.click_through_rate || 0,
        revenue_per_impression: metrics.revenue_per_impression || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to transform performance metrics', { error: error.message });
      throw error;
    }
  }
}

export { DataProcessor }; 