# 🚀 Production-Ready Coral + UpsellEngine Integration

A comprehensive multi-agent ecommerce strategy tool that integrates Coral's OpenDeepResearch Agent with UpsellEngine to create intelligent, data-driven upsell rules and campaigns.

## 🎯 Overview

This production system combines the analytical power of Coral with the real-time optimization capabilities of UpsellEngine to create a sophisticated ecommerce optimization platform.

### Key Features

- **🧠 Intelligent Insights**: Coral analyzes your data to discover patterns, trends, and opportunities
- **🛍️ Smart Rules**: Automatically create upsell rules based on data insights
- **📈 Dynamic Campaigns**: Generate targeted campaigns with AI-powered recommendations
- **⚡ Real-time Evaluation**: Evaluate upsell offers in real-time based on cart contents and customer behavior
- **🤖 AI Assistant**: Get intelligent recommendations for rule and campaign creation
- **📊 Performance Tracking**: Monitor and optimize performance with comprehensive analytics

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Coral Agent   │───▶│  Insights Engine │───▶│ UpsellEngine    │
│                 │    │                  │    │                 │
│ • Data Analysis │    │ • Bundle Analysis│    │ • Rule Creation │
│ • Pattern       │    │ • Trend Analysis │    │ • Campaign Mgmt │
│   Recognition   │    │ • Segmentation   │    │ • Real-time     │
│ • Citation      │    │ • Performance    │    │   Evaluation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   AI Assistant   │
                       │                  │
                       │ • Rule Creation  │
                       │ • Campaign Setup │
                       │ • Optimization   │
                       │ • Performance    │
                       └──────────────────┘
```

## 📦 Components

### 1. **Coral Insights Engine** (`production/coral-insights-engine.js`)
- Generates actionable insights from your ecommerce data
- Analyzes bundle opportunities, trends, customer segments, and performance
- Provides data-driven recommendations for UpsellEngine

### 2. **UpsellEngine Manager** (`production/upsell-engine-manager.js`)
- Manages rules and campaigns based on Coral insights
- Handles real-time upsell evaluation
- Processes insights into actionable rules and campaigns

### 3. **AI Assistant** (`production/ai-assistant.js`)
- Helps users create effective rules and campaigns
- Provides intelligent recommendations based on data analysis
- Assists with optimization and performance analysis

### 4. **Production Orchestrator** (`production/production-orchestrator.js`)
- Coordinates all components for production use
- Manages scheduled jobs and system monitoring
- Handles real-time requests and system status

## 🚀 Quick Start

### 1. Installation

```bash
cd integration-bridge
npm install
```

### 2. Configuration

Create a `.env.local` file with your configuration:

```env
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Test Configuration
TEST_USER_ID=your_test_user_id

# Logging
LOG_LEVEL=info
```

### 3. Database Setup

Run the database setup script in your Supabase SQL editor:

```sql
-- This will be provided as a separate SQL file
-- Creates all necessary tables and sample data
```

### 4. Test the System

```bash
# Test the basic integration
npm test

# Test the production system
node test-production.js
```

## 📊 Data Flow

### 1. **Data Collection**
- Shopify orders, products, customers
- Cart events and session data
- Upsell performance metrics

### 2. **Analysis (Coral)**
- Bundle opportunity analysis
- Trend identification
- Customer segmentation
- Performance analysis

### 3. **Insight Generation**
- Actionable recommendations
- Rule creation suggestions
- Campaign opportunities
- Optimization strategies

### 4. **Implementation (UpsellEngine)**
- Automatic rule creation
- Campaign generation
- Real-time evaluation
- Performance tracking

## 🎛️ Usage Examples

### Creating Rules with AI Assistant

```javascript
import { AIAssistant } from './production/ai-assistant.js';

const assistant = new AIAssistant(config);

