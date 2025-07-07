# 🚀 Coral Research Agent - Upsell Engine

A powerful AI agent that analyzes your Supabase database to generate actionable upsell rules and campaigns for your e-commerce business.

## 🎯 What It Does

The Coral Research Agent connects to your Supabase database and:

1. **Analyzes your data** - Products, campaigns, rules, and performance metrics
2. **Generates insights** - AI-powered analysis of your upsell opportunities
3. **Creates rule suggestions** - Ready-to-implement upsell rules
4. **Suggests campaigns** - Optimized campaign configurations
5. **Prioritizes actions** - High-impact recommendations to implement first

## 🏗️ Architecture

```
Your UpsellEngine → API Call → Coral Research Agent → Supabase Analysis → JSON Response
```

## 🚀 Quick Start

### 1. Environment Setup

Copy `.env_sample` to `.env` and configure:

```bash
# Groq Configuration
GROQ_API_KEY=your_groq_api_key
MODEL_NAME=llama3-70b-8192
MODEL_PROVIDER=groq

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5555
```

### 2. Install Dependencies

```bash
pip install -e .
```

### 3. Run the Agent

```bash
python web_service.py
```

### 4. Test the Agent

```bash
python test_agent.py
```

## 📡 API Usage

### Analyze User Data

```bash
curl -X POST http://localhost:5555/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "analysis_type": "comprehensive",
    "time_range_days": 30
  }'
```

### Response Format

```json
{
  "user_id": "user-id",
  "analysis_timestamp": "2024-01-01T12:00:00Z",
  "insights": {
    "product_insights": [...],
    "campaign_insights": [...],
    "rule_insights": [...],
    "revenue_opportunities": [...]
  },
  "rule_suggestions": [
    {
      "name": "Cart Value Upsell",
      "description": "Show upsell when cart value is above threshold",
      "rule_type": "cart_value",
      "conditions": {...},
      "actions": {...},
      "priority": 5,
      "expected_impact": "high"
    }
  ],
  "campaign_suggestions": [
    {
      "name": "Exit Intent Upsell",
      "description": "Show upsell when user tries to leave",
      "campaign_type": "popup",
      "trigger_type": "exit_intent",
      "content": {...},
      "expected_impact": "high"
    }
  ],
  "priority_actions": [
    {
      "name": "High Impact Product Insight",
      "description": "Your best-selling product has high upsell potential",
      "priority": "high",
      "action": "Create product-based upsell rule",
      "type": "insight"
    }
  ],
  "data_summary": {
    "total_products": 25,
    "total_campaigns": 8,
    "total_rules": 12,
    "analysis_period_days": 30
  }
}
```

## 🔗 Integration with UpsellEngine

### 1. API Endpoint Integration

Add this to your UpsellEngine:

```typescript
// app/api/suggestions/route.ts
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Coral Research Agent
    const response = await fetch('http://your-coral-agent-url/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        analysis_type: 'comprehensive',
        time_range_days: 30
      })
    });

    const suggestions = await response.json();
    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. Frontend Integration

```typescript
// components/AISuggestions.tsx
const [suggestions, setSuggestions] = useState(null);

const fetchSuggestions = async () => {
  const response = await fetch('/api/suggestions');
  const data = await response.json();
  setSuggestions(data);
};

// Display suggestions
{suggestions?.rule_suggestions.map((rule, index) => (
  <div key={index} className="suggestion-card">
    <h4>{rule.name}</h4>
    <p>{rule.description}</p>
    <button onClick={() => createRule(rule)}>
      Create Rule
    </button>
  </div>
))}
```

## 📊 Data Analysis

The agent analyzes these tables from your Supabase database:

- **`products`** - Product catalog and pricing
- **`campaigns`** - Existing campaign performance
- **`upsell_rules`** - Current rules and effectiveness
- **`templates`** - Content templates
- **`profiles`** - User profile and plan information

## 🎯 Generated Insights

### Product Insights
- Product performance patterns
- Pricing optimization opportunities
- Bundle suggestions

### Campaign Insights
- Campaign effectiveness analysis
- Trigger optimization
- Content performance

### Rule Insights
- Rule effectiveness
- Condition optimization
- Action improvements

### Revenue Opportunities
- High-impact upsell opportunities
- Revenue potential estimates
- Implementation strategies

## 🔧 Configuration

### Analysis Types
- `comprehensive` - Full analysis (default)
- `rules_only` - Focus on rule suggestions
- `campaigns_only` - Focus on campaign suggestions

### Time Ranges
- `7` - Last week
- `30` - Last month (default)
- `90` - Last quarter
- `365` - Last year

## 🚀 Deployment

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Environment Variables for Railway

```bash
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=5555
```

## 🧪 Testing

### Local Testing

```bash
# Test the agent
python test_agent.py

# Test the API
curl -X POST http://localhost:5555/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "time_range_days": 30}'
```

### Production Testing

```bash
# Test deployed agent
curl -X POST https://your-railway-app.railway.app/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_id": "real-user-id", "time_range_days": 30}'
```

## 🔒 Security

- All API calls require user authentication
- Data is scoped to individual users
- Uses Supabase Row Level Security (RLS)
- No sensitive data is logged or exposed

## 📈 Performance

- Fast analysis (typically 5-10 seconds)
- Cached insights for repeated requests
- Optimized database queries
- Efficient AI model usage

## 🆘 Support

If you encounter issues:

1. Check environment variables are set correctly
2. Verify Supabase connection and permissions
3. Check Groq API key and limits
4. Review logs for detailed error messages

## 🔄 Updates

The agent automatically:
- Adapts to your data structure
- Learns from your performance patterns
- Suggests improvements based on trends
- Updates recommendations as your business grows

---

**🎉 Your Coral Research Agent is ready to boost your upsell revenue!**
