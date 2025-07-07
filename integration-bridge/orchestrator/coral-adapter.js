/**
 * Coral Adapter for Integration Bridge
 * Handles communication with Coral OpenDeepResearch Agent
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { 
  CoralAnalysisRequestSchema,
  CoralInsightSchema,
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
   * Initialize the Coral adapter
   */
  async initialize() {
    try {
      this.logger.info('Initializing Coral Adapter');
      
      // Test connection to Coral agent
      await this.testConnection();
      
      this.isInitialized = true;
      this.logger.info('Coral Adapter initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Coral adapter', { error: error.message });
      throw error;
    }
  }

  /**
   * Test connection to Coral agent
   */
  async testConnection() {
    try {
      // For now, we'll test by checking if we can access the database
      // In a real implementation, you'd make an API call to the Coral agent
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      this.logger.debug('Coral connection test successful');
      return true;
    } catch (error) {
      throw new Error(`Coral connection test failed: ${error.message}`);
    }
  }

  /**
   * Analyze bundle opportunities
   */
  async analyzeBundleOpportunities(config) {
    try {
      this.logger.info('Analyzing bundle opportunities', config);

      // Get order data for analysis
      const orderData = await this.getOrderDataForAnalysis(config);
      
      // Generate analysis prompt
      const prompt = this.generateBundleAnalysisPrompt(orderData, config);
      
      // Call Coral agent for analysis
      const analysis = await this.callCoralAgent('bundle_analysis', {
        prompt,
        data: orderData,
        parameters: config
      });

      // Process and validate the response
      const insights = this.processBundleInsights(analysis, config);
      
      this.logger.info('Bundle analysis completed', { insightsCount: insights.length });
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

      // Get trend data
      const trendData = await this.getTrendData(config);
      
      // Generate analysis prompt
      const prompt = this.generateTrendAnalysisPrompt(trendData, config);
      
      // Call Coral agent for analysis
      const analysis = await this.callCoralAgent('trend_analysis', {
        prompt,
        data: trendData,
        parameters: config
      });

      // Process and validate the response
      const insights = this.processTrendInsights(analysis, config);
      
      this.logger.info('Trend analysis completed', { insightsCount: insights.length });
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

      // Get customer data
      const customerData = await this.getCustomerData(config);
      
      // Generate analysis prompt
      const prompt = this.generateCustomerSegmentationPrompt(customerData, config);
      
      // Call Coral agent for analysis
      const analysis = await this.callCoralAgent('customer_segmentation', {
        prompt,
        data: customerData,
        parameters: config
      });

      // Process and validate the response
      const insights = this.processCustomerInsights(analysis, config);
      
      this.logger.info('Customer segmentation completed', { insightsCount: insights.length });
      return insights;
    } catch (error) {
      this.logger.error('Customer segmentation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate general insights
   */
  async generateInsights(config) {
    try {
      this.logger.info('Generating insights', config);

      // Get comprehensive data
      const data = await this.getComprehensiveData(config);
      
      // Generate analysis prompt
      const prompt = this.generateGeneralInsightsPrompt(data, config);
      
      // Call Coral agent for analysis
      const analysis = await this.callCoralAgent('general_insights', {
        prompt,
        data,
        parameters: config
      });

      // Process and validate the response
      const insights = this.processGeneralInsights(analysis, config);
      
      this.logger.info('Insights generation completed', { insightsCount: insights.length });
      return insights;
    } catch (error) {
      this.logger.error('Insights generation failed', { error: error.message });
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
   * Get trend data
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
   * Call Coral agent
   */
  async callCoralAgent(analysisType, payload) {
    try {
      // For now, we'll simulate the Coral agent call
      // In a real implementation, you'd make an HTTP request to the Coral agent
      this.logger.debug(`Calling Coral agent for ${analysisType}`, payload);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Return mock analysis based on type
      return this.generateMockAnalysis(analysisType, payload);
    } catch (error) {
      throw new Error(`Coral agent call failed: ${error.message}`);
    }
  }

  /**
   * Generate mock analysis (placeholder for real Coral integration)
   */
  generateMockAnalysis(analysisType, payload) {
    switch (analysisType) {
      case 'bundle_analysis':
        return this.generateMockBundleAnalysis(payload);
      case 'trend_analysis':
        return this.generateMockTrendAnalysis(payload);
      case 'customer_segmentation':
        return this.generateMockCustomerSegmentation(payload);
      case 'general_insights':
        return this.generateMockGeneralInsights(payload);
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  /**
   * Generate mock bundle analysis
   */
  generateMockBundleAnalysis(payload) {
    const { data } = payload;
    
    // Analyze order data to find common product combinations
    const productCombinations = this.findProductCombinations(data);
    
    return {
      type: 'bundle_opportunity',
      insights: productCombinations.map(combo => ({
        id: uuidv4(),
        type: 'bundle_opportunity',
        title: `Bundle Opportunity: ${combo.primary} + ${combo.secondary}`,
        description: `Customers who buy ${combo.primary} often also buy ${combo.secondary}`,
        logic: {
          conditions: [
            { type: 'product_in_cart', product_id: combo.primary_id },
            { type: 'time_window', seconds: 300 }
          ],
          actions: [
            { type: 'recommend_product', product_id: combo.secondary_id },
            { type: 'show_popup', template: 'bundle_offer' }
          ],
          priority: combo.frequency > 10 ? 80 : 60
        },
        data: {
          primary_product: combo.primary,
          secondary_product: combo.secondary,
          frequency: combo.frequency,
          lift_percentage: combo.lift_percentage,
          confidence: combo.confidence
        },
        sources: ['order_analysis'],
        confidence: combo.confidence,
        created_at: new Date().toISOString()
      }))
    };
  }

  /**
   * Generate mock trend analysis
   */
  generateMockTrendAnalysis(payload) {
    const { data } = payload;
    
    return {
      type: 'trend_analysis',
      insights: [
        {
          id: uuidv4(),
          type: 'trend_analysis',
          title: 'Revenue Trend Analysis',
          description: 'Revenue has been increasing steadily over the past 30 days',
          logic: {
            conditions: [],
            actions: [
              { type: 'optimize_pricing', strategy: 'dynamic_pricing' }
            ],
            priority: 70
          },
          data: {
            metric: 'revenue',
            trend: 'increasing',
            change_percentage: 15.5,
            time_period: '30d',
            data_points: data
          },
          sources: ['revenue_analysis'],
          confidence: 0.85,
          created_at: new Date().toISOString()
        }
      ]
    };
  }

  /**
   * Generate mock customer segmentation
   */
  generateMockCustomerSegmentation(payload) {
    const { data } = payload;
    
    return {
      type: 'customer_segmentation',
      insights: [
        {
          id: uuidv4(),
          type: 'customer_segment',
          title: 'High-Value Customer Segment',
          description: 'Identified segment of high-value customers with specific preferences',
          logic: {
            conditions: [
              { type: 'customer_segment', segment: 'high_value' }
            ],
            actions: [
              { type: 'personalized_offer', segment: 'high_value' }
            ],
            priority: 90
          },
          data: {
            segment_name: 'high_value',
            criteria: {
              total_spent_min: 500,
              orders_count_min: 3
            },
            customer_count: data.filter(c => c.total_spent > 500).length,
            avg_order_value: 250
          },
          sources: ['customer_analysis'],
          confidence: 0.92,
          created_at: new Date().toISOString()
        }
      ]
    };
  }

  /**
   * Generate mock general insights
   */
  generateMockGeneralInsights(payload) {
    return {
      type: 'general_insights',
      insights: [
        {
          id: uuidv4(),
          type: 'performance_insight',
          title: 'Cart Abandonment Analysis',
          description: 'High cart abandonment rate detected on mobile devices',
          logic: {
            conditions: [
              { type: 'device_type', value: 'mobile' },
              { type: 'cart_abandonment_rate', threshold: 0.7 }
            ],
            actions: [
              { type: 'optimize_mobile_experience' },
              { type: 'exit_intent_popup', device: 'mobile' }
            ],
            priority: 85
          },
          data: {
            cart_abandonment_rate: 0.75,
            device_breakdown: {
              mobile: 0.75,
              desktop: 0.45
            }
          },
          sources: ['cart_analysis', 'device_analysis'],
          confidence: 0.88,
          created_at: new Date().toISOString()
        }
      ]
    };
  }

  /**
   * Find product combinations in order data
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
   * Aggregate daily metrics
   */
  aggregateDailyMetrics(data, metrics) {
    const dailyMap = new Map();
    
    data.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          revenue: 0,
          orders: 0,
          aov: 0
        });
      }
      
      const day = dailyMap.get(date);
      day.revenue += order.total_price;
      day.orders += 1;
    });

    // Calculate AOV
    dailyMap.forEach(day => {
      day.aov = day.orders > 0 ? day.revenue / day.orders : 0;
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate bundle analysis prompt
   */
  generateBundleAnalysisPrompt(orderData, config) {
    return `Analyze the following order data to identify bundle opportunities:

Time Period: ${config.time_period || '30d'}
Total Orders: ${orderData.length}

Order Data:
${JSON.stringify(orderData, null, 2)}

Please identify:
1. Products that are frequently purchased together
2. Potential bundle opportunities with expected revenue lift
3. Optimal trigger conditions for bundle recommendations
4. Confidence levels for each opportunity

Return the analysis in a structured format suitable for creating upsell rules.`;
  }

  /**
   * Generate trend analysis prompt
   */
  generateTrendAnalysisPrompt(trendData, config) {
    return `Analyze the following trend data to identify patterns and opportunities:

Time Period: ${config.time_period || '90d'}
Metrics: ${config.metrics?.join(', ') || 'revenue, orders, aov'}

Trend Data:
${JSON.stringify(trendData, null, 2)}

Please identify:
1. Revenue trends and patterns
2. Seasonal variations
3. Growth opportunities
4. Potential pricing optimizations

Return the analysis in a structured format suitable for business decisions.`;
  }

  /**
   * Generate customer segmentation prompt
   */
  generateCustomerSegmentationPrompt(customerData, config) {
    return `Analyze the following customer data to identify segments and opportunities:

Time Period: ${config.time_period || '90d'}
Total Customers: ${customerData.length}

Customer Data:
${JSON.stringify(customerData, null, 2)}

Please identify:
1. Customer segments based on behavior and spending
2. High-value customer characteristics
3. Opportunities for personalized marketing
4. Customer lifetime value patterns

Return the analysis in a structured format suitable for targeted marketing.`;
  }

  /**
   * Generate general insights prompt
   */
  generateGeneralInsightsPrompt(data, config) {
    return `Analyze the following comprehensive data to generate business insights:

Time Period: ${config.time_period || '30d'}

Data Summary:
- Orders: ${data.orders.length}
- Products: ${data.products.length}
- Customers: ${data.customers.length}
- Cart Events: ${data.cart_events.length}

Please identify:
1. Key performance indicators
2. Optimization opportunities
3. Customer behavior patterns
4. Revenue optimization strategies

Return the analysis in a structured format suitable for business strategy.`;
  }

  /**
   * Process bundle insights
   */
  processBundleInsights(analysis, config) {
    const insights = analysis.insights || [];
    
    return insights.map(insight => {
      const validation = validateData(CoralInsightSchema, insight);
      if (!validation.success) {
        this.logger.warn('Invalid insight schema', validation.errors);
        return null;
      }
      return validation.data;
    }).filter(Boolean);
  }

  /**
   * Process trend insights
   */
  processTrendInsights(analysis, config) {
    const insights = analysis.insights || [];
    
    return insights.map(insight => {
      const validation = validateData(CoralInsightSchema, insight);
      if (!validation.success) {
        this.logger.warn('Invalid insight schema', validation.errors);
        return null;
      }
      return validation.data;
    }).filter(Boolean);
  }

  /**
   * Process customer insights
   */
  processCustomerInsights(analysis, config) {
    const insights = analysis.insights || [];
    
    return insights.map(insight => {
      const validation = validateData(CoralInsightSchema, insight);
      if (!validation.success) {
        this.logger.warn('Invalid insight schema', validation.errors);
        return null;
      }
      return validation.data;
    }).filter(Boolean);
  }

  /**
   * Process general insights
   */
  processGeneralInsights(analysis, config) {
    const insights = analysis.insights || [];
    
    return insights.map(insight => {
      const validation = validateData(CoralInsightSchema, insight);
      if (!validation.success) {
        this.logger.warn('Invalid insight schema', validation.errors);
        return null;
      }
      return validation.data;
    }).filter(Boolean);
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

export { CoralAdapter }; 