// Create a category-based rule
const ruleResult = await assistant.assistUser(user_id, {
  type: 'create_rule',
  rule_type: 'category',
  business_goal: 'increase_aov',
  target_products: ['coffee-mug', 'coffee-beans'],
  constraints: {
    max_discount: 15,
    target_categories: ['kitchenware', 'food']
  }
});
```

### Creating Campaigns

```javascript
// Create a bundle campaign
const campaignResult = await assistant.assistUser(user_id, {
  type: 'create_campaign',
  campaign_type: 'bundle',
  business_goals: {
    target_metric: 'revenue',
    target_value: 1000,
    goal_description: 'Increase revenue through bundle sales'
  },
  target_audience: {
    customer_segments: ['high-value', 'frequent-buyers']
  },
  budget: 500,
  timeline: 30
});
```

### Real-time Upsell Evaluation

```javascript
import { UpsellEngineManager } from './production/upsell-engine-manager.js';

const manager = new UpsellEngineManager(config);

const cartItems = [
  { product_id: 'coffee-mug', title: 'Premium Coffee Mug', price: 24.99, quantity: 1 }
];

const timeContext = {
  timeOnSite: 180,
  activeTimeOnSite: 120,
  currentPage: '/cart'
};

const offer = await manager.evaluateUpsells(
  cartItems,
  'session-123',
  user_id,
  timeContext
);
```

### Auto-generation from Insights

```javascript
// Auto-generate rules and campaigns from insights
const autoResult = await assistant.assistUser(user_id, {
  type: 'auto_generate',
  generation_type: 'rules_and_campaigns',
  confidence_threshold: 0.7,
  max_items: 5
});
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `TEST_USER_ID` | Test user ID for development | Yes |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No |

### Configuration Object

```javascript
const config = {
  database: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  },
  test_user_id: process.env.TEST_USER_ID,
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

## 📈 Monitoring & Analytics

### System Status

```javascript
import { ProductionOrchestrator } from './production/production-orchestrator.js';

const orchestrator = new ProductionOrchestrator(config);
const status = await orchestrator.getSystemStatus();

console.log('System Status:', status);
```

### Performance Metrics

- **Active Users**: Number of users with active rules/campaigns
- **Total Rules**: Number of active upsell rules
- **Total Campaigns**: Number of active campaigns
- **Insights Generated**: Number of insights generated by Coral
- **Conversion Rate**: Overall upsell conversion rate
- **Revenue Impact**: Revenue generated from upsells

## 🔄 Scheduled Jobs

The system includes automated scheduled jobs:

- **Daily Insights** (2 AM): Generate daily insights for all users
- **Weekly Analysis** (3 AM Sunday): Comprehensive performance analysis
- **Monthly Optimization** (4 AM 1st): Monthly optimization runs

## 🛡️ Error Handling

The system includes comprehensive error handling:

- **Database Connection**: Automatic retry with exponential backoff
- **API Failures**: Graceful degradation and fallback options
- **Data Validation**: Input validation and sanitization
- **Rate Limiting**: Respects API rate limits
- **Logging**: Comprehensive logging for debugging

## 🚀 Deployment

### Production Checklist

- [ ] Database tables created and populated
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Performance testing completed
- [ ] Security audit passed

### Deployment Commands

```bash
# Install dependencies
npm install --production

# Set environment variables
export NODE_ENV=production

# Start the orchestrator
node production/production-orchestrator.js

# Or use PM2 for process management
pm2 start production/production-orchestrator.js --name "coral-upsell-integration"
```

## 📚 API Reference

### Coral Insights Engine

```javascript
// Generate insights
const insights = await coralEngine.generateUpsellInsights({
  user_id: 'user-id',
  time_period: '30d',
  insight_types: ['bundle', 'trend', 'segment', 'performance']
});
```

### UpsellEngine Manager

```javascript
// Process insights
const results = await upsellManager.processCoralInsights(insights, user_id);

// Evaluate upsells
const offer = await upsellManager.evaluateUpsells(cartItems, sessionId, user_id, timeContext);
```

### AI Assistant

```javascript
// Get assistance
const result = await aiAssistant.assistUser(user_id, request);
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Supabase URL and key
   - Verify network connectivity
   - Check database permissions

2. **No Insights Generated**
   - Verify user has order data
   - Check time period settings
   - Review data quality

3. **Rules Not Creating**
   - Check user permissions
   - Verify rule validation
   - Review database constraints

4. **Real-time Evaluation Failing**
   - Check session tracking
   - Verify rule status
   - Review evaluation logic

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
node test-production.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
4. Contact the development team

---

**🎉 Congratulations!** Your Coral + UpsellEngine integration is now production-ready and ready to optimize your ecommerce performance! 