/**
 * Production Coral Insights Engine
 * Generates actionable insights for UpsellEngine rules and campaigns
 */

import { createClient } from '@supabase/supabase-js';
import { 
  CoralInsightSchema,
  BundleOpportunitySchema,
  validateData 
} from '../shared/schemas.js';

class CoralInsightsEngine {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.database.url, config.database.key);
    
    this.logger = {
      info: (message, data = {}) => console.log(`[CORAL INSIGHTS] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[CORAL INSIGHTS] ${message}`, data),
      error: (message, data = {}) => console.error(`[CORAL INSIGHTS] ${message}`, data),
      debug: (message, data = {}) => {
        if (config.logging?.level === 'debug') {
          console.log(`[CORAL INSIGHTS DEBUG] ${message}`, data);
        }
      }
    };
  }

  /**
   * Generate comprehensive insights for UpsellEngine
   */
  async generateUpsellInsights(config) {
    const { user_id, time_period = '30d', insight_types = ['bundle', 'trend', 'segment'] } = config;
    
    try {
      this.logger.info('Generating upsell insights', { user_id, time_period, insight_types });
      
      const insights = [];
      
      // Generate bundle opportunities
      if (insight_types.includes('bundle')) {
        const bundleInsights = await this.generateBundleOpportunities(config);
        insights.push(...bundleInsights);
      }
      
      // Generate trend analysis
      if (insight_types.includes('trend')) {
        const trendInsights = await this.generateTrendInsights(config);
        insights.push(...trendInsights);
      }
      
      // Generate customer segments
      if (insight_types.includes('segment')) {
        const segmentInsights = await this.generateCustomerSegments(config);
        insights.push(...segmentInsights);
      }
      
      // Generate performance insights
      if (insight_types.includes('performance')) {
        const performanceInsights = await this.generatePerformanceInsights(config);
        insights.push(...performanceInsights);
      }
      
      this.logger.info(`Generated ${insights.length} total insights`);
      return insights;
    } catch (error) {
      this.logger.error('Failed to generate upsell insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate bundle opportunities with detailed analysis
   */
  async generateBundleOpportunities(config) {
    const { user_id, time_period = '30d' } = config;
    
    try {
      const orderData = await this.getOrderDataForAnalysis(config);
      
      if (!orderData || orderData.length === 0) {
        return [];
      }

      const bundleOpportunities = this.analyzeProductCombinations(orderData);
      
      return bundleOpportunities.map((opportunity, index) => ({
        id: `bundle-${Date.now()}-${index}`,
        type: 'bundle_opportunity',
        title: `Bundle Opportunity: ${opportunity.primary} + ${opportunity.secondary}`,
        description: `Customers frequently buy ${opportunity.primary} with ${opportunity.secondary}. Expected lift: ${opportunity.lift_percentage.toFixed(1)}%`,
        confidence: opportunity.confidence,
        data: opportunity,
        upsell_engine_actions: this.generateUpsellActions(opportunity),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      this.logger.error('Bundle opportunity generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate trend insights for campaign creation
   */
  async generateTrendInsights(config) {
    const { user_id, time_period = '90d' } = config;
    
    try {
      const trendData = await this.getTrendData(config);
      
      if (!trendData || trendData.length === 0) {
        return [];
      }

      const trends = this.analyzeTrends(trendData);
      
      return trends.map((trend, index) => ({
        id: `trend-${Date.now()}-${index}`,
        type: 'trend_analysis',
        title: `${trend.metric} ${trend.trend} by ${trend.change_percentage.toFixed(1)}%`,
        description: `${trend.metric} has been ${trend.trend} over the last ${time_period}`,
        confidence: trend.confidence,
        data: trend,
        upsell_engine_actions: this.generateTrendActions(trend),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      this.logger.error('Trend insight generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate customer segments for targeted campaigns
   */
  async generateCustomerSegments(config) {
    const { user_id, time_period = '90d' } = config;
    
    try {
      const customerData = await this.getCustomerData(config);
      
      if (!customerData || customerData.length === 0) {
        return [];
      }

      const segments = this.identifyCustomerSegments(customerData);
      
      return segments.map((segment, index) => ({
        id: `segment-${Date.now()}-${index}`,
        type: 'customer_segment',
        title: `Customer Segment: ${segment.name}`,
        description: `Identified ${segment.count} customers in ${segment.name} segment`,
        confidence: segment.confidence,
        data: segment,
        upsell_engine_actions: this.generateSegmentActions(segment),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      this.logger.error('Customer segment generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate performance insights for optimization
   */
  async generatePerformanceInsights(config) {
    const { user_id, time_period = '30d' } = config;
    
    try {
      const performanceData = await this.getPerformanceData(config);
      
      if (!performanceData) {
        return [];
      }

      const insights = this.analyzePerformance(performanceData);
      
      return insights.map((insight, index) => ({
        id: `performance-${Date.now()}-${index}`,
        type: 'performance_insight',
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data: insight,
        upsell_engine_actions: this.generatePerformanceActions(insight),
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      this.logger.error('Performance insight generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate UpsellEngine actions from bundle opportunities
   */
  generateUpsellActions(opportunity) {
    // Use existing product ID for the rule if available
    const ruleId = opportunity.secondary_id && (opportunity.secondary_id.length !== 36 || !opportunity.secondary_id.includes('-')) 
      ? `bundle-rule-${opportunity.secondary_id}` 
      : `bundle-rule-${Date.now()}`;
      
    return {
      rules: [
        {
          type: 'create_rule',
          rule_data: {
            name: `Bundle: ${opportunity.primary} + ${opportunity.secondary}`,
            description: `Automatically suggest ${opportunity.secondary} when ${opportunity.primary} is in cart`,
            trigger_type: 'category',
            trigger_conditions: {
              category: opportunity.primary_category,
              category_operator: 'contains'
            },
            target_products: [opportunity.secondary_id],
            display_type: 'popup',
            priority: Math.min(opportunity.frequency * 10, 80),
            status: 'active'
          }
        }
      ],
      campaigns: [
        {
          type: 'create_campaign',
          campaign_data: {
            name: `Bundle Campaign: ${opportunity.primary} + ${opportunity.secondary}`,
            description: `Special bundle pricing for ${opportunity.primary} and ${opportunity.secondary}`,
            campaign_type: 'bundle',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            business_goals: {
              target_metric: 'revenue',
              target_value: opportunity.estimated_revenue,
              goal_description: `Increase revenue through ${opportunity.primary} + ${opportunity.secondary} bundles`
            },
            trigger_products: [opportunity.primary_id],
            upsell_products: [opportunity.secondary_id],
            pricing_rules: [
              {
                type: 'percentage_discount',
                value: 10,
                applies_to: [opportunity.secondary_id],
                conditions: {
                  cart_value_min: opportunity.primary_price
                }
              }
            ],
            display_settings: {
              display_type: 'popup',
              trigger_timing: 'immediate',
              display_frequency: 'once'
            },
            priority_level: 'high',
            status: 'draft'
          }
        }
      ]
    };
  }

  /**
   * Generate UpsellEngine actions from trend insights
   */
  generateTrendActions(trend) {
    return {
      rules: [
        {
          type: 'update_rule_priority',
          rule_data: {
            priority_boost: trend.trend === 'increasing' ? 20 : -20,
            description: `Priority adjusted based on ${trend.metric} trend`
          }
        }
      ],
      campaigns: [
        {
          type: 'create_campaign',
          campaign_data: {
            name: `${trend.metric} Trend Campaign`,
            description: `Capitalize on ${trend.metric} ${trend.trend} trend`,
            campaign_type: trend.trend === 'increasing' ? 'cross-sell' : 'clearance',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            business_goals: {
              target_metric: trend.metric === 'revenue' ? 'revenue' : 'conversion_rate',
              target_value: trend.current_value * (trend.trend === 'increasing' ? 1.2 : 0.8),
              goal_description: `${trend.trend === 'increasing' ? 'Accelerate' : 'Stabilize'} ${trend.metric} trend`
            },
            priority_level: trend.trend === 'increasing' ? 'high' : 'medium',
            status: 'draft'
          }
        }
      ]
    };
  }

  /**
   * Generate UpsellEngine actions from customer segments
   */
  generateSegmentActions(segment) {
    // Use existing product ID for the rule if available
    const firstProduct = segment.recommended_products && segment.recommended_products.length > 0 ? segment.recommended_products[0] : null;
    const ruleId = firstProduct && (firstProduct.length !== 36 || !firstProduct.includes('-')) 
      ? `segment-rule-${firstProduct}` 
      : `segment-rule-${Date.now()}`;
      
    return {
      rules: [
        {
          type: 'create_rule',
          rule_data: {
            name: `${segment.name} Rule`,
            description: `Special offers for ${segment.name} customers`,
            trigger_type: 'customer_segment',
            trigger_conditions: segment.conditions,
            target_products: segment.recommended_products,
            display_type: 'popup',
            priority: segment.priority,
            status: 'active'
          }
        }
      ],
      campaigns: [
        {
          type: 'create_campaign',
          campaign_data: {
            name: `${segment.name} Campaign`,
            description: `Targeted campaign for ${segment.name} segment`,
            campaign_type: segment.campaign_type,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days
            business_goals: {
              target_metric: 'conversion_rate',
              target_value: segment.target_conversion_rate,
              goal_description: `Increase engagement with ${segment.name} customers`
            },
            target_audience: {
              customer_segments: [segment.name]
            },
            trigger_products: segment.trigger_products,
            upsell_products: segment.recommended_products,
            priority_level: 'medium',
            status: 'draft'
          }
        }
      ]
    };
  }

  /**
   * Generate UpsellEngine actions from performance insights
   */
  generatePerformanceActions(insight) {
    return {
      rules: [
        {
          type: insight.action_type,
          rule_data: insight.rule_updates
        }
      ],
      campaigns: insight.campaign_updates ? [
        {
          type: 'update_campaign',
          campaign_data: insight.campaign_updates
        }
      ] : []
    };
  }

  // Data retrieval methods (reuse from coral-adapter.js)
  async getOrderDataForAnalysis(config) {
    const { user_id, time_period = '30d' } = config;
    
    let ordersQuery = this.supabase
      .from('shopify_orders')
      .select('id, total_price, currency, created_at')
      .eq('user_id', user_id);

    if (time_period) {
      const daysAgo = this.getDaysAgo(time_period);
      ordersQuery = ordersQuery.gte('created_at', daysAgo);
    }

    const { data: orders, error: ordersError } = await ordersQuery.order('created_at', { ascending: false });
    if (ordersError) throw ordersError;

    const ordersWithItems = [];
    for (const order of orders) {
      const { data: items, error: itemsError } = await this.supabase
        .from('shopify_order_items')
        .select('product_id, title, quantity, price')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      ordersWithItems.push({
        ...order,
        items: items || []
      });
    }

    return ordersWithItems;
  }

  async getTrendData(config) {
    const { user_id, time_period = '90d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    const { data, error } = await this.supabase
      .from('shopify_orders')
      .select('total_price, created_at')
      .eq('user_id', user_id)
      .gte('created_at', daysAgo)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return this.aggregateDailyMetrics(data, ['revenue', 'orders']);
  }

  async getCustomerData(config) {
    const { user_id, time_period = '90d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    const { data: customers, error: customersError } = await this.supabase
      .from('shopify_customers')
      .select('id, email, first_name, last_name, total_spent, orders_count, created_at')
      .eq('user_id', user_id)
      .gte('created_at', daysAgo);

    if (customersError) throw customersError;

    const customersWithOrders = [];
    for (const customer of customers) {
      const { data: orders, error: ordersError } = await this.supabase
        .from('shopify_orders')
        .select('id, total_price, created_at')
        .eq('customer_id', customer.id);

      if (ordersError) throw ordersError;

      customersWithOrders.push({
        ...customer,
        orders: orders || []
      });
    }

    return customersWithOrders;
  }

  async getPerformanceData(config) {
    const { user_id, time_period = '30d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    // Get rule performance
    const { data: rulePerformance, error: ruleError } = await this.supabase
      .from('rule_performance')
      .select('*')
      .gte('created_at', daysAgo);

    if (ruleError) throw ruleError;

    // Get campaign performance
    const { data: campaignPerformance, error: campaignError } = await this.supabase
      .from('campaign_performance')
      .select('*')
      .gte('created_at', daysAgo);

    if (campaignError) throw campaignError;

    return {
      rule_performance: rulePerformance,
      campaign_performance: campaignPerformance
    };
  }

  // Analysis methods
  analyzeProductCombinations(orderData) {
    const combinations = new Map();
    
    orderData.forEach(order => {
      if (order.items && order.items.length > 1) {
        const productIds = order.items.map(item => item.product_id).sort();
        
        for (let i = 0; i < productIds.length; i++) {
          for (let j = i + 1; j < productIds.length; j++) {
            const key = `${productIds[i]}-${productIds[j]}`;
            const primary = order.items.find(item => item.product_id === productIds[i]);
            const secondary = order.items.find(item => item.product_id === productIds[j]);
            
            if (!combinations.has(key)) {
              combinations.set(key, {
                primary_id: productIds[i],
                secondary_id: productIds[j],
                primary: primary.title,
                secondary: secondary.title,
                primary_category: this.extractCategory(primary.title),
                primary_price: primary.price,
                secondary_price: secondary.price,
                frequency: 0,
                lift_percentage: 0,
                confidence: 0,
                estimated_revenue: 0
              });
            }
            
            const combo = combinations.get(key);
            combo.frequency++;
          }
        }
      }
    });

    const totalOrders = orderData.length;
    return Array.from(combinations.values())
      .map(combo => ({
        ...combo,
        lift_percentage: (combo.frequency / totalOrders) * 100,
        confidence: Math.min(combo.frequency / 10, 0.95),
        estimated_revenue: combo.frequency * combo.secondary_price * 0.1 // 10% conversion rate
      }))
      .filter(combo => combo.frequency >= 2)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  analyzeTrends(data) {
    if (data.length < 2) return [];
    
    const trends = [];
    
    // Analyze revenue trend
    const revenueTrend = this.calculateTrend(data, 'revenue');
    if (revenueTrend) {
      trends.push({
        metric: 'revenue',
        trend: revenueTrend.trend,
        change_percentage: revenueTrend.change_percentage,
        current_value: revenueTrend.current_value,
        confidence: 0.8,
        data_points: data
      });
    }
    
    // Analyze order count trend
    const orderTrend = this.calculateTrend(data, 'orders');
    if (orderTrend) {
      trends.push({
        metric: 'orders',
        trend: orderTrend.trend,
        change_percentage: orderTrend.change_percentage,
        current_value: orderTrend.current_value,
        confidence: 0.8,
        data_points: data
      });
    }
    
    return trends;
  }

  identifyCustomerSegments(customerData) {
    const segments = [];
    
    // High-value customers
    const highValue = customerData.filter(c => c.total_spent > 200);
    if (highValue.length > 0) {
      segments.push({
        name: 'High-Value Customers',
        count: highValue.length,
        confidence: 0.9,
        priority: 80,
        campaign_type: 'retention',
        target_conversion_rate: 0.15,
        conditions: [{ type: 'total_spent', min: 200 }],
        recommended_products: this.getRecommendedProducts(highValue),
        trigger_products: [],
        action_type: 'create_rule'
      });
    }
    
    // Frequent buyers
    const frequent = customerData.filter(c => c.orders_count > 2);
    if (frequent.length > 0) {
      segments.push({
        name: 'Frequent Buyers',
        count: frequent.length,
        confidence: 0.8,
        priority: 70,
        campaign_type: 'cross-sell',
        target_conversion_rate: 0.12,
        conditions: [{ type: 'orders_count', min: 2 }],
        recommended_products: this.getRecommendedProducts(frequent),
        trigger_products: [],
        action_type: 'create_rule'
      });
    }
    
    // New customers
    const newCustomers = customerData.filter(c => c.orders_count === 1);
    if (newCustomers.length > 0) {
      segments.push({
        name: 'New Customers',
        count: newCustomers.length,
        confidence: 0.7,
        priority: 60,
        campaign_type: 'cross-sell',
        target_conversion_rate: 0.08,
        conditions: [{ type: 'orders_count', max: 1 }],
        recommended_products: this.getRecommendedProducts(newCustomers),
        trigger_products: [],
        action_type: 'create_rule'
      });
    }
    
    return segments;
  }

  analyzePerformance(performanceData) {
    const insights = [];
    
    // Analyze rule performance
    if (performanceData.rule_performance) {
      const ruleInsights = this.analyzeRulePerformance(performanceData.rule_performance);
      insights.push(...ruleInsights);
    }
    
    // Analyze campaign performance
    if (performanceData.campaign_performance) {
      const campaignInsights = this.analyzeCampaignPerformance(performanceData.campaign_performance);
      insights.push(...campaignInsights);
    }
    
    return insights;
  }

  // Helper methods
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

  getRecommendedProducts(customers) {
    // This would be implemented based on customer purchase history
    // For now, return empty array
    return [];
  }

  calculateTrend(data, metric) {
    if (data.length < 2) return null;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item[metric], 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item[metric], 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change_percentage: Math.abs(change),
      current_value: secondAvg,
      data_points: data
    };
  }

  aggregateDailyMetrics(data, metrics) {
    const dailyMap = new Map();
    
    data.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, revenue: 0, orders: 0 });
      }
      
      const day = dailyMap.get(date);
      day.revenue += parseFloat(order.total_price);
      day.orders += 1;
    });

    return Array.from(dailyMap.values());
  }

  getDaysAgo(timePeriod) {
    const days = parseInt(timePeriod.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  analyzeRulePerformance(rulePerformance) {
    // Implementation for rule performance analysis
    return [];
  }

  analyzeCampaignPerformance(campaignPerformance) {
    // Implementation for campaign performance analysis
    return [];
  }
}

export { CoralInsightsEngine }; 