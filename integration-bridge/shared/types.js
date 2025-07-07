/**
 * Shared TypeScript definitions for Coral + UpsellEngine Integration
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * @typedef {Object} UserProfile
 * @property {string} id - User UUID
 * @property {string} email - User email
 * @property {string} [full_name] - User's full name
 * @property {string} [company_name] - Company name
 * @property {string} plan_type - 'free' | 'starter' | 'pro' | 'enterprise'
 * @property {string} plan_status - 'active' | 'cancelled' | 'suspended' | 'trial'
 * @property {string[]} roles - User roles
 */

/**
 * @typedef {Object} Product
 * @property {string} id - Product UUID
 * @property {string} user_id - Owner user ID
 * @property {string} title - Product title
 * @property {string} [description] - Product description
 * @property {number} [price] - Product price
 * @property {number} [compare_at_price] - Compare at price
 * @property {string} [image_url] - Product image URL
 * @property {string} [product_type] - Product type/category
 * @property {string[]} tags - Product tags
 * @property {string} status - 'active' | 'inactive' | 'archived'
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Order UUID
 * @property {string} user_id - Store owner ID
 * @property {string} customer_id - Customer ID
 * @property {number} total_price - Order total
 * @property {string} currency - Currency code
 * @property {string} status - Order status
 * @property {OrderItem[]} items - Order items
 * @property {string} created_at - Order creation timestamp
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} product_id - Product ID
 * @property {string} title - Product title
 * @property {number} quantity - Quantity ordered
 * @property {number} price - Unit price
 * @property {number} total_price - Total price for this item
 */

// ============================================================================
// CORAL AGENT TYPES
// ============================================================================

/**
 * @typedef {Object} CoralInsight
 * @property {string} id - Insight UUID
 * @property {string} type - Insight type: 'bundle_opportunity' | 'trend_analysis' | 'customer_segment' | 'performance_insight'
 * @property {string} title - Insight title
 * @property {string} description - Detailed description
 * @property {Object} logic - Structured logic for UpsellEngine
 * @property {Object} data - Supporting data and metrics
 * @property {string[]} sources - Data sources used
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} BundleOpportunity
 * @property {string} primary_product_id - Primary product ID
 * @property {string} secondary_product_id - Secondary product ID
 * @property {number} lift_percentage - Expected revenue lift
 * @property {number} frequency - How often they're bought together
 * @property {string} trigger_condition - When to show the bundle
 * @property {number} confidence - Confidence score
 */

/**
 * @typedef {Object} TrendAnalysis
 * @property {string} metric - Metric being analyzed
 * @property {string} trend - 'increasing' | 'decreasing' | 'stable'
 * @property {number} change_percentage - Percentage change
 * @property {string} time_period - Time period analyzed
 * @property {Object[]} data_points - Historical data points
 */

// ============================================================================
// UPSELLENGINE AGENT TYPES
// ============================================================================

/**
 * @typedef {Object} UpsellRule
 * @property {string} id - Rule UUID
 * @property {string} user_id - Owner user ID
 * @property {string} name - Rule name
 * @property {string} description - Rule description
 * @property {string} rule_type - 'product_based' | 'cart_value' | 'customer_segment' | 'time_based'
 * @property {Object} conditions - Rule conditions
 * @property {Object} actions - Rule actions
 * @property {number} priority - Rule priority
 * @property {boolean} is_active - Whether rule is active
 */

/**
 * @typedef {Object} Campaign
 * @property {string} id - Campaign UUID
 * @property {string} user_id - Owner user ID
 * @property {string} name - Campaign name
 * @property {string} description - Campaign description
 * @property {string} status - 'draft' | 'active' | 'paused' | 'archived'
 * @property {string} campaign_type - 'popup' | 'banner' | 'modal' | 'inline'
 * @property {Object} content - Campaign content
 * @property {Object} settings - Campaign settings
 * @property {Object} performance_metrics - Performance data
 */

