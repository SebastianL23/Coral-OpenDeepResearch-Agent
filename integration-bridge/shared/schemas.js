/**
 * Data validation schemas for Coral + UpsellEngine Integration
 * Using Zod for runtime type validation
 */

import { z } from 'zod';

// ============================================================================
// CORE DATA SCHEMAS
// ============================================================================

/**
 * User Profile Schema
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  plan_type: z.enum(['free', 'starter', 'pro', 'enterprise']),
  plan_status: z.enum(['active', 'cancelled', 'suspended', 'trial']),
  roles: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Product Schema
 */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  compare_at_price: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  product_type: z.string().optional(),
  tags: z.array(z.string()),
  status: z.enum(['active', 'inactive', 'archived']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Order Item Schema
 */
export const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  title: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  total_price: z.number().positive()
});

/**
 * Order Schema
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  total_price: z.number().positive(),
  currency: z.string().length(3),
  status: z.string(),
  items: z.array(OrderItemSchema),
  created_at: z.string().datetime()
});

// ============================================================================
// CORAL AGENT SCHEMAS
// ============================================================================

/**
 * Bundle Opportunity Schema
 */
export const BundleOpportunitySchema = z.object({
  primary_product_id: z.string().uuid(),
  secondary_product_id: z.string().uuid(),
  lift_percentage: z.number().min(0).max(100),
  frequency: z.number().positive(),
  trigger_condition: z.string(),
  confidence: z.number().min(0).max(1)
});

/**
 * Trend Analysis Schema
 */
export const TrendAnalysisSchema = z.object({
  metric: z.string(),
  trend: z.enum(['increasing', 'decreasing', 'stable']),
  change_percentage: z.number(),
  time_period: z.string(),
  data_points: z.array(z.object({
    date: z.string(),
    value: z.number()
  }))
});

/**
 * Coral Insight Schema
 */
export const CoralInsightSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'bundle_opportunity',
    'trend_analysis', 
    'customer_segment',
    'performance_insight',
    'inventory_optimization',
    'pricing_strategy'
  ]),
  title: z.string().min(1).max(255),
  description: z.string(),
  logic: z.object({
    conditions: z.array(z.any()),
    actions: z.array(z.any()),
    priority: z.number().min(0).max(100)
  }),
  data: z.record(z.any()),
  sources: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  created_at: z.string().datetime()
});

/**
 * Coral Analysis Request Schema
 */
export const CoralAnalysisRequestSchema = z.object({
  user_id: z.string().uuid(),
  analysis_type: z.enum([
    'bundle_analysis',
    'trend_analysis',
    'customer_segmentation',
    'performance_review',
    'inventory_analysis',
    'pricing_analysis'
  ]),
  parameters: z.object({
    time_period: z.string().optional(),
    product_ids: z.array(z.string().uuid()).optional(),
    customer_segments: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional()
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

// ============================================================================
// UPSELLENGINE AGENT SCHEMAS
// ============================================================================

/**
 * Upsell Rule Trigger Conditions Schema (Updated for Coral Agent compatibility)
 */
export const RuleTriggerConditionsSchema = z.object({
  // Category-based triggers
  category: z.string().optional(),
  category_operator: z.enum(['contains', 'equals', 'not_contains']).optional(),
  
  // Cart value triggers
  cart_value_operator: z.enum(['greater_than', 'less_than', 'equals', 'between']).optional(),
  cart_value: z.number().positive().optional(),
  cart_value_min: z.number().positive().optional(),
  cart_value_max: z.number().positive().optional(),
  
  // Time-based triggers
  time_on_site_operator: z.enum(['greater_than', 'less_than', 'equals', 'between']).optional(),
  time_on_site_min: z.number().positive().optional(),
  time_on_site_max: z.number().positive().optional(),
  
  // Legacy fields for backward compatibility
  product_ids: z.array(z.string().uuid()).optional(),
  customer_segments: z.array(z.string()).optional(),
  session_count_min: z.number().positive().optional(),
  purchase_history: z.object({
    has_purchased: z.array(z.string().uuid()).optional(),
    has_not_purchased: z.array(z.string().uuid()).optional(),
    purchase_count_min: z.number().positive().optional()
  }).optional()
});

/**
 * Upsell Rule Actions Schema
 */
export const RuleActionsSchema = z.object({
  action_type: z.enum(['show_popup', 'show_banner', 'add_to_cart', 'modify_price']),
  target_products: z.array(z.string().uuid()),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_amount: z.number().positive().optional(),
  message: z.string().optional(),
  template_id: z.string().uuid().optional()
});

/**
 * Upsell Rule Schema (Updated for Coral Agent compatibility)
 */
export const UpsellRuleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  // Support both trigger_type (from Coral) and rule_type (legacy)
  trigger_type: z.enum(['category', 'cart_value', 'time_based', 'product_based', 'customer_segment', 'behavior_based']).optional(),
  rule_type: z.enum(['category', 'cart_value', 'time_based', 'product_based', 'customer_segment', 'behavior_based']).optional(),
  // Support both trigger_conditions (from Coral) and conditions (legacy)
  trigger_conditions: RuleTriggerConditionsSchema.optional(),
  conditions: RuleTriggerConditionsSchema.optional(),
  // Support both target_products (from Coral) and actions (legacy)
  target_products: z.array(z.string()).optional(),
  actions: RuleActionsSchema.optional(),
  // Additional Coral agent fields
  ai_copy_id: z.string().uuid().optional(),
  display_type: z.enum(['popup', 'cart', 'checkout']).optional(),
  display_settings: z.record(z.any()).optional(),
  priority: z.number().min(0).max(100).default(50),
  status: z.enum(['active', 'inactive', 'draft']).default('draft'),
  is_active: z.boolean().default(true),
  use_ai: z.boolean().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Campaign Content Schema
 */
export const CampaignContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  image_url: z.string().url().optional(),
  cta_text: z.string(),
  cta_url: z.string().url().optional(),
  styling: z.object({
    background_color: z.string().optional(),
    text_color: z.string().optional(),
    font_size: z.string().optional()
  }).optional()
});

/**
 * Campaign Settings Schema
 */
export const CampaignSettingsSchema = z.object({
  trigger_type: z.enum(['page_load', 'scroll', 'time_delay', 'exit_intent']),
  trigger_delay: z.number().min(0).default(0),
  trigger_scroll_percentage: z.number().min(0).max(100).default(50),
  target_pages: z.array(z.string()).optional(),
  excluded_pages: z.array(z.string()).optional(),
  frequency_cap: z.number().positive().optional(),
  a_b_test_enabled: z.boolean().default(false)
});

/**
 * Campaign Schema
 */
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  campaign_type: z.enum(['popup', 'banner', 'modal', 'inline', 'sidebar']),
  content: CampaignContentSchema,
  settings: CampaignSettingsSchema,
  performance_metrics: z.record(z.any()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

/**
 * Template Schema
 */
export const TemplateSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  template_type: z.enum(['campaign', 'rule', 'content']),
  content: z.record(z.any()),
  is_public: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================================================
// INTEGRATION SCHEMAS
// ============================================================================

/**
 * Agent Request Schema
 */
export const AgentRequestSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  user_id: z.string().uuid(),
  payload: z.record(z.any()),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  created_at: z.string().datetime()
});

/**
 * Agent Response Schema
 */
export const AgentResponseSchema = z.object({
  request_id: z.string().uuid(),
  agent_id: z.string(),
  data: z.record(z.any()),
  status: z.enum(['success', 'error']),
  error_message: z.string().optional(),
  created_at: z.string().datetime()
});

/**
 * Workflow Step Schema
 */
export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  agent: z.enum(['coral', 'upsell']),
  action: z.string(),
  config: z.record(z.any()),
  order: z.number().positive(),
  condition: z.string().optional()
});

