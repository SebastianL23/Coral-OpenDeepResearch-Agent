# Coral + UpsellEngine Integration Bridge

## Overview
This integration bridge connects Coral's OpenDeepResearch Agent with UpsellEngine to create a powerful autonomous ecommerce strategy system.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Coral Agent   │    │  Integration     │    │  UpsellEngine   │
│                 │    │     Bridge       │    │                 │
│ • Deep Analysis │◄──►│ • Orchestrator   │◄──►│ • Rule Engine   │
│ • Pattern       │    │ • Data Sync      │    │ • Campaigns     │
│   Recognition   │    │ • Agent          │    │ • Real-time     │
│ • Insights      │    │   Communication  │    │   Recommendations│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Shared Data    │
                       │     Layer        │
                       │                  │
                       │ • Supabase DB    │
                       │ • Vector Search  │
                       │ • Graph Memory   │
                       └──────────────────┘
```

## Agent Roles

### 🧠 Coral Research Agent
- **Purpose**: Deep analysis of orders/products, generating insights, patterns, and citations
- **Input**: Product/order/customer data, business questions
- **Output**: Structured insights with logic and recommendations
- **Key Tables**: `shopify_orders`, `shopify_products`, `shopify_customers`, `cart_events`

### 🛍️ UpsellEngine Agent
- **Purpose**: Converts insights into bundling logic, rules, and real-time recommendations
- **Input**: Insights from Coral, real-time session data
- **Output**: Rules, campaigns, real-time recommendations
- **Key Tables**: `upsell_rules`, `campaigns`, `templates`, `session_time_tracking`

## Data Flow

1. **Trigger**: Business question or periodic analysis request
2. **Coral Analysis**: Deep research on data patterns and opportunities
3. **Insight Generation**: Structured output with logic and recommendations
4. **Bridge Processing**: Parse insights and convert to UpsellEngine format
5. **Rule Creation**: Generate and deploy new rules/campaigns
6. **Performance Tracking**: Monitor and collect feedback
7. **Feedback Loop**: Re-analyze and optimize based on results

## Implementation Steps

1. ✅ **Database Schema** - Define shared data structure
2. 🔄 **Integration Bridge** - Create orchestrator service
3. 🔄 **Coral Extensions** - Add ecommerce-specific tools
4. 🔄 **UpsellEngine Extensions** - Add insight processing
5. 🔄 **Feedback Loop** - Implement performance tracking
6. 🔄 **Testing & Optimization** - Validate and refine

## Directory Structure

```
integration-bridge/
├── README.md                 # This file
├── orchestrator/             # Main orchestration service
│   ├── index.js             # Main orchestrator
│   ├── coral-adapter.js     # Coral API client
│   ├── upsell-adapter.js    # UpsellEngine API client
│   └── data-processor.js    # Data transformation logic
├── shared/                   # Shared utilities and types
│   ├── types.js             # TypeScript definitions
│   ├── schemas.js           # Data validation schemas
│   └── constants.js         # Shared constants
├── config/                   # Configuration files
│   ├── database.js          # Database connection config
│   └── agents.js            # Agent configuration
└── tests/                    # Integration tests
    ├── coral-tests.js       # Coral integration tests
    ├── upsell-tests.js      # UpsellEngine integration tests
    └── end-to-end-tests.js  # Full workflow tests
``` 