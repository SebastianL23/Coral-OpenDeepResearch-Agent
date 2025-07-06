# Upsell Engine Rules & Campaign System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Rules System](#rules-system)
3. [Campaign System](#campaign-system)
4. [Integration Between Systems](#integration-between-systems)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Evaluation Engine](#evaluation-engine)
8. [Assistant Agent Guidelines](#assistant-agent-guidelines)

---

## System Overview

The Upsell Engine consists of two complementary systems:

1. **Rules System**: Persistent, reusable logic for triggering upsell offers based on cart contents, customer behavior, and time-based conditions
2. **Campaign System**: Time-bound marketing initiatives that can leverage existing rules or create special promotional offers

Both systems work together through the evaluation engine to determine the best upsell offer to show customers in real-time.

---

## Rules System

### Core Concepts

**Upsell Rules** are persistent, reusable logic that determine when and how to show upsell recommendations. They operate continuously and can be enhanced or overridden by campaigns.

### Rule Types

#### 1. Category-Based Rules
- **Trigger**: When cart contains products from specific categories
- **Conditions**: 
  - `category`: Product category name
  - `category_operator`: 'contains', 'equals', 'not_contains'
- **Use Case**: "When someone buys electronics, suggest accessories"

#### 2. Cart Value Rules
- **Trigger**: Based on total cart value
- **Conditions**:
  - `cart_value_operator`: 'greater_than', 'less_than', 'equals', 'between'
  - `cart_value_min`: Minimum cart value
  - `cart_value_max`: Maximum cart value
- **Use Case**: "When cart is over $100, suggest premium products"

#### 3. Time-Based Rules
- **Trigger**: Based on customer's time on site or specific pages
- **Conditions**:
  - `time_on_site_min/max`: Total time on site (seconds)
  - `active_time_on_site_min/max`: Active engagement time
  - `page_specific_time`: Time spent on specific pages
- **Use Case**: "After 2 minutes on product page, suggest related items"

### Rule Structure

```typescript
interface UpsellRule {
  id: string
  name: string
  description?: string
  trigger_type: 'category' | 'cart_value' | 'time_based'
  trigger_conditions: TriggerConditions
  target_products: string[] // Product IDs to recommend
  ai_copy_id?: string
  template?: {
    id: string
    name: string
    content: string
    content_type: string
    tone: string
    product_type: string | null
  }
  display_type: 'popup' | 'cart' | 'checkout'
  display_settings: Record<string, any>
  priority: number
  status: 'active' | 'inactive' | 'draft'
  impressions: number
  conversions: number
  conversion_rate: number
  revenue: number
  created_at: string
  updated_at: string
}
```

### Trigger Conditions

```typescript
interface TriggerConditions {
  // Category-based triggers
  category?: string
  category_operator?: 'contains' | 'equals' | 'not_contains'
  
  // Cart value triggers
  cart_value_operator?: 'greater_than' | 'less_than' | 'equals' | 'between'
  cart_value?: number
  cart_value_min?: number
  cart_value_max?: number
  
  // Product-specific triggers
  product_id?: string
  product_category?: string
  product_price_operator?: 'greater_than' | 'less_than' | 'equals'
  product_price?: number
  
  // Time-based triggers
  time_on_site_operator?: 'greater_than' | 'less_than' | 'equals' | 'between'
  time_on_site_min?: number // seconds
  time_on_site_max?: number // seconds
  active_time_on_site_min?: number // seconds
  active_time_on_site_max?: number // seconds
  page_specific_time?: {
    page_path: string
    min_time: number
    max_time?: number
  }
}
```

### Rule Priority System

- **Priority 1-20**: Low priority rules
- **Priority 21-50**: Medium priority rules  
- **Priority 51-80**: High priority rules
- **Priority 81-100**: Critical priority rules

Higher priority rules are evaluated first and can override lower priority rules.

---

## Campaign System

### Core Concepts

**Campaigns** are time-bound marketing initiatives that can:
- Create special promotional offers
- Override existing rules for specific periods
- Target specific customer segments
- Apply special pricing rules
- Track performance against business goals

### Campaign Types

#### 1. Bundle Campaigns
- **Purpose**: Promote product bundles with special pricing
- **Use Case**: "Buy 2, Get 1 Free" offers

#### 2. Cross-Sell Campaigns
- **Purpose**: Recommend complementary products
- **Use Case**: "Customers who bought X also bought Y"

#### 3. Seasonal Campaigns
- **Purpose**: Time-sensitive seasonal promotions
- **Use Case**: Holiday sales, back-to-school promotions

#### 4. Clearance Campaigns
- **Purpose**: Clear slow-moving inventory
- **Use Case**: End-of-season sales, overstock clearance

#### 5. Holiday Campaigns
- **Purpose**: Special holiday-themed promotions
- **Use Case**: Black Friday, Cyber Monday, Christmas sales

#### 6. Winback Campaigns
- **Purpose**: Re-engage inactive customers
- **Use Case**: "We miss you" offers for customers who haven't purchased recently

#### 7. New Product Campaigns
- **Purpose**: Launch new products with introductory pricing
- **Use Case**: "New arrival" promotions with special pricing

### Campaign Structure

```typescript
interface Campaign {
  id: string
  name: string
  description?: string
  campaign_type: 'bundle' | 'upgrade' | 'cross-sell' | 'seasonal' | 'retention' | 'launch' | 'clearance' | 'holiday' | 'winback' | 'new_product'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled'
  
  // Campaign Basics - Time-bound marketing initiative
  start_date: string
  end_date?: string
  
  // Business Goals & Performance Targets
  business_goals: {
    target_metric: 'aov' | 'conversion_rate' | 'revenue' | 'units_sold' | 'customer_acquisition'
    target_value: number
    current_value: number
    goal_description?: string
    kpi_tracking?: boolean
  }
  
  target_audience: TargetAudience
  
  // Product Configuration - What to promote
  trigger_products: string[] // Products that trigger the campaign
  upsell_products: string[] // Products to recommend
  pricing_rules: PricingRule[]
  
  // Rules Integration - Leverages existing rule logic
  rule_overrides: RuleOverride[]
  display_settings: DisplaySettings
  
  // Content & Design - Marketing creative
  ai_copy_id?: string
  template_id?: string
  design_settings: DesignSettings
  urgency_settings: UrgencySettings
  
  // Performance Tracking - Campaign-specific metrics
  impressions: number
  conversions: number
  conversion_rate: number
  revenue: number
  roi: number
  ab_test_results?: ABTestResults
  
  // Marketing Context
  marketing_calendar_event?: string
  related_campaigns?: string[]
  budget?: number
  spend?: number
  
  // Campaign Priority & Override Logic
  priority_level: 'low' | 'medium' | 'high' | 'urgent'
  override_existing_rules: boolean
  campaign_priority: number // For conflict resolution
  
  // A/B Testing
  ab_testing_enabled: boolean
  ab_test_variants?: {
    variant_a: CampaignVariant
    variant_b: CampaignVariant
  }
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}
```

### Key Campaign Components

#### Business Goals
```typescript
interface BusinessGoals {
  target_metric: 'aov' | 'conversion_rate' | 'revenue' | 'units_sold' | 'customer_acquisition'
  target_value: number
  current_value: number
  goal_description?: string
  kpi_tracking?: boolean
}
```

#### Target Audience
```typescript
interface TargetAudience {
  customer_segments: string[]
  location?: string[]
  device_types?: string[]
  new_customers_only?: boolean
  repeat_customers_only?: boolean
  vip_customers_only?: boolean
  purchase_history?: {
    min_orders?: number
    max_orders?: number
    categories?: string[]
    spend_range?: { min: number; max: number }
  }
  behavioral_cohorts?: string[]
}
```

#### Pricing Rules
```typescript
interface PricingRule {
  id?: string
  type: 'percentage_discount' | 'fixed_discount' | 'bundle_pricing' | 'upgrade_pricing' | 'volume_discount' | 'display_only'
  value: number
  min_quantity?: number
  max_quantity?: number
  applies_to: string[] // Product IDs
  conditions?: {
    cart_value_min?: number
    cart_value_max?: number
    customer_type?: string[]
    campaign_message?: string
  }
}
```

#### Display Settings
```typescript
interface DisplaySettings {
  display_type: 'popup' | 'cart' | 'checkout' | 'modal' | 'sidebar' | 'inline' | 'cart_drawer' | 'checkout_bump'
  trigger_timing: 'immediate' | 'after_delay' | 'on_scroll' | 'on_exit_intent' | 'on_cart_add'
  delay_seconds?: number
  scroll_percentage?: number
  max_display_count?: number
  display_frequency: 'once' | 'every_visit' | 'daily' | 'weekly' | 'campaign_duration'
  override_existing_rules?: boolean
}
```

#### Urgency Settings
```typescript
interface UrgencySettings {
  countdown_timer?: boolean
  limited_quantity?: boolean
  limited_time?: boolean
  scarcity_messaging?: string
  urgency_copy?: string
}
```

---

## Integration Between Systems

### Rule Overrides

Campaigns can interact with existing rules through **Rule Overrides**:

```typescript
interface RuleOverride {
  id?: string
  rule_id: string
  override_type: 'enhance' | 'replace' | 'suppress'
  enhanced_settings?: {
    priority_boost?: number
    custom_messaging?: string
    special_pricing?: PricingRule
  }
}
```

#### Override Types

1. **Enhance**: Boost rule priority and add special messaging/pricing
2. **Replace**: Use campaign content instead of rule content
3. **Suppress**: Temporarily disable the rule during campaign period

### Priority Resolution

When both rules and campaigns match, the system uses this priority order:

1. **Campaign Priority**: Campaigns with `override_existing_rules: true`
2. **Rule Priority**: Higher priority rules (1-100 scale)
3. **Revenue Estimation**: Higher estimated revenue wins ties

### Evaluation Flow

1. **Cart Analysis**: Analyze current cart contents
2. **Time Context**: Get customer's time on site and current page
3. **Campaign Matching**: Find active campaigns that match trigger products
4. **Rule Matching**: Find active rules that match conditions
5. **Priority Resolution**: Apply rule overrides and determine winner
6. **Offer Creation**: Generate final upsell offer with content and pricing

---

## Database Schema

### Campaigns Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('bundle', 'upgrade', 'cross-sell', 'seasonal', 'retention', 'launch', 'clearance', 'holiday', 'winback', 'new_product')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  business_goals JSONB DEFAULT '{}',
  target_audience JSONB DEFAULT '{}',
  trigger_products TEXT[] DEFAULT '{}',
  upsell_products TEXT[] DEFAULT '{}',
  pricing_rules JSONB DEFAULT '[]',
  rule_overrides JSONB DEFAULT '[]',
  display_settings JSONB DEFAULT '{}',
  ai_copy_id UUID REFERENCES ai_content_templates(id),
  template_id UUID REFERENCES templates(id),
  design_settings JSONB DEFAULT '{}',
  urgency_settings JSONB DEFAULT '{}',
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  roi DECIMAL(5,2) DEFAULT 0,
  ab_test_results JSONB,
  marketing_calendar_event TEXT,
  related_campaigns TEXT[] DEFAULT '{}',
  budget DECIMAL(10,2),
  spend DECIMAL(10,2) DEFAULT 0,
  priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  override_existing_rules BOOLEAN DEFAULT FALSE,
  campaign_priority INTEGER DEFAULT 0,
  ab_testing_enabled BOOLEAN DEFAULT FALSE,
  ab_test_variants JSONB,
  pricing_active BOOLEAN DEFAULT FALSE,
  pricing_applied_at TIMESTAMP WITH TIME ZONE,
  pricing_rolled_back_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Upsell Rules Table
```sql
CREATE TABLE upsell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('category', 'cart_value', 'time_based')),
  trigger_conditions JSONB NOT NULL,
  target_products TEXT[] DEFAULT '{}',
  ai_copy_id UUID REFERENCES ai_content_templates(id),
  display_type TEXT DEFAULT 'popup' CHECK (display_type IN ('popup', 'cart', 'checkout')),
  display_settings JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Performance Tracking Tables
```sql
-- Rule performance tracking
CREATE TABLE rule_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES upsell_rules(id) ON DELETE CASCADE,
  session_id TEXT,
  order_id TEXT,
  customer_id TEXT,
  action TEXT CHECK (action IN ('impression', 'conversion', 'dismiss')),
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign performance tracking
CREATE TABLE campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id TEXT,
  order_id TEXT,
  customer_id TEXT,
  action TEXT CHECK (action IN ('impression', 'conversion', 'dismiss')),
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session time tracking for time-based rules
CREATE TABLE session_time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  total_time_on_site INTEGER DEFAULT 0,
  active_time_on_site INTEGER DEFAULT 0,
  current_page TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Endpoints

### Campaign Management

#### `GET /api/campaigns`
- **Description**: Get user's campaigns
- **Authentication**: Required
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by status
- **Response**: Paginated campaigns array

#### `POST /api/campaigns`
- **Description**: Create new campaign
- **Authentication**: Required
- **Body**: Campaign data
- **Response**: Created campaign

#### `GET /api/campaigns/[id]`
- **Description**: Get specific campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Campaign details

#### `PUT /api/campaigns/[id]`
- **Description**: Update campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Body**: Campaign update data
- **Response**: Updated campaign

#### `DELETE /api/campaigns/[id]`
- **Description**: Delete campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Success message

#### `POST /api/campaigns/[id]/activate`
- **Description**: Activate campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Updated campaign

#### `POST /api/campaigns/[id]/pause`
- **Description**: Pause campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Updated campaign

### Rules Management

#### `GET /api/rules`
- **Description**: Get user's upsell rules
- **Authentication**: Required
- **Response**: Array of upsell rules

#### `POST /api/rules`
- **Description**: Create new upsell rule
- **Authentication**: Required
- **Body**: Rule data
- **Response**: Created rule

#### `GET /api/rules/[id]`
- **Description**: Get specific rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Response**: Rule details

#### `PUT /api/rules/[id]`
- **Description**: Update rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Body**: Rule update data
- **Response**: Updated rule

#### `DELETE /api/rules/[id]`
- **Description**: Delete rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Response**: Success message

### Evaluation Engine

#### `POST /api/evaluate-upsells`
- **Description**: Evaluate upsell offers for current cart
- **Authentication**: Required
- **Body**: 
  ```typescript
  {
    cartItems: CartItem[]
    sessionId: string
    shopDomain: string
    customerId?: string
    timeOnSite?: number
    currentPage?: string
  }
  ```
- **Response**: Best upsell offer or null

---

## Evaluation Engine

### Core Logic

The evaluation engine determines the best upsell offer by:

1. **Fetching Active Rules & Campaigns**
   - Get all active rules ordered by priority
   - Get all active campaigns within date range
   - Apply rule overrides from campaigns

2. **Evaluating Conditions**
   - **Category Rules**: Check if cart contains products from target category
   - **Cart Value Rules**: Compare cart total against min/max thresholds
   - **Time Rules**: Check time on site and page-specific time
   - **Campaign Rules**: Check trigger products and target audience

3. **Priority Resolution**
   - Campaigns with `override_existing_rules: true` get highest priority
   - Rules are sorted by priority (1-100 scale)
   - Ties broken by estimated revenue

4. **Offer Creation**
   - Generate content using AI templates or custom content
   - Apply pricing rules and discounts
   - Set display settings and urgency messaging

### Evaluation Flow

```typescript
async function evaluateUpsells(cartItems, sessionId, timeContext) {
  // 1. Get active campaigns and rules
  const activeCampaigns = await getActiveCampaigns()
  const activeRules = await getActiveRules()
  
  // 2. Evaluate campaigns
  const matchingCampaigns = evaluateCampaigns(activeCampaigns, cartItems, timeContext)
  
  // 3. Evaluate rules
  const matchingRules = evaluateRules(activeRules, cartItems, timeContext)
  
  // 4. Apply rule overrides
  const overriddenRules = applyRuleOverrides(matchingRules, matchingCampaigns)
  
  // 5. Select best offer
  const bestOffer = selectBestUpsell(matchingCampaigns, overriddenRules, cartItems)
  
  // 6. Track evaluation
  await trackUpsellEvaluation(sessionId, cartItems, bestOffer)
  
  return bestOffer
}
```

---

## Assistant Agent Guidelines

### Creating Rules

When helping users create rules, consider:

1. **Rule Type Selection**
   - **Category Rules**: Best for product relationships and cross-selling
   - **Cart Value Rules**: Best for AOV optimization and premium product promotion
   - **Time Rules**: Best for engagement optimization and reducing cart abandonment

2. **Priority Setting**
   - **Low (1-20)**: General recommendations, broad categories
   - **Medium (21-50)**: Specific product relationships, moderate cart values
   - **High (51-80)**: Premium products, high-value cart scenarios
   - **Critical (81-100)**: VIP customers, exclusive offers, high-margin products

3. **Target Product Selection**
   - Choose products with good margins
   - Consider product relationships and complementarity
   - Ensure inventory availability
   - Match customer intent and cart contents

4. **Display Settings**
   - **Popup**: High visibility, good for new customers
   - **Cart**: Contextual, good for existing cart modifications
   - **Checkout**: High conversion, good for last-minute additions

### Creating Campaigns

When helping users create campaigns, consider:

1. **Campaign Type Selection**
   - **Bundle**: For product sets and volume discounts
   - **Cross-Sell**: For complementary product promotion
   - **Seasonal**: For time-sensitive promotions
   - **Clearance**: For inventory management
   - **Holiday**: For special event promotions
   - **Winback**: For customer retention
   - **New Product**: For product launches

2. **Business Goals**
   - Set realistic targets based on historical data
   - Choose appropriate metrics (revenue, AOV, conversion rate)
   - Enable KPI tracking for performance monitoring

3. **Target Audience**
   - Segment customers by behavior and purchase history
   - Consider new vs. returning customers
   - Target specific customer segments for personalized offers

4. **Pricing Strategy**
   - **Percentage Discount**: Good for margin-based promotions
   - **Fixed Discount**: Good for specific dollar amount promotions
   - **Bundle Pricing**: Good for volume-based offers
   - **Upgrade Pricing**: Good for premium product promotion
   - **Volume Discount**: Good for quantity-based promotions

5. **Rule Integration**
   - **Enhance**: Boost existing rules with special pricing/messaging
   - **Replace**: Use campaign content instead of rule content
   - **Suppress**: Temporarily disable rules during campaign

6. **Urgency Settings**
   - Use countdown timers for time-sensitive offers
   - Implement limited quantity messaging for scarcity
   - Create urgency copy that motivates action

### Data-Driven Recommendations

When making recommendations, consider:

1. **Historical Performance**
   - Rule conversion rates and revenue
   - Campaign performance metrics
   - Product performance data

2. **Customer Behavior**
   - Cart abandonment patterns
   - Time on site data
   - Purchase frequency and value

3. **Seasonal Trends**
   - Holiday performance data
   - Seasonal product demand
   - Marketing calendar events

4. **Inventory Status**
   - Product availability
   - Slow-moving inventory
   - New product launches

### Best Practices

1. **Rule Creation**
   - Start with broad rules and refine based on performance
   - Use A/B testing to optimize rule parameters
   - Monitor and adjust priorities based on performance
   - Ensure rules don't conflict with each other

2. **Campaign Creation**
   - Set clear, measurable business goals
   - Use templates for common campaign types
   - Test campaigns before full launch
   - Monitor performance and adjust in real-time

3. **Integration**
   - Use rule overrides strategically
   - Don't suppress too many rules at once
   - Ensure campaign messaging aligns with rule logic
   - Test rule-campaign interactions

4. **Performance Optimization**
   - Track conversion rates and revenue impact
   - Use data to refine targeting and messaging
   - Implement A/B testing for continuous improvement
   - Monitor customer feedback and satisfaction

### Common Use Cases

1. **New Store Setup**
   - Create basic category-based rules
   - Set up cart value rules for AOV optimization
   - Implement time-based rules for engagement

2. **Holiday Season**
   - Create seasonal campaigns with special pricing
   - Enhance existing rules with holiday messaging
   - Implement urgency settings for time-sensitive offers

3. **Inventory Clearance**
   - Create clearance campaigns for slow-moving products
   - Use aggressive pricing rules
   - Implement scarcity messaging

4. **Customer Retention**
   - Create winback campaigns for inactive customers
   - Use personalized messaging and offers
   - Implement VIP customer rules

5. **Product Launches**
   - Create new product campaigns with introductory pricing
   - Use cross-sell rules to promote related products
   - Implement urgency for limited-time offers

This documentation provides the foundation for creating an intelligent assistant agent that can help users build effective rules and campaigns based on their data and business goals.