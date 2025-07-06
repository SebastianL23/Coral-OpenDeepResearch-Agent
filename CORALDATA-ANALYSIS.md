Data Sources for Coral Agent Analysis

The Coral agent should analyze the following data from your backend to provide intelligent suggestions for upsell rules and campaigns:
1. Core Product Data
products table: Product catalog with SKUs, pricing, inventory, categories
shopify_products table: Shopify-synced product data with variants and metadata
Product performance: Sales volume, revenue, inventory turnover
2. Order & Transaction Data
shopify_orders table: Complete order history with line items, customer info, totals
Order patterns: Cart composition, order frequency, seasonal trends
Revenue data: AOV (Average Order Value), total revenue, profit margins
3. Customer Data
shopify_customers table: Customer profiles, purchase history, lifetime value
Customer segments: New vs returning, VIP customers, purchase frequency
Behavioral data: Browsing patterns, cart abandonment, time on site
4. Existing Rules & Campaigns Performance
upsell_rules table: Current rules, their performance metrics (conversions, revenue)
campaigns table: Active campaigns, their goals, performance data
Performance tracking: Conversion rates, ROI, impression data
5. Analytics & Performance Data
upsell_performance table: Detailed upsell event tracking
rule_performance table: Rule-specific performance metrics
campaign_performance table: Campaign-specific performance metrics
session_time_tracking table: Customer engagement data
upsell_events table: Template performance and conversion tracking
6. Content & Template Data
ai_content_templates table: Available content templates and their performance
Template performance: Which templates convert best for different product types
Content effectiveness: Copy performance, tone preferences
7. Integration & Platform Data
integrations table: Connected platforms (Shopify, etc.)
Webhook data: Real-time order and inventory updates
Platform-specific metrics: Shopify analytics, conversion rates
Key Analysis Areas for Coral Agent
Product Analysis
Find products with low inventory that need clearance campaigns
Analyze product relationships and cross-sell opportunities
Identify trending products for new campaigns
Customer Behavior Analysis
Segment customers by purchase patterns and value
Identify cart abandonment patterns
Analyze time-on-site data for engagement optimization
Find customer segments for targeted campaigns
Performance Optimization
Analyze existing rule and campaign performance
Identify underperforming rules that need adjustment
Find successful patterns to replicate
Calculate ROI and conversion rates for different approaches
Seasonal & Trend Analysis
Identify seasonal patterns in sales data
Find trending products for time-sensitive campaigns
Analyze holiday performance for campaign planning
Identify inventory clearance opportunities
Revenue Optimization
Calculate potential revenue impact of suggested rules/campaigns
Identify AOV optimization opportunities
Find products with high upsell potential
Analyze pricing strategies and discount effectiveness
Data-Driven Recommendations Coral Should Make
Rule Suggestions: Based on product relationships, customer behavior, and performance data
Campaign Ideas: Seasonal campaigns, clearance campaigns, new product launches
Pricing Strategies: Optimal discount levels, bundle pricing, volume discounts
Targeting Recommendations: Customer segments, product categories, timing
Content Suggestions: Template selection, messaging, urgency settings
Performance Predictions: Expected conversion rates, revenue impact, ROI estimates
The Coral agent should use this comprehensive dataset to provide actionable, data-driven recommendations that align with the user's business goals and historical performance patterns.