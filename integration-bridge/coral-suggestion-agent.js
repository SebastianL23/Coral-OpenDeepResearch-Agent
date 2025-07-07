/**
 * Coral Suggestion Agent
 * Analyzes UpsellEngine data and provides actionable recommendations for merchants
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './shared/config.js';

class CoralSuggestionAgent {
  constructor() {
    this.supabase = createClient(config.database.url, config.database.key);
    this.logger = {
      info: (message) => console.log(`[CORAL AGENT] ${message}`),
      success: (message) => console.log(`✅ ${message}`),
      warning: (message) => console.log(`⚠️  ${message}`),
      error: (message) => console.log(`❌ ${message}`)
    };
  }

  /**
   * Main method to generate suggestions for a merchant
   */
  async generateSuggestions(userId, options = {}) {
    try {
      this.logger.info(`Generating suggestions for user: ${userId}`);
      
      // Analyze all data sources
      const analysis = await this.analyzeMerchantData(userId);
      
      // Generate recommendations
      const suggestions = await this.generateRecommendations(analysis, options);
      
      // Format and return results
      return this.formatSuggestions(suggestions);
      
    } catch (error) {
      this.logger.error(`Failed to generate suggestions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze all merchant data sources
   */
  async analyzeMerchantData(userId) {
    this.logger.info('Analyzing merchant data...');
    
    const analysis = {
      products: await this.analyzeProducts(userId),
      campaigns: await this.analyzeCampaigns(userId),
      rules: await this.analyzeRules(userId),
      performance: await this.analyzePerformance(userId),
      opportunities: await this.identifyOpportunities(userId)
    };
    
    this.logger.success('Data analysis completed');
    return analysis;
  }

  /**
   * Analyze product data with enhanced insights
   */
  async analyzeProducts(userId) {
    // Fetch products with detailed information
    const { data: products, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    // Fetch product performance data if available
    let productPerformance = {};
    try {
      const { data: performance } = await this.supabase
        .from('product_performance')
        .select('*')
        .eq('user_id', userId);
      
      if (performance) {
        productPerformance = performance.reduce((acc, p) => {
          acc[p.product_id] = p;
          return acc;
        }, {});
      }
    } catch (e) {
      this.logger.warning('Product performance table not available');
    }

    // Fetch inventory data if available
    let inventoryData = {};
    try {
      const { data: inventory } = await this.supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userId);
      
      if (inventory) {
        inventoryData = inventory.reduce((acc, i) => {
          acc[i.product_id] = i;
          return acc;
        }, {});
      }
    } catch (e) {
      this.logger.warning('Inventory table not available');
    }

    // Enhanced product analysis
    const analysis = {
      total_products: products.length,
      categories: this.groupByCategory(products),
      price_ranges: this.analyzePriceRanges(products),
      low_inventory: products.filter(p => (inventoryData[p.id]?.quantity || p.inventory_level || 0) < 10),
      high_value: products.filter(p => p.price > 100),
      trending: this.identifyTrendingProducts(products, productPerformance),
      performance_metrics: this.analyzeProductPerformance(products, productPerformance),
      inventory_insights: this.analyzeInventoryInsights(products, inventoryData),
      product_relationships: this.analyzeProductRelationships(products),
      revenue_potential: this.calculateRevenuePotential(products, productPerformance)
    };

    return analysis;
  }

  /**
   * Analyze existing campaigns
   */
  async analyzeCampaigns(userId) {
    const { data: campaigns, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const analysis = {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(c => c.status === 'active').length,
      campaign_types: this.groupByType(campaigns, 'campaign_type'),
      performance: this.analyzeCampaignPerformance(campaigns),
      opportunities: this.identifyCampaignOpportunities(campaigns)
    };

    return analysis;
  }

  /**
   * Analyze existing rules
   */
  async analyzeRules(userId) {
    const { data: rules, error } = await this.supabase
      .from('upsell_rules')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const analysis = {
      total_rules: rules.length,
      active_rules: rules.filter(r => r.is_active).length,
      rule_types: this.groupByType(rules, 'rule_type'),
      performance: this.analyzeRulePerformance(rules),
      gaps: this.identifyRuleGaps(rules)
    };

    return analysis;
  }

  /**
   * Analyze performance data with enhanced metrics
   */
  async analyzePerformance(userId) {
    this.logger.info('Analyzing performance data...');
    
    const performance = {
      conversion_rate: 0.05,
      average_order_value: 75,
      revenue_trend: 'increasing',
      top_performing_products: [],
      underperforming_products: [],
      customer_behavior: {},
      sales_patterns: {},
      revenue_insights: {}
    };

    // Fetch customer behavior data if available
    try {
      const { data: customerData } = await this.supabase
        .from('customer_behavior')
        .select('*')
        .eq('user_id', userId);
      
      if (customerData && customerData.length > 0) {
        performance.customer_behavior = this.analyzeCustomerBehavior(customerData);
      }
    } catch (e) {
      this.logger.warning('Customer behavior table not available');
    }

    // Fetch sales data if available
    try {
      const { data: salesData } = await this.supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId);
      
      if (salesData && salesData.length > 0) {
        performance.sales_patterns = this.analyzeSalesPatterns(salesData);
        performance.revenue_insights = this.calculateRevenueInsights(salesData);
      }
    } catch (e) {
      this.logger.warning('Sales table not available');
    }

    // Fetch order data if available
    try {
      const { data: orderData } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId);
      
      if (orderData && orderData.length > 0) {
        performance.average_order_value = this.calculateAverageOrderValue(orderData);
        performance.conversion_rate = this.calculateConversionRate(orderData);
        performance.top_performing_products = this.identifyTopProducts(orderData);
        performance.underperforming_products = this.identifyUnderperformingProducts(orderData);
      }
    } catch (e) {
      this.logger.warning('Orders table not available');
    }

    return performance;
  }

  /**
   * Identify business opportunities
   */
  async identifyOpportunities(userId) {
    const opportunities = [];
    
    // Get products for opportunity analysis
    const { data: products } = await this.supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (products && products.length > 0) {
      // Bundle opportunities
      opportunities.push(...this.findBundleOpportunities(products));
      
      // Clearance opportunities
      opportunities.push(...this.findClearanceOpportunities(products));
      
      // Cross-sell opportunities
      opportunities.push(...this.findCrossSellOpportunities(products));
    }

    return opportunities;
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(analysis, options) {
    this.logger.info('Generating recommendations...');
    
    const recommendations = {
      rules: [],
      campaigns: [],
      insights: [],
      priorities: []
    };

    // Generate rule suggestions
    recommendations.rules = this.generateRuleSuggestions(analysis);
    
    // Generate campaign suggestions
    recommendations.campaigns = this.generateCampaignSuggestions(analysis);
    
    // Generate insights
    recommendations.insights = this.generateInsights(analysis);
    
    // Set priorities
    recommendations.priorities = this.setPriorities(recommendations);

    this.logger.success('Recommendations generated');
    return recommendations;
  }

  /**
   * Generate rule suggestions
   */
  generateRuleSuggestions(analysis) {
    const suggestions = [];

    // Product-based rules
    if (analysis.products.categories) {
      Object.entries(analysis.products.categories).forEach(([category, products]) => {
        if (products.length > 1) {
          suggestions.push({
            type: 'product_based',
            name: `${category} Cross-Sell Rule`,
            description: `Automatically suggest related ${category} products when customers view items in this category`,
            priority: 'high',
            expected_impact: 'medium',
            rule_object: {
              name: `${category} Cross-Sell Rule`,
              description: `Suggest related ${category} products`,
              rule_type: 'product_based',
              conditions: {
                product_category: category,
                cart_value_min: 25
              },
              actions: {
                suggest_products: products.slice(0, 3).map(p => p.id),
                display_type: 'popup',
                priority: 50
              },
              priority: 50,
              is_active: true
            }
          });
        }
      });
    }

    // Cart value rules
    if (analysis.performance.average_order_value) {
      suggestions.push({
        type: 'cart_value',
        name: 'Premium Product Rule',
        description: `Suggest premium products when cart value exceeds $${analysis.performance.average_order_value * 1.5}`,
        priority: 'medium',
        expected_impact: 'high',
        rule_object: {
          name: 'Premium Product Rule',
          description: 'Suggest premium products for high-value carts',
          rule_type: 'cart_value',
          conditions: {
            cart_value_min: analysis.performance.average_order_value * 1.5
          },
          actions: {
            suggest_products: analysis.products.high_value.slice(0, 3).map(p => p.id),
            display_type: 'popup',
            priority: 70
          },
          priority: 70,
          is_active: true
        }
      });
    }

    // Time-based rules (always generate)
    suggestions.push({
      type: 'time_based',
      name: 'Time-Based Engagement Rule',
      description: 'Engage customers who spend significant time browsing (2+ minutes)',
      priority: 'medium',
      expected_impact: 'medium',
      rule_object: {
        name: 'Time-Based Engagement Rule',
        description: 'Engage customers who spend significant time browsing',
        rule_type: 'time_based',
        conditions: {
          time_on_site_min: 120 // 2 minutes
        },
        actions: {
          suggest_products: analysis.products.trending.slice(0, 3).map(p => p.id),
          display_type: 'popup',
          priority: 50
        },
        priority: 50,
        is_active: true
      }
    });

    // Category-based rules (if we have multiple categories)
    if (analysis.products.categories && Object.keys(analysis.products.categories).length > 1) {
      const categories = Object.keys(analysis.products.categories);
      const primaryCategory = categories[0];
      const secondaryCategory = categories[1];
      
      suggestions.push({
        type: 'category',
        name: `${primaryCategory} Cross-Sell Rule`,
        description: `Suggest ${secondaryCategory} products when customers browse ${primaryCategory}`,
        priority: 'high',
        expected_impact: 'medium',
        rule_object: {
          name: `${primaryCategory} Cross-Sell Rule`,
          description: `Suggest ${secondaryCategory} products when customers browse ${primaryCategory}`,
          rule_type: 'category',
          conditions: {
            category: primaryCategory,
            category_operator: 'contains'
          },
          actions: {
            suggest_products: analysis.products.categories[secondaryCategory].slice(0, 3).map(p => p.id),
            display_type: 'popup',
            priority: 60
          },
          priority: 60,
          is_active: true
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate campaign suggestions
   */
  generateCampaignSuggestions(analysis) {
    const suggestions = [];

    // Clearance campaigns
    if (analysis.products.low_inventory.length > 0) {
      suggestions.push({
        type: 'clearance',
        name: 'Inventory Clearance Campaign',
        description: `Clear ${analysis.products.low_inventory.length} low-inventory products with special pricing`,
        priority: 'high',
        expected_impact: 'high',
        campaign_object: {
          name: 'Inventory Clearance Campaign',
          description: 'Clear low-inventory products',
          status: 'draft',
          campaign_type: 'popup',
          trigger_type: 'page_load',
          trigger_delay: 0,
          target_pages: ['/products/*'],
          settings: {
            discount_percentage: 25,
            urgency_message: 'Limited stock available!'
          },
          content: {
            title: 'Limited Time Offer',
            message: 'Clearance prices on selected items',
            cta_text: 'Shop Now'
          },
          rules: analysis.products.low_inventory.map(p => ({
            product_id: p.id,
            discount: 25
          }))
        }
      });
    }

    // Bundle campaigns
    if (analysis.opportunities.length > 0) {
      analysis.opportunities.forEach(opp => {
        if (opp.type === 'bundle') {
          suggestions.push({
            type: 'bundle',
            name: `${opp.primary} + ${opp.secondary} Bundle`,
            description: `Bundle ${opp.primary} with ${opp.secondary} for increased AOV`,
            priority: 'medium',
            expected_impact: 'medium',
            campaign_object: {
              name: `${opp.primary} + ${opp.secondary} Bundle`,
              description: `Bundle ${opp.primary} with ${opp.secondary}`,
              status: 'draft',
              campaign_type: 'popup',
              trigger_type: 'page_load',
              trigger_delay: 5,
              target_pages: [`/products/${opp.primary_id}`],
              settings: {
                bundle_discount: 15,
                urgency_message: 'Complete your set!'
              },
              content: {
                title: 'Complete Your Set',
                message: `Add ${opp.secondary} to your ${opp.primary} for 15% off`,
                cta_text: 'Add to Cart'
              },
              rules: [{
                primary_product: opp.primary_id,
                secondary_product: opp.secondary_id,
                discount: 15
              }]
            }
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate insights
   */
  generateInsights(analysis) {
    const insights = [];

    // Product insights
    if (analysis.products.low_inventory.length > 0) {
      insights.push({
        type: 'inventory',
        title: 'Low Inventory Alert',
        message: `${analysis.products.low_inventory.length} products have low inventory and may need clearance campaigns`,
        priority: 'high',
        action: 'Create clearance campaign'
      });
    }

    // Performance insights
    if (analysis.performance.conversion_rate < 0.05) {
      insights.push({
        type: 'performance',
        title: 'Low Conversion Rate',
        message: `Current conversion rate of ${(analysis.performance.conversion_rate * 100).toFixed(1)}% is below industry average`,
        priority: 'medium',
        action: 'Review and optimize rules'
      });
    }

    // Revenue insights
    if (analysis.performance.revenue_trend === 'increasing') {
      insights.push({
        type: 'revenue',
        title: 'Revenue Growth',
        message: 'Revenue is trending upward - consider expanding successful campaigns',
        priority: 'low',
        action: 'Scale successful campaigns'
      });
    }

    return insights;
  }

  /**
   * Set priorities for recommendations
   */
  setPriorities(recommendations) {
    const priorities = [];

    // High priority: Low inventory clearance
    const clearanceCampaigns = recommendations.campaigns.filter(c => c.type === 'clearance');
    priorities.push(...clearanceCampaigns);

    // High priority: High-impact rules
    const highImpactRules = recommendations.rules.filter(r => r.expected_impact === 'high');
    priorities.push(...highImpactRules);

    // Medium priority: Performance insights
    const performanceInsights = recommendations.insights.filter(i => i.type === 'performance');
    priorities.push(...performanceInsights);

    return priorities;
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(suggestions) {
    return {
      summary: {
        total_recommendations: suggestions.rules.length + suggestions.campaigns.length + suggestions.insights.length,
        high_priority: suggestions.priorities.filter(p => p.priority === 'high').length,
        expected_impact: this.calculateExpectedImpact(suggestions)
      },
      recommendations: suggestions,
      formatted_output: this.createFormattedOutput(suggestions)
    };
  }

  /**
   * Create formatted output for terminal
   */
  createFormattedOutput(suggestions) {
    let output = '\n🎯 CORAL SUGGESTION AGENT - RECOMMENDATIONS\n';
    output += '=' .repeat(50) + '\n\n';

    // Summary
    output += `📊 SUMMARY\n`;
    output += `Total Recommendations: ${suggestions.rules.length + suggestions.campaigns.length + suggestions.insights.length}\n`;
    output += `High Priority: ${suggestions.priorities.filter(p => p.priority === 'high').length}\n`;
    output += `Expected Impact: ${this.calculateExpectedImpact(suggestions)}\n\n`;

    // High Priority Items
    if (suggestions.priorities.length > 0) {
      output += `🔥 HIGH PRIORITY ACTIONS\n`;
      suggestions.priorities.slice(0, 3).forEach((item, index) => {
        output += `${index + 1}. ${item.name}\n`;
        output += `   ${item.description}\n`;
        output += `   Impact: ${item.expected_impact}\n\n`;
      });
    }

    // Rule Suggestions
    if (suggestions.rules.length > 0) {
      output += `📋 RULE SUGGESTIONS (${suggestions.rules.length})\n`;
      suggestions.rules.forEach((rule, index) => {
        output += `${index + 1}. ${rule.name}\n`;
        output += `   ${rule.description}\n`;
        output += `   Priority: ${rule.priority} | Impact: ${rule.expected_impact}\n\n`;
      });
    }

    // Campaign Suggestions
    if (suggestions.campaigns.length > 0) {
      output += `📈 CAMPAIGN SUGGESTIONS (${suggestions.campaigns.length})\n`;
      suggestions.campaigns.forEach((campaign, index) => {
        output += `${index + 1}. ${campaign.name}\n`;
        output += `   ${campaign.description}\n`;
        output += `   Priority: ${campaign.priority} | Impact: ${campaign.expected_impact}\n\n`;
      });
    }

    // Insights
    if (suggestions.insights.length > 0) {
      output += `💡 INSIGHTS (${suggestions.insights.length})\n`;
      suggestions.insights.forEach((insight, index) => {
        output += `${index + 1}. ${insight.title}\n`;
        output += `   ${insight.message}\n`;
        output += `   Action: ${insight.action}\n\n`;
      });
    }

    return output;
  }

  // Helper methods
  groupByCategory(products) {
    const groups = {};
    products.forEach(product => {
      const category = product.product_type || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
    });
    return groups;
  }

  groupByType(items, typeField) {
    const groups = {};
    items.forEach(item => {
      const type = item[typeField] || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(item);
    });
    return groups;
  }

  analyzePriceRanges(products) {
    const prices = products.map(p => p.price).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 0, average: 0 };
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  }

  identifyTrendingProducts(products, performanceData) {
    if (!performanceData || Object.keys(performanceData).length === 0) {
      // Fallback to basic analysis if no performance data
      return products.slice(0, 3);
    }

    // Sort products by sales performance
    const productsWithPerformance = products
      .map(product => {
        const perf = performanceData[product.id];
        return {
          ...product,
          sales_count: perf ? perf.sales_count || 0 : 0,
          revenue: perf ? perf.revenue || 0 : 0,
          growth_rate: perf ? perf.growth_rate || 0 : 0
        };
      })
      .sort((a, b) => {
        // Prioritize by growth rate, then by sales count
        if (a.growth_rate !== b.growth_rate) {
          return b.growth_rate - a.growth_rate;
        }
        return b.sales_count - a.sales_count;
      });

    return productsWithPerformance.slice(0, 5);
  }

  analyzeCampaignPerformance(campaigns) {
    // Placeholder - would analyze performance data
    return { average_conversion: 0.05 };
  }

  analyzeRulePerformance(rules) {
    // Placeholder - would analyze performance data
    return { average_conversion: 0.03 };
  }

  identifyCampaignOpportunities(campaigns) {
    // Placeholder - would identify gaps
    return [];
  }

  identifyRuleGaps(rules) {
    // Placeholder - would identify gaps
    return [];
  }

  findBundleOpportunities(products) {
    // Placeholder - would analyze product relationships
    return [];
  }

  findClearanceOpportunities(products) {
    return products
      .filter(p => p.inventory_level < 10)
      .map(p => ({
        type: 'clearance',
        product: p,
        reason: 'Low inventory'
      }));
  }

  findCrossSellOpportunities(products) {
    // Placeholder - would analyze product relationships
    return [];
  }

  calculateExpectedImpact(suggestions) {
    const impacts = ['low', 'medium', 'high'];
    const counts = { low: 0, medium: 0, high: 0 };
    
    [...suggestions.rules, ...suggestions.campaigns].forEach(item => {
      counts[item.expected_impact]++;
    });
    
    if (counts.high > 0) return 'High';
    if (counts.medium > 0) return 'Medium';
    return 'Low';
  }

  // Enhanced Analysis Helper Methods
  analyzeProductPerformance(products, performanceData) {
    const metrics = {
      top_sellers: [],
      slow_movers: [],
      high_margin: [],
      low_margin: [],
      seasonal_trends: {}
    };

    products.forEach(product => {
      const perf = performanceData[product.id];
      if (perf) {
        if (perf.sales_count > 10) metrics.top_sellers.push(product);
        if (perf.sales_count < 3) metrics.slow_movers.push(product);
        if (perf.margin > 0.4) metrics.high_margin.push(product);
        if (perf.margin < 0.2) metrics.low_margin.push(product);
      }
    });

    return metrics;
  }

  analyzeInventoryInsights(products, inventoryData) {
    const insights = {
      low_stock: [],
      overstocked: [],
      reorder_suggestions: [],
      clearance_candidates: []
    };

    products.forEach(product => {
      const inventory = inventoryData[product.id];
      const stockLevel = inventory?.quantity || product.inventory_level || 0;
      
      if (stockLevel < 5) insights.low_stock.push(product);
      if (stockLevel > 50) insights.overstocked.push(product);
      if (stockLevel < 10 && product.price > 50) insights.reorder_suggestions.push(product);
      if (stockLevel > 30 && product.price < 20) insights.clearance_candidates.push(product);
    });

    return insights;
  }

  analyzeProductRelationships(products) {
    const relationships = {
      complementary_products: [],
      upgrade_paths: [],
      bundle_candidates: []
    };

    // Analyze product categories and prices for relationships
    const categories = this.groupByCategory(products);
    
    Object.entries(categories).forEach(([category, categoryProducts]) => {
      if (categoryProducts.length > 1) {
        // Find complementary products within same category
        categoryProducts.forEach(product => {
          const complementary = categoryProducts.filter(p => 
            p.id !== product.id && 
            Math.abs(p.price - product.price) < product.price * 0.3
          );
          if (complementary.length > 0) {
            relationships.complementary_products.push({
              primary: product,
              complementary: complementary
            });
          }
        });

        // Find upgrade paths (higher priced alternatives)
        const sortedByPrice = categoryProducts.sort((a, b) => a.price - b.price);
        for (let i = 0; i < sortedByPrice.length - 1; i++) {
          const current = sortedByPrice[i];
          const upgrade = sortedByPrice[i + 1];
          if (upgrade.price > current.price * 1.5) {
            relationships.upgrade_paths.push({
              from: current,
              to: upgrade,
              price_difference: upgrade.price - current.price
            });
          }
        }
      }
    });

    return relationships;
  }

  calculateRevenuePotential(products, performanceData) {
    let totalPotential = 0;
    const productPotential = {};

    products.forEach(product => {
      const perf = performanceData[product.id];
      const currentRevenue = perf ? perf.revenue || 0 : 0;
      const potentialRevenue = product.price * (perf ? perf.sales_count * 1.5 : 10);
      const potential = potentialRevenue - currentRevenue;
      
      productPotential[product.id] = {
        current_revenue: currentRevenue,
        potential_revenue: potentialRevenue,
        potential_increase: potential
      };
      
      totalPotential += potential;
    });

    return {
      total_potential: totalPotential,
      product_breakdown: productPotential
    };
  }

  analyzeCustomerBehavior(customerData) {
    const behavior = {
      purchase_frequency: {},
      price_sensitivity: {},
      category_preferences: {},
      seasonal_patterns: {}
    };

    // Analyze purchase patterns
    const purchaseCounts = {};
    const totalSpent = {};
    
    customerData.forEach(record => {
      const customerId = record.customer_id;
      purchaseCounts[customerId] = (purchaseCounts[customerId] || 0) + 1;
      totalSpent[customerId] = (totalSpent[customerId] || 0) + (record.amount || 0);
    });

    behavior.purchase_frequency = {
      average_purchases: Object.values(purchaseCounts).reduce((a, b) => a + b, 0) / Object.keys(purchaseCounts).length,
      high_frequency_customers: Object.keys(purchaseCounts).filter(id => purchaseCounts[id] > 3).length,
      low_frequency_customers: Object.keys(purchaseCounts).filter(id => purchaseCounts[id] === 1).length
    };

    behavior.price_sensitivity = {
      average_order_value: Object.values(totalSpent).reduce((a, b) => a + b, 0) / Object.keys(totalSpent).length,
      high_value_customers: Object.keys(totalSpent).filter(id => totalSpent[id] > 200).length
    };

    return behavior;
  }

  analyzeSalesPatterns(salesData) {
    const patterns = {
      daily_trends: {},
      weekly_trends: {},
      monthly_trends: {},
      product_performance: {}
    };

    // Group sales by date
    const salesByDate = {};
    salesData.forEach(sale => {
      const date = new Date(sale.created_at).toDateString();
      if (!salesByDate[date]) salesByDate[date] = [];
      salesByDate[date].push(sale);
    });

    // Calculate daily averages
    const dailyTotals = Object.values(salesByDate).map(sales => 
      sales.reduce((sum, sale) => sum + (sale.amount || 0), 0)
    );
    
    patterns.daily_trends = {
      average_daily_sales: dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length,
      best_day: Math.max(...dailyTotals),
      worst_day: Math.min(...dailyTotals)
    };

    return patterns;
  }

  calculateRevenueInsights(salesData) {
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const averageOrderValue = totalRevenue / salesData.length;
    
    return {
      total_revenue: totalRevenue,
      average_order_value: averageOrderValue,
      revenue_growth_rate: 0.15, // Placeholder - would calculate from historical data
      top_revenue_products: this.identifyTopRevenueProducts(salesData)
    };
  }

  calculateAverageOrderValue(orderData) {
    const totalValue = orderData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    return orderData.length > 0 ? totalValue / orderData.length : 0;
  }

  calculateConversionRate(orderData) {
    // This would need session/visit data to calculate properly
    // For now, return a placeholder based on order count
    return orderData.length > 10 ? 0.05 : 0.03;
  }

  identifyTopProducts(orderData) {
    const productSales = {};
    
    orderData.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
        });
      }
    });

    return Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId, sales]) => ({ product_id: productId, sales_count: sales }));
  }

  identifyUnderperformingProducts(orderData) {
    const productSales = {};
    
    orderData.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
        });
      }
    });

    return Object.entries(productSales)
      .filter(([,sales]) => sales < 2)
      .map(([productId, sales]) => ({ product_id: productId, sales_count: sales }));
  }

  identifyTopRevenueProducts(salesData) {
    const productRevenue = {};
    
    salesData.forEach(sale => {
      productRevenue[sale.product_id] = (productRevenue[sale.product_id] || 0) + (sale.amount || 0);
    });

    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId, revenue]) => ({ product_id: productId, revenue: revenue }));
  }
}

// CLI Interface
async function main() {
  console.log('🟢 Script started');
  
  const agent = new CoralSuggestionAgent();
  
  // Get user ID from command line or use default
  const userId = process.argv[2] || config.test_user_id;
  
  console.log('🔍 User ID:', userId);
  console.log('🔍 Config:', JSON.stringify(config, null, 2));
  
  if (!userId) {
    console.error('❌ Please provide a user ID as an argument or set TEST_USER_ID in .env.local');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting Coral Suggestion Agent...\n');
    
    const suggestions = await agent.generateSuggestions(userId);
    
    // Display formatted output
    console.log(suggestions.formatted_output);
    
    // Display JSON for programmatic use
    console.log('\n📄 JSON OUTPUT (for API integration):');
    console.log(JSON.stringify(suggestions, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  console.log('🟢 Script finished');
}

main(); 