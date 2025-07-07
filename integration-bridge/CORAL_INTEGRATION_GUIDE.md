# 🚀 Coral Suggestion Agent - Integration Guide

## Overview

The Coral Suggestion Agent analyzes your UpsellEngine data and provides actionable recommendations for merchants. This guide explains the workflow and how to integrate it into your UpsellEngine project.

---

## 🔄 Workflow Breakdown

### 1. **Data Analysis Phase**
```
Merchant Data → Coral Analysis → Insights Generation
```

**What happens:**
- Agent connects to your Supabase database
- Analyzes existing products, campaigns, rules, and performance data
- Identifies patterns, opportunities, and gaps
- Generates data-driven insights

**Data sources analyzed:**
- `products` table - Product catalog, pricing, inventory levels
- `campaigns` table - Existing campaign performance and types
- `upsell_rules` table - Current rules and their effectiveness
- Performance metrics (conversion rates, AOV, revenue trends)

### 2. **Recommendation Generation Phase**
```
Insights → Rule Suggestions → Campaign Suggestions → Priority Ranking
```

**What happens:**
- Converts insights into actionable recommendations
- Generates ready-to-use rule objects for your API
- Creates campaign suggestions with complete configuration
- Prioritizes recommendations by impact and urgency

**Types of recommendations:**
- **Rule Suggestions**: Product-based, cart-value, time-based rules
- **Campaign Suggestions**: Clearance, bundle, seasonal campaigns
- **Insights**: Performance alerts, revenue trends, optimization opportunities

### 3. **Output Format Phase**
```
Recommendations → Formatted Display → JSON Objects → API Ready
```

**What happens:**
- Formats recommendations for human reading (terminal/UI)
- Generates JSON objects ready for your UpsellEngine API
- Provides both natural language and programmatic outputs

---

## 🏗️ Integration Options

### Option 1: **API Endpoint Integration** (Recommended)

Add a new API endpoint to your UpsellEngine:

```typescript
// app/api/suggestions/route.ts
import { CoralSuggestionAgent } from '@/lib/coral-suggestion-agent';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate suggestions
    const agent = new CoralSuggestionAgent();
    const suggestions = await agent.generateSuggestions(user.id);

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Usage in your frontend:**
```typescript
// Fetch suggestions
const response = await fetch('/api/suggestions');
const suggestions = await response.json();

// Display in UI
console.log(suggestions.formatted_output);
console.log(suggestions.recommendations.rules);
```

### Option 2: **Dashboard Integration**

Add a "AI Suggestions" section to your merchant dashboard:

```typescript
// components/AISuggestions.tsx
import { useState, useEffect } from 'react';

