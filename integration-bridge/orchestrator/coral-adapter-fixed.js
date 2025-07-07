/**
 * Coral Adapter for Integration Bridge (Fixed Version)
 * Handles communication with Coral API and data analysis
 */

import { createClient } from '@supabase/supabase-js';
import { 
  CoralInsightSchema,
  BundleOpportunitySchema,
  validateData 
} from '../shared/schemas.js';

class CoralAdapter {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.database.url, config.database.key);
    this.baseUrl = config.url;
    this.credentials = config.credentials;
    this.isInitialized = false;
    
    this.logger = {
      info: (message, data = {}) => console.log(`[CORAL] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[CORAL] ${message}`, data),
      error: (message, data = {}) => console.error(`[CORAL] ${message}`, data),
      debug: (message, data = {}) => console.log(`[CORAL DEBUG] ${message}`, data)
    };
  }

  /**
   * Initialize the adapter
   */
  async initialize() {
    try {
      this.logger.info('Initializing Coral Adapter');
      
      // Test database connection
      await this.testConnection();
      
      this.isInitialized = true;
      this.logger.info('Coral Adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Coral Adapter', { error: error.message });
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('shopify_products')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      this.logger.debug('Coral connection test successful');
    } catch (error) {
      this.logger.error('Coral connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get order data for bundle analysis (FIXED VERSION)
   */
  async getOrderDataForAnalysis(config) {
    const { user_id, time_period = '30d', product_ids = [] } = config;
    
    // First get orders
    let ordersQuery = this.supabase
      .from('shopify_orders')
      .select('id, total_price, currency, created_at')
      .eq('user_id', user_id);

    // Add time filter
    if (time_period) {
      const daysAgo = this.getDaysAgo(time_period);
      ordersQuery = ordersQuery.gte('created_at', daysAgo);
    }

    const { data: orders, error: ordersError } = await ordersQuery.order('created_at', { ascending: false });
    if (ordersError) throw ordersError;

    // Then get order items for each order
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

  /**
   * Get trend data (FIXED VERSION)
   */
  async getTrendData(config) {
    const { user_id, time_period = '90d', metrics = ['revenue', 'orders', 'aov'] } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    // Get daily metrics
    const { data, error } = await this.supabase
      .from('shopify_orders')
      .select('total_price, created_at')
      .eq('user_id', user_id)
      .gte('created_at', daysAgo)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Aggregate by day
    const dailyData = this.aggregateDailyMetrics(data, metrics);
    return dailyData;
  }

  /**
   * Get customer data (FIXED VERSION)
   */
  async getCustomerData(config) {
    const { user_id, time_period = '90d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    // Get customers
    const { data: customers, error: customersError } = await this.supabase
      .from('shopify_customers')
      .select('id, email, first_name, last_name, total_spent, orders_count, created_at')
      .eq('user_id', user_id)
      .gte('created_at', daysAgo);

    if (customersError) throw customersError;

    // Get orders for each customer
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

  /**
   * Get comprehensive data for general insights
   */
  async getComprehensiveData(config) {
    const { user_id, time_period = '30d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    // Get all relevant data
    const [orders, products, customers, cartEvents] = await Promise.all([
      this.getOrderDataForAnalysis({ ...config, time_period }),
      this.getProductData(config),
      this.getCustomerData({ ...config, time_period }),
      this.getCartEventData({ ...config, time_period })
    ]);

    return {
      orders,
      products,
      customers,
      cart_events: cartEvents,
      time_period,
      user_id
    };
  }

  /**
   * Get product data
   */
  async getProductData(config) {
    const { user_id } = config;
    
    const { data, error } = await this.supabase
      .from('shopify_products')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;
    return data;
  }

  /**
   * Get cart event data
   */
  async getCartEventData(config) {
    const { user_id, time_period = '30d' } = config;
    
    const daysAgo = this.getDaysAgo(time_period);
    
    const { data, error } = await this.supabase
      .from('cart_events')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', daysAgo);

    if (error) throw error;
    return data;
  }

  /**
   * Analyze bundle opportunities
   */
  async analyzeBundleOpportunities(config) {
    try {
      this.logger.info('Analyzing bundle opportunities', config);
      
      const orderData = await this.getOrderDataForAnalysis(config);
      
      if (!orderData || orderData.length === 0) {
        this.logger.warn('No order data found for bundle analysis');
        return [];
      }

      const bundleOpportunities = this.findProductCombinations(orderData);
      
      // Convert to Coral insights format
      const insights = bundleOpportunities.map((opportunity, index) => ({
        id: `bundle-${Date.now()}-${index}`,
        type: 'bundle_opportunity',
        title: `Bundle Opportunity: ${opportunity.primary} + ${opportunity.secondary}`,
        description: `Customers frequently buy ${opportunity.primary} with ${opportunity.secondary}. Expected lift: ${opportunity.lift_percentage.toFixed(1)}%`,
        logic: {
          conditions: [
            { type: 'product_in_cart', product_id: opportunity.primary_id },
            { type: 'customer_segment', segment: 'frequent_buyers' }
          ],
          actions: [
            { type: 'show_bundle_offer', products: [opportunity.secondary_id], discount: 10 }
          ],
          priority: Math.min(opportunity.frequency * 10, 100)
        },
        data: opportunity,
        sources: ['order_history', 'product_combinations'],
        confidence: opportunity.confidence,
        created_at: new Date().toISOString()
      }));

      this.logger.info(`Found ${insights.length} bundle opportunities`);
      return insights;
    } catch (error) {
      this.logger.error('Bundle analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze trends
   */
  async analyzeTrends(config) {
    try {
      this.logger.info('Analyzing trends', config);
      
      const trendData = await this.getTrendData(config);
      
      if (!trendData || trendData.length === 0) {
        this.logger.warn('No trend data found');
        return [];
      }

      const insights = [];
      
      // Analyze revenue trend
      const revenueTrend = this.calculateTrend(trendData, 'revenue');
      if (revenueTrend) {
        insights.push({
          id: `trend-${Date.now()}-revenue`,
          type: 'trend_analysis',
          title: `Revenue ${revenueTrend.trend} by ${revenueTrend.change_percentage.toFixed(1)}%`,
          description: `Revenue has been ${revenueTrend.trend} over the last ${config.time_period}`,
          logic: {
            conditions: [],
            actions: revenueTrend.trend === 'increasing' ? 
              [{ type: 'increase_budget', percentage: 20 }] : 
              [{ type: 'review_pricing', urgency: 'high' }],
            priority: 70
          },
          data: revenueTrend,
          sources: ['revenue_data'],
          confidence: 0.8,
          created_at: new Date().toISOString()
        });
      }

      this.logger.info(`Found ${insights.length} trend insights`);
      return insights;
    } catch (error) {
      this.logger.error('Trend analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze customer segments
   */
  async analyzeCustomerSegments(config) {
    try {
      this.logger.info('Analyzing customer segments', config);
      
      const customerData = await this.getCustomerData(config);
      
      if (!customerData || customerData.length === 0) {
        this.logger.warn('No customer data found');
        return [];
      }

      const segments = this.identifyCustomerSegments(customerData);
      
      const insights = segments.map((segment, index) => ({
        id: `segment-${Date.now()}-${index}`,
        type: 'customer_segment',
        title: `Customer Segment: ${segment.name}`,
        description: `Identified ${segment.count} customers in ${segment.name} segment`,
        logic: {
          conditions: segment.conditions,
          actions: segment.actions,
          priority: 60
        },
        data: segment,
        sources: ['customer_data', 'purchase_history'],
        confidence: 0.7,
        created_at: new Date().toISOString()
      }));

      this.logger.info(`Found ${insights.length} customer segments`);
      return insights;
    } catch (error) {
      this.logger.error('Customer segment analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate comprehensive insights
   */
  async generateInsights(config) {
    try {
      this.logger.info('Generating comprehensive insights', config);
      
      const [bundleInsights, trendInsights, segmentInsights] = await Promise.all([
        this.analyzeBundleOpportunities(config),
        this.analyzeTrends(config),
        this.analyzeCustomerSegments(config)
      ]);

      const allInsights = [...bundleInsights, ...trendInsights, ...segmentInsights];
      
      this.logger.info(`Generated ${allInsights.length} total insights`);
      return allInsights;
    } catch (error) {
      this.logger.error('Insight generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper method to get days ago from time period
   */
  getDaysAgo(timePeriod) {
    const days = parseInt(timePeriod.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  /**
   * Helper method to aggregate daily metrics
   */
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

  /**
   * Helper method to find product combinations
   */
  findProductCombinations(orderData) {
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
                frequency: 0,
                lift_percentage: 0,
                confidence: 0
              });
            }
            
            const combo = combinations.get(key);
            combo.frequency++;
          }
        }
      }
    });

    // Calculate lift and confidence
    const totalOrders = orderData.length;
    return Array.from(combinations.values())
      .map(combo => ({
        ...combo,
        lift_percentage: (combo.frequency / totalOrders) * 100,
        confidence: Math.min(combo.frequency / 10, 0.95)
      }))
      .filter(combo => combo.frequency >= 2) // Only combinations that appear at least twice
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 combinations
  }

  /**
   * Helper method to calculate trends
   */
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
      data_points: data
    };
  }

  /**
   * Helper method to identify customer segments
   */
  identifyCustomerSegments(customerData) {
    const segments = [];
    
    // High-value customers
    const highValue = customerData.filter(c => c.total_spent > 200);
    if (highValue.length > 0) {
      segments.push({
        name: 'High-Value Customers',
        count: highValue.length,
        conditions: [{ type: 'total_spent', min: 200 }],
        actions: [{ type: 'vip_treatment', discount: 15 }]
      });
    }
    
    // Frequent buyers
    const frequent = customerData.filter(c => c.orders_count > 2);
    if (frequent.length > 0) {
      segments.push({
        name: 'Frequent Buyers',
        count: frequent.length,
        conditions: [{ type: 'orders_count', min: 2 }],
        actions: [{ type: 'loyalty_program', points: 100 }]
      });
    }
    
    return segments;
  }
}

export { CoralAdapter }; 