/**
 * @typedef {Object} Template
 * @property {string} id - Template UUID
 * @property {string} user_id - Owner user ID
 * @property {string} name - Template name
 * @property {string} template_type - 'campaign' | 'rule' | 'content'
 * @property {Object} content - Template content
 * @property {boolean} is_public - Whether template is public
 */

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * @typedef {Object} AgentRequest
 * @property {string} id - Request UUID
 * @property {string} type - Request type
 * @property {string} user_id - Requesting user ID
 * @property {Object} payload - Request payload
 * @property {string} status - 'pending' | 'processing' | 'completed' | 'failed'
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} AgentResponse
 * @property {string} request_id - Original request ID
 * @property {string} agent_id - Responding agent ID
 * @property {Object} data - Response data
 * @property {string} status - 'success' | 'error'
 * @property {string} [error_message] - Error message if failed
 * @property {string} created_at - Response timestamp
 */

/**
 * @typedef {Object} IntegrationWorkflow
 * @property {string} id - Workflow UUID
 * @property {string} name - Workflow name
 * @property {string} description - Workflow description
 * @property {string} trigger_type - 'manual' | 'scheduled' | 'event_based'
 * @property {Object} trigger_config - Trigger configuration
 * @property {Object[]} steps - Workflow steps
 * @property {string} status - 'active' | 'inactive' | 'error'
 * @property {Object} last_execution - Last execution details
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} id - Step UUID
 * @property {string} name - Step name
 * @property {string} agent - Target agent ('coral' | 'upsell')
 * @property {string} action - Action to perform
 * @property {Object} config - Step configuration
 * @property {number} order - Execution order
 * @property {string} [condition] - Conditional execution
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {string} id - Metrics UUID
 * @property {string} rule_id - Associated rule ID
 * @property {string} campaign_id - Associated campaign ID
 * @property {number} impressions - Number of impressions
 * @property {number} clicks - Number of clicks
 * @property {number} conversions - Number of conversions
 * @property {number} revenue - Revenue generated
 * @property {number} conversion_rate - Conversion rate
 * @property {number} revenue_per_impression - Revenue per impression
 * @property {string} time_period - Time period
 * @property {string} created_at - Creation timestamp
 */

// ============================================================================
// API TYPES
// ============================================================================

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether request was successful
 * @property {Object} [data] - Response data
 * @property {string} [error] - Error message
 * @property {string} [code] - Error code
 * @property {string} timestamp - Response timestamp
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {Object[]} data - Response data
 * @property {number} total - Total number of items
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {boolean} has_more - Whether there are more pages
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * @enum {string}
 */
export const InsightTypes = {
  BUNDLE_OPPORTUNITY: 'bundle_opportunity',
  TREND_ANALYSIS: 'trend_analysis',
  CUSTOMER_SEGMENT: 'customer_segment',
  PERFORMANCE_INSIGHT: 'performance_insight',
  INVENTORY_OPTIMIZATION: 'inventory_optimization',
  PRICING_STRATEGY: 'pricing_strategy'
};

/**
 * @enum {string}
 */
export const RuleTypes = {
  PRODUCT_BASED: 'product_based',
  CART_VALUE: 'cart_value',
  CUSTOMER_SEGMENT: 'customer_segment',
  TIME_BASED: 'time_based',
  BEHAVIOR_BASED: 'behavior_based'
};

/**
 * @enum {string}
 */
export const CampaignTypes = {
  POPUP: 'popup',
  BANNER: 'banner',
  MODAL: 'modal',
  INLINE: 'inline',
  SIDEBAR: 'sidebar'
};

/**
 * @enum {string}
 */
export const WorkflowStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  PAUSED: 'paused'
};

/**
 * @enum {string}
 */
export const AgentTypes = {
  CORAL: 'coral',
  UPSELL: 'upsell'
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} url - Database URL
 * @property {string} key - Database key
 * @property {string} [schema] - Database schema
 */

/**
 * @typedef {Object} AgentConfig
 * @property {string} id - Agent ID
 * @property {string} type - Agent type
 * @property {string} url - Agent URL
 * @property {Object} credentials - Agent credentials
 * @property {Object} settings - Agent settings
 */

/**
 * @typedef {Object} IntegrationConfig
 * @property {DatabaseConfig} database - Database configuration
 * @property {AgentConfig[]} agents - Agent configurations
 * @property {Object} workflows - Workflow configurations
 * @property {Object} logging - Logging configuration
 */

export default {
  // Re-export all types for convenience
  InsightTypes,
  RuleTypes,
  CampaignTypes,
  WorkflowStatus,
  AgentTypes
}; 