export default function AISuggestions({ userId }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [userId]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/suggestions?user_id=${userId}`);
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading AI suggestions...</div>;

  return (
    <div className="ai-suggestions">
      <h2>🤖 AI Suggestions</h2>
      
      {/* High Priority Actions */}
      {suggestions?.recommendations.priorities.length > 0 && (
        <div className="priority-actions">
          <h3>🔥 High Priority Actions</h3>
          {suggestions.recommendations.priorities.map((item, index) => (
            <div key={index} className="suggestion-card">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <button onClick={() => implementSuggestion(item)}>
                Implement
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rule Suggestions */}
      {suggestions?.recommendations.rules.length > 0 && (
        <div className="rule-suggestions">
          <h3>📋 Rule Suggestions</h3>
          {suggestions.recommendations.rules.map((rule, index) => (
            <div key={index} className="suggestion-card">
              <h4>{rule.name}</h4>
              <p>{rule.description}</p>
              <button onClick={() => createRule(rule.rule_object)}>
                Create Rule
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Suggestions */}
      {suggestions?.recommendations.campaigns.length > 0 && (
        <div className="campaign-suggestions">
          <h3>📈 Campaign Suggestions</h3>
          {suggestions.recommendations.campaigns.map((campaign, index) => (
            <div key={index} className="suggestion-card">
              <h4>{campaign.name}</h4>
              <p>{campaign.description}</p>
              <button onClick={() => createCampaign(campaign.campaign_object)}>
                Create Campaign
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Option 3: **Notification System Integration**

Create a notification system for AI suggestions:

```typescript
// lib/ai-notifications.ts
export async function checkForAISuggestions(userId: string) {
  const agent = new CoralSuggestionAgent();
  const suggestions = await agent.generateSuggestions(userId);
  
  // Only show high priority suggestions as notifications
  const highPriority = suggestions.recommendations.priorities.filter(
    p => p.priority === 'high'
  );
  
  if (highPriority.length > 0) {
    // Create notification in your database
    await createNotification({
      user_id: userId,
      type: 'ai_suggestion',
      title: 'New AI Suggestions Available',
      message: `${highPriority.length} high-priority suggestions ready to implement`,
      data: suggestions,
      priority: 'high'
    });
  }
}
```

### Option 4: **Automated Implementation**

Automatically implement high-confidence suggestions:

```typescript
// lib/auto-implement-suggestions.ts
export async function autoImplementSuggestions(userId: string) {
  const agent = new CoralSuggestionAgent();
  const suggestions = await agent.generateSuggestions(userId);
  
  // Auto-implement high-confidence suggestions
  for (const rule of suggestions.recommendations.rules) {
    if (rule.expected_impact === 'high' && rule.priority === 'high') {
      try {
        await createUpsellRule(rule.rule_object, userId);
        console.log(`Auto-implemented rule: ${rule.name}`);
      } catch (error) {
        console.error(`Failed to auto-implement rule: ${rule.name}`, error);
      }
    }
  }
}
```

---

## 📁 File Structure

```
your-upsell-engine/
├── app/
│   ├── api/
│   │   └── suggestions/
│   │       └── route.ts          # API endpoint for suggestions
│   └── dashboard/
│       └── ai-suggestions/
│           └── page.tsx          # AI suggestions dashboard
├── components/
│   ├── AISuggestions.tsx         # AI suggestions component
│   └── SuggestionCard.tsx        # Individual suggestion card
├── lib/
│   ├── coral-suggestion-agent.js # Coral agent (copy from integration-bridge)
│   ├── ai-notifications.ts       # Notification system
│   └── auto-implement.ts         # Auto-implementation logic
└── types/
    └── suggestions.ts            # TypeScript types for suggestions
```

---

## 🔧 Implementation Steps

### Step 1: **Copy the Coral Agent**
```bash
# Copy the agent to your UpsellEngine project
cp integration-bridge/coral-suggestion-agent.js your-upsell-engine/lib/
cp integration-bridge/shared/config.js your-upsell-engine/lib/
```

### Step 2: **Create API Endpoint**
Create `app/api/suggestions/route.ts` with the code from Option 1 above.

### Step 3: **Add Dashboard Component**
Create the `AISuggestions` component from Option 2 above.

### Step 4: **Add to Navigation**
Add AI suggestions to your dashboard navigation:

```typescript
// app/dashboard/layout.tsx
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/dashboard/campaigns">Campaigns</Link>
  <Link href="/dashboard/rules">Rules</Link>
  <Link href="/dashboard/ai-suggestions">🤖 AI Suggestions</Link>
</nav>
```

### Step 5: **Add Notification Badge**
Show notification count for new suggestions:

```typescript
// components/NotificationBadge.tsx
const [suggestionCount, setSuggestionCount] = useState(0);

useEffect(() => {
  const checkSuggestions = async () => {
    const response = await fetch('/api/suggestions/count');
    const { count } = await response.json();
    setSuggestionCount(count);
  };
  
  checkSuggestions();
  // Check every 30 minutes
  const interval = setInterval(checkSuggestions, 30 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 🎯 Usage Patterns

### **On-Demand Analysis**
```typescript
// When merchant clicks "Get AI Suggestions"
const handleGetSuggestions = async () => {
  setLoading(true);
  const suggestions = await fetch('/api/suggestions').then(r => r.json());
  setSuggestions(suggestions);
  setLoading(false);
};
```

### **Scheduled Analysis**
```typescript
// Run daily at 2 AM (using cron or serverless functions)
export async function scheduledAnalysis() {
  const users = await getAllActiveUsers();
  
  for (const user of users) {
    const agent = new CoralSuggestionAgent();
    const suggestions = await agent.generateSuggestions(user.id);
    
    // Store suggestions for later retrieval
    await storeSuggestions(user.id, suggestions);
    
    // Send notification if high priority
    if (suggestions.recommendations.priorities.length > 0) {
      await sendNotification(user.id, suggestions);
    }
  }
}
```

### **Real-Time Triggers**
```typescript
// When new data is added (webhooks, database triggers)
export async function onDataChange(userId: string, changeType: string) {
  if (changeType === 'new_order' || changeType === 'low_inventory') {
    // Trigger immediate analysis
    const agent = new CoralSuggestionAgent();
    const suggestions = await agent.generateSuggestions(userId);
    
    // Show real-time notification
    await showRealTimeNotification(suggestions);
  }
}
```

---

## 🔒 Security Considerations

### **Authentication**
- All API endpoints require user authentication
- Suggestions are user-scoped (users only see their own data)
- Use Row Level Security (RLS) in Supabase

### **Rate Limiting**
```typescript
// Limit suggestion generation to prevent abuse
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
});

export async function GET(request: NextRequest) {
  try {
    await limiter.check(request, 5, 'SUGGESTIONS'); // 5 requests per minute
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  // ... rest of the code
}
```

### **Data Privacy**
- Never expose raw data in suggestions
- Sanitize all outputs
- Log suggestion generation for audit trails

---

## 📊 Monitoring & Analytics

### **Track Suggestion Performance**
```typescript
// Track which suggestions are implemented
export async function trackSuggestionImplementation(suggestionId: string, userId: string) {
  await supabase.from('suggestion_implementations').insert({
    suggestion_id: suggestionId,
    user_id: userId,
    implemented_at: new Date().toISOString(),
    status: 'implemented'
  });
}

// Track suggestion effectiveness
export async function trackSuggestionEffectiveness(suggestionId: string, metrics: any) {
  await supabase.from('suggestion_performance').insert({
    suggestion_id: suggestionId,
    conversion_rate: metrics.conversion_rate,
    revenue_impact: metrics.revenue_impact,
    measured_at: new Date().toISOString()
  });
}
```

### **Analytics Dashboard**
Create a dashboard to show:
- Most popular suggestions
- Implementation rates
- Revenue impact of suggestions
- User engagement with AI features

---

## 🚀 Next Steps

1. **Start with Option 1** (API endpoint) for quick integration
2. **Add the dashboard component** for merchant-facing interface
3. **Implement notifications** for high-priority suggestions
4. **Add analytics tracking** to measure effectiveness
5. **Consider automated implementation** for high-confidence suggestions

---

## 📞 Support

If you need help with:
- **Integration issues**: Check the error logs and ensure environment variables are set
- **Custom suggestions**: Modify the `generateRecommendations` method in the agent
- **Performance optimization**: Add caching and database query optimization
- **UI customization**: Adapt the components to match your design system

---

**🎉 You now have a complete AI-powered suggestion system for your UpsellEngine!** 