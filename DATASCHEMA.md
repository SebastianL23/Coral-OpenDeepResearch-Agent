Based on your database schema and the two agents you want to integrate, here's a breakdown of which tables each agent needs access to:

## 🧠 Coral Research Agent
**Purpose**: Deep analysis of orders/products, generating insights, patterns, and citations

### Required Tables:

1. **`shopify_orders`** - Primary data source for order analysis
   - Order patterns, customer behavior, purchase frequency
   - Revenue analysis, seasonal trends
   - Customer lifetime value calculations

2. **`shopify_products`** - Product performance data
   - Product popularity, inventory turnover
   - Price sensitivity analysis
   - Product category performance

3. **`shopify_customers`** - Customer segmentation data
   - Customer demographics and behavior patterns
   - Purchase history and preferences
   - Customer lifetime value analysis

4. **`cart_events`** - Shopping behavior analysis
   - Cart abandonment patterns
   - Product combination preferences
   - Session flow analysis

5. **`customer_sessions`** - Session-level insights
   - Session duration patterns
   - Conversion funnel analysis
   - Cross-session behavior

6. **`upsell_events`** - Upsell performance data
   - Historical upsell success rates
   - Template performance analysis
   - Revenue impact of upsells

7. **`campaigns`** - Campaign performance data
   - Campaign effectiveness analysis
   - A/B test results
   - ROI calculations

8. **`upsell_evaluations`** - Decision-making patterns
   - When upsells are triggered
   - Campaign selection patterns
   - Context-based performance

## 🛍️ UpsellEngine Agent
**Purpose**: Converts insights into bundling logic, rules, and real-time recommendations

### Required Tables:

1. **`upsell_rules`** - Rule management and optimization
   - Create/update rules based on insights
   - Rule performance optimization
   - Dynamic rule adjustment

2. **`campaigns`** - Campaign creation and management
   - Generate new campaigns from insights
   - Campaign performance optimization
   - Dynamic campaign adjustment

3. **`templates`** - Content optimization
   - Template performance analysis
   - Content optimization based on insights
   - A/B testing of templates

4. **`session_time_tracking`** - Real-time context
   - Time-based rule triggers
   - Session context for recommendations
   - Real-time decision making

5. **`shopify_products`** - Product availability and pricing
   - Real-time inventory status
   - Dynamic pricing rules
   - Product bundling logic

6. **`integrations`** - Platform status
   - Shopify connection status
   - API availability
   - Sync status for real-time data

7. **`api_config`** - System configuration
   - Webhook configurations
   - API rate limits
   - System settings

## 🔄 Shared Tables (Both Agents):

1. **`profiles`** - User context and permissions
2. **`recent_activity`** - System activity logging
3. **`user_roles`** - Access control

## 📊 Data Flow Between Agents:

```
Coral Research Agent → Analysis → Insights → UpsellEngine Agent → Rules/Campaigns → Real-time Recommendations
```

### Example Workflow:

1. **Coral Research Agent** analyzes `shopify_orders` and `cart_events` to discover that customers who buy "Premium Headphones" often also buy "Wireless Charger" within 30 seconds
2. **Insight Generated**: "Bundle opportunity: Premium Headphones + Wireless Charger (30s window)"
3. **UpsellEngine Agent** receives this insight and:
   - Creates a new rule in `upsell_rules` table
   - Generates a campaign in `campaigns` table
   - Updates `session_time_tracking` triggers
   - Configures real-time evaluation logic

## 🔐 Access Control Recommendations:

### Coral Research Agent (Read-Heavy):
- **Read Access**: All analysis tables
- **Write Access**: `recent_activity` (for logging insights)
- **Limited Write**: `campaigns` (for insight annotations)

### UpsellEngine Agent (Write-Heavy):
- **Read Access**: All tables for context
- **Write Access**: `upsell_rules`, `campaigns`, `templates`
- **Real-time Access**: `session_time_tracking`, `upsell_evaluations`

This setup allows the Coral Research Agent to perform deep analysis without interfering with real-time operations, while the UpsellEngine Agent can act on those insights to create and optimize upsell strategies in real-time.