/**
 * Integration Workflow Schema
 */
export const IntegrationWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'scheduled', 'event_based']),
  trigger_config: z.record(z.any()),
  steps: z.array(WorkflowStepSchema),
  status: z.enum(['active', 'inactive', 'error', 'paused']),
  last_execution: z.object({
    timestamp: z.string().datetime().optional(),
    status: z.enum(['success', 'error', 'partial']).optional(),
    error_message: z.string().optional()
  }).optional()
});

/**
 * Performance Metrics Schema
 */
export const PerformanceMetricsSchema = z.object({
  id: z.string().uuid(),
  rule_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  impressions: z.number().min(0),
  clicks: z.number().min(0),
  conversions: z.number().min(0),
  revenue: z.number().min(0),
  conversion_rate: z.number().min(0).max(1),
  revenue_per_impression: z.number().min(0),
  time_period: z.string(),
  created_at: z.string().datetime()
});

// ============================================================================
// API SCHEMAS
// ============================================================================

/**
 * API Response Schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.any()).optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime()
});

/**
 * Paginated Response Schema
 */
export const PaginatedResponseSchema = z.object({
  data: z.array(z.record(z.any())),
  total: z.number().min(0),
  page: z.number().min(1),
  limit: z.number().min(1),
  has_more: z.boolean()
});

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

/**
 * Database Configuration Schema
 */
export const DatabaseConfigSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  schema: z.string().optional()
});

/**
 * Agent Configuration Schema
 */
export const AgentConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['coral', 'upsell']),
  url: z.string().url(),
  credentials: z.record(z.any()),
  settings: z.record(z.any()).default({})
});

/**
 * Integration Configuration Schema
 */
export const IntegrationConfigSchema = z.object({
  database: DatabaseConfigSchema,
  agents: z.array(AgentConfigSchema),
  workflows: z.record(z.any()).default({}),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.string().default('json')
  }).default({})
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate data against a schema and return result
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {Object} Validation result with success, data, and errors
 */
export function validateData(schema, data) {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: error.errors
    };
  }
}

/**
 * Safe parse data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {Object} Parse result
 */
export function safeParse(schema, data) {
  return schema.safeParse(data);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core schemas
  UserProfileSchema,
  ProductSchema,
  OrderSchema,
  OrderItemSchema,
  
  // Coral schemas
  CoralInsightSchema,
  CoralAnalysisRequestSchema,
  BundleOpportunitySchema,
  TrendAnalysisSchema,
  
  // UpsellEngine schemas
  UpsellRuleSchema,
  CampaignSchema,
  TemplateSchema,
  RuleConditionsSchema,
  RuleActionsSchema,
  CampaignContentSchema,
  CampaignSettingsSchema,
  
  // Integration schemas
  AgentRequestSchema,
  AgentResponseSchema,
  IntegrationWorkflowSchema,
  WorkflowStepSchema,
  PerformanceMetricsSchema,
  
  // API schemas
  ApiResponseSchema,
  PaginatedResponseSchema,
  
  // Configuration schemas
  DatabaseConfigSchema,
  AgentConfigSchema,
  IntegrationConfigSchema,
  
  // Utility functions
  validateData,
  safeParse
}; 