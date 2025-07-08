from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import logging
from supabase import create_client, Client
from langchain.chat_models import init_chat_model
from langchain.prompts import ChatPromptTemplate
import pandas as pd
from datetime import datetime, timedelta

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Coral Research Agent - Upsell Engine",
    description="AI agent that analyzes Supabase data to generate upsell rules and campaigns",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client with error handling
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials not found. Running in demo mode.")
    logger.warning(f"SUPABASE_URL: {'Set' if supabase_url else 'Missing'}")
    logger.warning(f"SUPABASE_SERVICE_ROLE_KEY: {'Set' if supabase_key else 'Missing'}")
    supabase = None
else:
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        supabase = None

# Initialize Groq model with error handling
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    logger.error("GROQ_API_KEY not found. Please set the environment variable.")
    model = None
else:
    try:
        model = init_chat_model(
            model="llama3-70b-8192",
            model_provider="groq",
            api_key=groq_api_key,
            temperature=0.1,
            max_tokens=4000
        )
        logger.info("Groq model initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Groq model: {str(e)}")
        model = None

class AnalysisRequest(BaseModel):
    user_id: str
    analysis_type: str = "comprehensive"  # comprehensive, rules_only, campaigns_only
    time_range_days: int = 30
    analysis_days: int = 30  # Alternative field name
    data: Optional[Dict[str, Any]] = None  # Data sent from UpsellEngine

class AnalysisResponse(BaseModel):
    user_id: str
    analysis_timestamp: str
    insights: Dict[str, Any]
    rule_suggestions: List[Dict[str, Any]]
    campaign_suggestions: List[Dict[str, Any]]
    priority_actions: List[Dict[str, Any]]
    data_summary: Dict[str, Any]

class CoralResearchAgent:
    def __init__(self):
        self.model = model
        self.supabase = supabase
        
    async def analyze_user_data(self, user_id: str, time_range_days: int = 30, sent_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze user's data and generate insights - AI ONLY, NO FALLBACKS"""
        logger.info(f"Starting AI analysis for user {user_id}")
        
        # CRITICAL: Require AI model - no fallbacks allowed
        if not self.model:
            logger.error("CRITICAL: No AI model available. Cannot proceed without AI insights.")
            raise Exception("AI model not available. Please check GROQ_API_KEY environment variable.")
        
        # Use sent data if available, otherwise fetch from Supabase
        if sent_data:
            logger.info("Using data sent from UpsellEngine")
            data = self._transform_upsell_engine_data(sent_data)
        elif self.supabase:
            logger.info("Fetching data from Supabase")
            data = await self._fetch_user_data(user_id, time_range_days)
        else:
            logger.error("CRITICAL: No data source available. Cannot generate AI insights without data.")
            raise Exception("No data source available. Please check Supabase connection or provide data.")
        
        # DEBUG: Log what data we received
        logger.info(f"=== DATA RECEIVED DEBUG ===")
        logger.info(f"Total data keys: {list(data.keys())}")
        for key, value in data.items():
            if isinstance(value, list):
                logger.info(f"{key}: {len(value)} items")
                if value and len(value) > 0:
                    logger.info(f"Sample {key}: {value[0]}")
            else:
                logger.info(f"{key}: {value}")
        
        # Generate insights using AI
        logger.info("Generating insights...")
        insights = await self._generate_insights(data, user_id)
        
        # Generate rule suggestions
        logger.info("Generating rule suggestions...")
        rule_suggestions = await self._generate_rule_suggestions(data, insights, user_id)
        
        # Generate campaign suggestions
        logger.info("Generating campaign suggestions...")
        campaign_suggestions = await self._generate_campaign_suggestions(data, insights, user_id)
        
        # Generate priority actions
        logger.info("Generating priority actions...")
        priority_actions = await self._generate_priority_actions(insights, rule_suggestions, campaign_suggestions)
        
        result = {
            "user_id": user_id,
            "analysis_timestamp": datetime.now().isoformat(),
            "insights": insights,
            "rule_suggestions": rule_suggestions,
            "campaign_suggestions": campaign_suggestions,
            "priority_actions": priority_actions,
            "data_summary": self._create_data_summary(data)
        }
        
        logger.info(f"Analysis completed for user {user_id}")
        logger.info(f"Generated {len(rule_suggestions)} rules, {len(campaign_suggestions)} campaigns")
        
        return result
    
    def _transform_upsell_engine_data(self, sent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform UpsellEngine data format to Coral agent format"""
        logger.info("Transforming UpsellEngine data format...")
        
        # Map the UpsellEngine data structure to Coral agent format
        transformed_data = {
            "shopify_products": sent_data.get("products", []),
            "shopify_orders": sent_data.get("orders", []),
            "cart_events": sent_data.get("cart_events", []),
            "upsell_events": sent_data.get("upsell_events", []),
            "campaigns": sent_data.get("campaigns", []),
            "upsell_rules": sent_data.get("existing_rules", []),
            "profiles": sent_data.get("profile", {}),
            "analysis_period_days": sent_data.get("analysis_period", "30_days")
        }
        
        logger.info(f"Transformed data: {len(transformed_data['shopify_products'])} products, {len(transformed_data['shopify_orders'])} orders")
        
        return transformed_data
    
    async def _generate_demo_analysis(self, user_id: str, time_range_days: int) -> Dict[str, Any]:
        """Generate demo analysis when Supabase is not available"""
        logger.info("Generating demo analysis (no Supabase connection)")
        
        return {
            "user_id": user_id,
            "analysis_timestamp": datetime.now().isoformat(),
            "insights": {
                "product_insights": [
                    {
                        "insight": "Demo mode: No real data available",
                        "impact": "medium",
                        "action": "Set up Supabase connection to get real insights"
                    }
                ],
                "campaign_insights": [
                    {
                        "insight": "Demo mode: No campaign data available",
                        "impact": "medium",
                        "action": "Connect to Supabase to analyze campaigns"
                    }
                ],
                "rule_insights": [
                    {
                        "insight": "Demo mode: No rule data available",
                        "impact": "medium",
                        "action": "Set up database connection for rule analysis"
                    }
                ],
                "revenue_opportunities": [
                    {
                        "opportunity": "Connect to your database",
                        "potential_impact": "Get real insights and recommendations",
                        "implementation": "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
                    }
                ]
            },
            "rule_suggestions": [
                {
                    "name": "Demo Cart Value Rule",
                    "description": "Example rule for cart value upsells",
                    "trigger_type": "cart_value",
                    "trigger_conditions": {
                        "cart_value_operator": "greater_than",
                        "cart_value": 50
                    },
                    "actions": {
                        "action_type": "show_campaign",
                        "campaign_id": "cart_value_upsell"
                    },
                    "priority": 5,
                    "expected_impact": "medium",
                    "implementation_notes": "This is a demo rule. Connect to Supabase for real suggestions."
                }
            ],
            "campaign_suggestions": [
                {
                    "name": "Demo Exit Intent Campaign",
                    "description": "Example exit intent campaign",
                    "campaign_type": "popup",
                    "trigger_type": "exit_intent",
                    "trigger_delay": 0,
                    "trigger_scroll_percentage": 50,
                    "target_pages": ["/cart", "/checkout"],
                    "excluded_pages": [],
                    "settings": {
                        "position": "center",
                        "style": "modern"
                    },
                    "content": {
                        "title": "Wait! Don't miss out!",
                        "message": "Add one more item and get 10% off!",
                        "cta_text": "Add to Cart",
                        "offer": "10% off entire order"
                    },
                    "expected_impact": "medium",
                    "implementation_notes": "This is a demo campaign. Connect to Supabase for real suggestions."
                }
            ],
            "priority_actions": [
                {
                    "name": "Set Up Database Connection",
                    "description": "Connect to Supabase to get real insights",
                    "priority": "high",
                    "action": "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables",
                    "type": "setup"
                }
            ],
            "data_summary": {
                "total_products": 0,
                "total_campaigns": 0,
                "total_rules": 0,
                "analysis_period_days": time_range_days,
                "user_profile": {
                    "plan_type": "demo",
                    "company_name": "Demo User"
                },
                "campaign_status_breakdown": {},
                "rule_type_breakdown": {},
                "product_price_range": {"min": 0, "max": 0, "average": 0},
                "mode": "demo"
            }
        }
    
    async def _generate_fallback_analysis(self, user_id: str, time_range_days: int) -> Dict[str, Any]:
        """Generate fallback analysis when AI model is not available"""
        logger.info("Generating fallback analysis (no AI model)")
        
        demo_result = await self._generate_demo_analysis(user_id, time_range_days)
        demo_result["priority_actions"].append({
            "name": "Set Up AI Model",
            "description": "Connect to Groq for AI-powered insights",
            "priority": "high",
            "action": "Set GROQ_API_KEY environment variable",
            "type": "setup"
        })
        
        return demo_result
    
    async def _fetch_user_data(self, user_id: str, time_range_days: int) -> Dict[str, Any]:
        """Fetch all relevant data for the user in priority order"""
        cutoff_date = datetime.now() - timedelta(days=time_range_days)
        
        try:
            data = {
                "shopify_orders": [],
                "cart_events": [],
                "upsell_events": [],
                "campaigns": [],
                "shopify_products": [],
                "upsell_rules": [],
                "profiles": {},
                "analysis_period_days": time_range_days
            }
            
            logger.info(f"Starting data fetch for user {user_id} (last {time_range_days} days)")
            
            # 1. CUSTOMER BEHAVIOR (Priority 1)
            logger.info("1. Fetching customer behavior data...")
            
            # Shopify Orders
            try:
                orders_response = self.supabase.table('shopify_orders').select('*').eq('user_id', user_id).gte('created_at', cutoff_date.isoformat()).execute()
                data["shopify_orders"] = orders_response.data if orders_response.data else []
                logger.info(f"Found {len(data['shopify_orders'])} shopify_orders")
            except Exception as e:
                logger.warning(f"Could not fetch shopify_orders: {str(e)}")
            
            # Cart Events
            try:
                cart_events_response = self.supabase.table('cart_events').select('*').eq('user_id', user_id).gte('created_at', cutoff_date.isoformat()).execute()
                data["cart_events"] = cart_events_response.data if cart_events_response.data else []
                logger.info(f"Found {len(data['cart_events'])} cart_events")
            except Exception as e:
                logger.warning(f"Could not fetch cart_events: {str(e)}")
            
            # 2. CURRENT PERFORMANCE (Priority 2)
            logger.info("2. Fetching current performance data...")
            
            # Upsell Events
            try:
                upsell_events_response = self.supabase.table('upsell_events').select('*').eq('user_id', user_id).gte('created_at', cutoff_date.isoformat()).execute()
                data["upsell_events"] = upsell_events_response.data if upsell_events_response.data else []
                logger.info(f"Found {len(data['upsell_events'])} upsell_events")
            except Exception as e:
                logger.warning(f"Could not fetch upsell_events: {str(e)}")
            
            # Campaigns
            try:
                campaigns_response = self.supabase.table('campaigns').select('*').eq('user_id', user_id).execute()
                data["campaigns"] = campaigns_response.data if campaigns_response.data else []
                logger.info(f"Found {len(data['campaigns'])} campaigns")
            except Exception as e:
                logger.warning(f"Could not fetch campaigns: {str(e)}")
            
            # 3. PRODUCT DATA (Priority 3)
            logger.info("3. Fetching product data...")
            
            # Try products table first (your primary table)
            try:
                products_response = self.supabase.table('products').select('*').eq('user_id', user_id).execute()
                data["shopify_products"] = products_response.data if products_response.data else []
                logger.info(f"Found {len(data['shopify_products'])} products")
            except Exception as e:
                logger.warning(f"Could not fetch products: {str(e)}")
                # Try Shopify table as fallback
                try:
                    products_response = self.supabase.table('shopify_products').select('*').eq('user_id', user_id).execute()
                    data["shopify_products"] = products_response.data if products_response.data else []
                    logger.info(f"Found {len(data['shopify_products'])} shopify_products (fallback)")
                except Exception as e2:
                    logger.warning(f"Could not fetch shopify_products either: {str(e2)}")
            
            # Additional data for context
            logger.info("4. Fetching additional context data...")
            
            # Upsell Rules
            try:
                rules_response = self.supabase.table('upsell_rules').select('*').eq('user_id', user_id).execute()
                data["upsell_rules"] = rules_response.data if rules_response.data else []
                logger.info(f"Found {len(data['upsell_rules'])} upsell_rules")
            except Exception as e:
                logger.warning(f"Could not fetch upsell_rules: {str(e)}")
            
            # User Profile
            try:
                profile_response = self.supabase.table('profiles').select('*').eq('id', user_id).execute()
                data["profiles"] = profile_response.data[0] if profile_response.data else {}
                logger.info("Found user profile")
            except Exception as e:
                logger.warning(f"Could not fetch profile: {str(e)}")
                data["profiles"] = {}
            
            # Summary
            total_records = sum(len(v) for k, v in data.items() if isinstance(v, list))
            logger.info(f"Data fetch completed. Total records: {total_records}")
            
            return data
            
        except Exception as e:
            logger.error(f"Error fetching data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")
    
    async def _generate_insights(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Generate insights from the data using AI - NO FALLBACKS ALLOWED"""
        
        # Create a summary of the data for AI analysis
        data_summary = self._create_data_summary(data)
        
        # Ensure we have a model connection
        if not self.model:
            logger.error("CRITICAL: No AI model available. Cannot generate insights without AI.")
            raise Exception("AI model not available. Please check GROQ_API_KEY environment variable.")
        # AI model test to ensure model is responsive
        try:
            test_prompt = ChatPromptTemplate.from_messages([
                ("user", "Respond with only the word 'test'")
            ])
            test_response = await self.model.ainvoke(test_prompt.format_messages())
            logger.info(f"AI model test successful: {test_response.content}")
        except Exception as e:
            logger.error(f"AI model test failed: {str(e)}")
            raise Exception(f"AI model is not responding. Please check GROQ_API_KEY and model connection: {str(e)}")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence expert specializing in e-commerce upsell optimization. 
            Analyze the provided data and generate actionable insights for improving upsell performance.
            
            CRITICAL: You MUST return ONLY valid JSON. No explanations, no markdown, no extra text.
            
            Focus on:
            1. Customer behavior patterns from orders and cart events
            2. Current upsell performance and campaign effectiveness
            3. Product performance and bundling opportunities
            4. Rule optimization opportunities
            5. Revenue optimization potential
            
            Provide specific, actionable insights that can be used to create better upsell rules and campaigns."""),
            ("user", f"""Analyze this e-commerce data and provide insights:
            
            {json.dumps(data_summary, indent=2)}
            
            CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.
            
            Generate insights in this EXACT JSON format:
            {{
                "customer_behavior_insights": [
                    {{
                        "insight": "description",
                        "impact": "high|medium|low",
                        "action": "specific action to take"
                    }}
                ],
                "performance_insights": [
                    {{
                        "insight": "description", 
                        "impact": "high|medium|low",
                        "action": "specific action to take"
                    }}
                ],
                "product_insights": [
                    {{
                        "insight": "description",
                        "impact": "high|medium|low", 
                        "action": "specific action to take"
                    }}
                ],
                "revenue_opportunities": [
                    {{
                        "opportunity": "description",
                        "potential_impact": "estimated revenue increase",
                        "implementation": "how to implement"
                    }}
                ]
            }}
            
            CRITICAL RULES:
            1. Return ONLY the JSON object - no markdown, no explanations
            2. Use double quotes for all strings
            3. No trailing commas
            4. No extra whitespace or newlines before the opening brace
            5. Ensure all required keys are present
            6. Each insight should be specific and actionable based on the data""")
        ])
        
        # Retry logic for AI insights
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting AI insight generation (attempt {attempt + 1}/{max_retries})")
                response = await self.model.ainvoke(prompt.format_messages())
                
                # Clean the response content
                content = response.content.strip()
                logger.info(f"AI response received: {content[:200]}...")
                
                # Remove markdown formatting if present
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                # Try to parse JSON with multiple fallback strategies
                insights = None
                json_error = None
                
                # Strategy 1: Direct JSON parsing
                try:
                    insights = json.loads(content)
                    logger.info("Strategy 1: Direct JSON parsing successful")
                except json.JSONDecodeError as e:
                    json_error = e
                    logger.warning(f"Strategy 1 failed: {e}")
                
                # Strategy 2: Clean and try again
                if insights is None:
                    try:
                        # Remove any leading/trailing whitespace and newlines
                        cleaned_content = content.strip()
                        # Remove any leading/trailing quotes
                        if cleaned_content.startswith('"') and cleaned_content.endswith('"'):
                            cleaned_content = cleaned_content[1:-1]
                        # Remove any leading/trailing backticks
                        if cleaned_content.startswith('`') and cleaned_content.endswith('`'):
                            cleaned_content = cleaned_content[1:-1]
                        
                        insights = json.loads(cleaned_content)
                        logger.info("Strategy 2: Cleaned JSON parsing successful")
                    except json.JSONDecodeError as e:
                        logger.warning(f"Strategy 2 failed: {e}")
                
                # Strategy 3: Extract JSON object with regex
                if insights is None:
                    try:
                        import re
                        # Look for JSON object pattern
                        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
                        if json_match:
                            extracted_json = json_match.group()
                            insights = json.loads(extracted_json)
                            logger.info("Strategy 3: Regex extraction successful")
                    except (json.JSONDecodeError, AttributeError) as e:
                        logger.warning(f"Strategy 3 failed: {e}")
                
                # Strategy 4: Try to fix common JSON issues
                if insights is None:
                    try:
                        # Fix common issues like missing quotes, trailing commas
                        fixed_content = content
                        # Remove trailing commas before closing braces/brackets
                        fixed_content = re.sub(r',(\s*[}\]])', r'\1', fixed_content)
                        # Ensure proper quote formatting
                        fixed_content = re.sub(r'([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1 "\2":', fixed_content)
                        
                        insights = json.loads(fixed_content)
                        logger.info("Strategy 4: Fixed JSON parsing successful")
                    except json.JSONDecodeError as e:
                        logger.warning(f"Strategy 4 failed: {e}")
                
                # If all strategies failed, log the content and raise error
                if insights is None:
                    logger.error(f"All JSON parsing strategies failed. Content: {content}")
                    logger.error(f"Original JSON error: {json_error}")
                    
                    if attempt == max_retries - 1:
                        raise Exception(f"Failed to parse AI response after {max_retries} attempts. Content: {content[:200]}...")
                    continue
                
                # Validate the insights structure
                required_keys = ["customer_behavior_insights", "performance_insights", "product_insights", "revenue_opportunities"]
                if all(key in insights for key in required_keys):
                    logger.info("AI insights validation successful")
                    return insights
                else:
                    logger.warning(f"AI insights missing required keys. Found: {list(insights.keys())}")
                    # Try to fix missing keys with default values
                    for key in required_keys:
                        if key not in insights:
                            insights[key] = []
                    logger.info("Added missing keys with default values")
                    return insights
                    
            except Exception as e:
                logger.error(f"AI insight generation failed on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error("CRITICAL: All AI insight generation attempts failed. Cannot proceed without AI insights.")
                    raise Exception(f"AI insight generation failed after {max_retries} attempts: {str(e)}")
                continue
        
        # This should never be reached, but just in case
        raise Exception("AI insight generation failed - unexpected error")
    
    async def _generate_rule_suggestions(self, data: Dict[str, Any], insights: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """Generate specific upsell rule suggestions based on actual data analysis"""
        
        # First, let's analyze the actual data to create data-driven rules
        data_analysis = self._analyze_data_for_rules(data)
        
        # Create a much simpler, more focused prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert e-commerce analyst. Create specific, data-driven upsell rules based on the provided business data.

CRITICAL: You must return ONLY a valid JSON array. No explanations, no markdown, no extra text. Just pure JSON.

UpsellEngine Rule Schema (EXACT format required):
{
  "name": "Rule Name",
  "description": "Optional description",
  "trigger_type": "category" | "cart_value" | "time_based",
  "trigger_conditions": {
    // Varies by trigger_type (see details below)
  },
  "target_products": ["product_id_1", "product_id_2"],
  "ai_copy_id": "optional_template_id",
  "display_type": "popup" | "cart" | "checkout",
  "display_settings": {},
  "priority": 0,
  "status": "draft" | "active" | "inactive",
  "use_ai": false
}

Trigger Types:
1. Cart Value: {"cart_value_operator": "greater_than"|"less_than"|"between", "cart_value": 100.00, "cart_value_min": 50.00, "cart_value_max": 200.00}
2. Category: {"category": "Electronics", "category_operator": "contains"|"equals"|"not_contains"}
3. Time-based: {"time_on_site_operator": "greater_than"|"less_than"|"equals"|"between", "time_on_site_min": 60, "time_on_site_max": 300}

Example format:
[
  {
    "name": "High-Value Cart Upsell",
    "description": "Show premium products when cart value exceeds $100",
    "trigger_type": "cart_value",
    "trigger_conditions": {
      "cart_value_operator": "greater_than",
      "cart_value": 100.00
    },
    "target_products": ["product_id_1", "product_id_2"],
    "display_type": "popup",
    "display_settings": {},
    "priority": 4,
    "status": "draft"
  }
]

IMPORTANT: Return ONLY the JSON array. No explanations."""),
            ("user", f"""Based on this business data, create 5-7 diverse upsell rules:

BUSINESS DATA:
- Product Price Range: ${data_analysis['price_range']['min']} - ${data_analysis['price_range']['max']} (avg: ${data_analysis['price_range']['average']})
- Total Orders: {data_analysis['total_orders']}
- Cart Events: {data_analysis['total_cart_events']}
- Existing Campaigns: {data_analysis['existing_campaigns']}
- Existing Rules: {data_analysis['existing_rules']}
- Sample Products: {data_analysis['sample_products']}
- Order Patterns: {data_analysis['order_patterns']}

Create a MIX of rule types:
1. 2-3 cart_value rules (different thresholds: entry-level, mid-range, premium)
2. 1-2 category rules (if different product categories exist)
3. 1-2 time_based rules (engagement, abandonment recovery)
4. Use actual price thresholds and business data
5. Include target_products array with product IDs
6. Use correct trigger_conditions format for each type
7. Set appropriate display_type (popup/cart/checkout)
8. Vary priority levels (3-9)

Return ONLY the JSON array. No explanations."""),
        ])
        
        try:
            response = await self.model.ainvoke(prompt.format_messages())
            
            # Clean and parse the response
            content = response.content.strip()
            logger.info(f"AI response content: {content[:200]}...")  # Log first 200 chars
            
            # Remove any markdown formatting
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Try to parse the JSON
            try:
                rules = json.loads(content)
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON parsing error: {json_error}")
                logger.error(f"Content that failed to parse: {content}")
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    try:
                        rules = json.loads(json_match.group())
                        logger.info("Successfully extracted JSON from response")
                    except:
                        logger.error("Failed to extract JSON from AI response. AI rules are required.")
                        raise Exception("AI rule generation failed: Could not extract JSON from AI response.")
                else:
                    logger.error("No JSON array found in AI response. AI rules are required.")
                    raise Exception("AI rule generation failed: No JSON array found in AI response.")
            
            if isinstance(rules, list) and len(rules) > 0:
                logger.info(f"Successfully generated {len(rules)} AI-driven rules")
                
                # Process each rule to ensure it matches UpsellEngine schema
                processed_rules = []
                for rule in rules:
                    processed_rule = self._process_rule_for_upsell_engine(rule, data_analysis, data.get('shopify_products', []))
                    if processed_rule:
                        processed_rules.append(processed_rule)
                
                # Log the exact JSON structure being returned
                for i, rule in enumerate(processed_rules):
                    logger.info(f"Rule {i+1} JSON structure: {json.dumps(rule, indent=2)}")
                
                return processed_rules
            else:
                logger.error("AI returned empty or invalid rules. AI rules are required.")
                raise Exception("AI rule generation failed: AI returned empty or invalid rules.")
                
        except Exception as e:
            logger.error(f"Error generating AI rules: {str(e)}")
            logger.error("CRITICAL: AI rules are required. No fallback allowed.")
            raise Exception(f"AI rule generation failed: {str(e)}")
    
    def _process_rule_for_upsell_engine(self, rule: Dict[str, Any], analysis: Dict[str, Any], products: List[Dict]) -> Dict[str, Any]:
        """Process AI-generated rule to match UpsellEngine schema exactly"""
        
        # Ensure required fields are present
        processed_rule = {
            "name": rule.get("name", "AI Generated Rule"),
            "description": rule.get("description", ""),
            "trigger_type": rule.get("trigger_type", "cart_value"),
            "trigger_conditions": rule.get("trigger_conditions", {}),
            "target_products": rule.get("target_products", []),
            "display_type": rule.get("display_type", "popup"),
            "display_settings": rule.get("display_settings", {}),
            "priority": rule.get("priority", 5),
            "status": rule.get("status", "draft"),
            "use_ai": rule.get("use_ai", True)
        }
        
        # Add ai_copy_id if not present
        if "ai_copy_id" not in processed_rule:
            processed_rule["ai_copy_id"] = None
        
        # Ensure target_products is populated if empty
        if not processed_rule["target_products"]:
            processed_rule["target_products"] = self._select_target_products(
                products, 
                processed_rule["trigger_type"], 
                processed_rule["trigger_conditions"], 
                analysis
            )
        
        # Validate trigger_conditions format
        processed_rule["trigger_conditions"] = self._validate_trigger_conditions(
            processed_rule["trigger_type"], 
            processed_rule["trigger_conditions"]
        )
        
        return processed_rule
    
    def _validate_trigger_conditions(self, trigger_type: str, conditions: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and format trigger_conditions to match UpsellEngine schema"""
        
        if trigger_type == "cart_value":
            # Ensure cart value conditions are properly formatted
            validated = {
                "cart_value_operator": conditions.get("cart_value_operator", "greater_than"),
                "cart_value": conditions.get("cart_value", 100.00)
            }
            
            # Add min/max for between operator
            if validated["cart_value_operator"] == "between":
                validated["cart_value_min"] = conditions.get("cart_value_min", 50.00)
                validated["cart_value_max"] = conditions.get("cart_value_max", 200.00)
            
            return validated
            
        elif trigger_type == "category":
            return {
                "category": conditions.get("category", "Electronics"),
                "category_operator": conditions.get("category_operator", "contains")
            }
            
        elif trigger_type == "time_based":
            validated = {
                "time_on_site_operator": conditions.get("time_on_site_operator", "greater_than"),
                "time_on_site_min": conditions.get("time_on_site_min", 60)
            }
            
            # Add max for between operator
            if validated["time_on_site_operator"] == "between":
                validated["time_on_site_max"] = conditions.get("time_on_site_max", 300)
            
            return validated
            
        else:
            # Default to cart_value
            return {
                "cart_value_operator": "greater_than",
                "cart_value": 100.00
            }
    
    def _analyze_data_for_rules(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze actual data to create data-driven insights"""
        
        products = data.get('shopify_products', [])
        orders = data.get('shopify_orders', [])
        cart_events = data.get('cart_events', [])
        
        # DEBUG: Log raw data
        logger.info(f"=== DATA ANALYSIS DEBUG ===")
        logger.info(f"Raw products count: {len(products)}")
        logger.info(f"Raw orders count: {len(orders)}")
        logger.info(f"Raw cart_events count: {len(cart_events)}")
        
        if products:
            logger.info(f"Sample product: {products[0]}")
        if orders:
            logger.info(f"Sample order: {orders[0]}")
        if cart_events:
            logger.info(f"Sample cart event: {cart_events[0]}")
        
        # Analyze product pricing
        prices = [p.get('price', 0) for p in products if p.get('price')]
        logger.info(f"Product prices found: {len(prices)} out of {len(products)} products")
        logger.info(f"Price values: {prices[:5]}")  # Show first 5 prices
        
        price_analysis = {
            'min': min(prices) if prices else 0,
            'max': max(prices) if prices else 0,
            'average': sum(prices) / len(prices) if prices else 0,
            'count': len(prices)
        }
        logger.info(f"Price analysis: {price_analysis}")
        
        # Analyze order patterns
        order_totals = [o.get('total_price', 0) for o in orders if o.get('total_price')]
        logger.info(f"Order totals found: {len(order_totals)} out of {len(orders)} orders")
        logger.info(f"Order total values: {order_totals[:5]}")  # Show first 5 order totals
        
        order_analysis = {
            'total_orders': len(orders),
            'avg_order_value': sum(order_totals) / len(order_totals) if order_totals else 0,
            'min_order': min(order_totals) if order_totals else 0,
            'max_order': max(order_totals) if order_totals else 0
        }
        logger.info(f"Order analysis: {order_analysis}")
        
        # Analyze cart behavior
        cart_analysis = {
            'total_cart_events': len(cart_events),
            'abandonment_rate': self._calculate_abandonment_rate(cart_events, orders),
            'avg_cart_value': self._calculate_avg_cart_value(cart_events)
        }
        logger.info(f"Cart analysis: {cart_analysis}")
        
        # Sample product names for context
        sample_products = [p.get('title', 'Unknown')[:20] for p in products[:3]]
        logger.info(f"Sample products: {sample_products}")
        
        analysis_result = {
            'price_range': price_analysis,
            'total_orders': len(orders),
            'total_cart_events': len(cart_events),
            'existing_campaigns': len(data.get('campaigns', [])),
            'existing_rules': len(data.get('upsell_rules', [])),
            'sample_products': sample_products,
            'order_patterns': order_analysis,
            'cart_patterns': cart_analysis
        }
        
        logger.info(f"=== FINAL ANALYSIS RESULT ===")
        logger.info(f"Analysis result: {json.dumps(analysis_result, indent=2)}")
        
        return analysis_result
    
    def _select_target_products(self, products: List[Dict], rule_type: str, conditions: Dict, analysis: Dict) -> List[str]:
        """Select appropriate target products based on rule type and conditions"""
        if not products:
            logger.warning("No products available for target selection")
            return []
        available_products = [
            {
                'id': p.get('id'),
                'price': p.get('price', 0),
                'title': p.get('title', 'Unknown'),
                'category': p.get('product_type', 'general')
            }
            for p in products if p.get('id') and p.get('price')
        ]
        if not available_products:
            logger.warning("No valid products with ID and price found")
            return []
        available_products.sort(key=lambda x: x['price'])
        logger.info(f"Available products for selection: {len(available_products)} products")
        logger.info(f"Product price range: ${available_products[0]['price']} - ${available_products[-1]['price']}")
        
        if rule_type == "cart_value":
            # Use the correct key for cart value
            cart_threshold = conditions.get('cart_value', 0)
            if isinstance(cart_threshold, list):
                cart_threshold = cart_threshold[-1]  # Use upper bound for between
            logger.info(f"Cart threshold for product selection: ${cart_threshold}")
            logger.info(f"Average product price: ${analysis['price_range']['average']}")
            
            if cart_threshold > analysis['price_range']['average'] * 1.2:
                premium_products = [p for p in available_products if p['price'] > analysis['price_range']['average']]
                selected_products = [p['id'] for p in premium_products[:2]]
                logger.info(f"Selected premium products: {selected_products}")
                return selected_products
            elif cart_threshold > analysis['price_range']['average'] * 0.8:
                mid_products = [p for p in available_products 
                              if analysis['price_range']['average'] * 0.6 <= p['price'] <= analysis['price_range']['average'] * 1.4]
                selected_products = [p['id'] for p in mid_products[:3]]
                logger.info(f"Selected mid-range products: {selected_products}")
                return selected_products
            else:
                entry_products = [p for p in available_products if p['price'] <= analysis['price_range']['average'] * 0.8]
                selected_products = [p['id'] for p in entry_products[:2]]
                logger.info(f"Selected entry-level products: {selected_products}")
                return selected_products
        elif rule_type == "time_based":
            mid_products = [p for p in available_products 
                           if analysis['price_range']['average'] * 0.5 <= p['price'] <= analysis['price_range']['average'] * 1.5]
            selected_products = [p['id'] for p in mid_products[:3]]
            logger.info(f"Selected time-based products: {selected_products}")
            return selected_products
        elif rule_type == "category":
            # For category rules, select products from different categories
            target_category = conditions.get('category', 'general')
            category_products = [p for p in available_products if p['category'] != target_category]
            if category_products:
                selected_products = [p['id'] for p in category_products[:2]]
                logger.info(f"Selected category cross-sell products: {selected_products}")
                return selected_products
            else:
                # Fallback to general products
                selected_products = [p['id'] for p in available_products[:2]]
                logger.info(f"Selected fallback category products: {selected_products}")
                return selected_products
        else:
            selected_products = [p['id'] for p in available_products[:3]]
            logger.info(f"Selected default products: {selected_products}")
            return selected_products
    
    def _generate_data_driven_rules(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate rules based on actual data analysis - FORCE diverse rule types"""
        
        analysis = self._analyze_data_for_rules(data)
        products = data.get('shopify_products', [])
        existing_rules = data.get('upsell_rules', [])
        
        # Add debugging logs
        logger.info(f"=== RULE GENERATION DEBUG ===")
        logger.info(f"Data analysis for rules: {analysis}")
        logger.info(f"Number of products: {len(products)}")
        logger.info(f"Number of existing rules: {len(existing_rules)}")
        
        # Get existing rule names to avoid duplicates
        existing_rule_names = [rule.get('name', '') for rule in existing_rules]
        logger.info(f"Existing rule names: {existing_rule_names}")
        
        rules = []
        
        # FORCE GENERATION: Always create diverse rule types regardless of data conditions
        
        # Rule 1: Cart Value Rule (Entry Level)
        rule_name = "Entry-Level Cart Completion"
        if rule_name not in existing_rule_names:
            cart_threshold = max(25, int(analysis['price_range']['average'] * 0.8))
            logger.info(f"Generating Entry-Level Cart Completion rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            rules.append({
                "name": rule_name,
                "description": f"Encourage customers to add one more item when cart reaches ${cart_threshold}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "ai_copy_id": None,
                "display_type": "popup",
                "display_settings": {},
                "priority": 5,
                "status": "draft",
                "use_ai": False
            })
        
        # Rule 2: Cart Value Rule (Mid Range)
        rule_name = "Mid-Range Upsell"
        if rule_name not in existing_rule_names:
            cart_threshold = max(50, int(analysis['price_range']['average'] * 1.2))
            logger.info(f"Generating Mid-Range Upsell rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            rules.append({
                "name": rule_name,
                "description": f"Show premium products when cart value exceeds ${cart_threshold}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "ai_copy_id": None,
                "display_type": "popup",
                "display_settings": {},
                "priority": 6,
                "status": "draft",
                "use_ai": False
            })
        
        # Rule 3: Cart Value Rule (High Value)
        rule_name = "High-Value Customer Targeting"
        if rule_name not in existing_rule_names:
            cart_threshold = max(100, int(analysis['order_patterns']['avg_order_value'] * 0.8))
            logger.info(f"Generating High-Value Customer rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            rules.append({
                "name": rule_name,
                "description": f"Target high-value customers with cart values above ${cart_threshold}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "ai_copy_id": None,
                "display_type": "popup",
                "display_settings": {},
                "priority": 7,
                "status": "draft",
                "use_ai": False
            })
        
        # Rule 4: Time-Based Rule (Always generate)
        rule_name = "Time-Based Engagement"
        if rule_name not in existing_rule_names:
            logger.info("Generating Time-Based Engagement rule")
            conditions = {
                "time_on_site_operator": "greater_than",
                "time_on_site_min": 180
            }
            rules.append({
                "name": rule_name,
                "description": "Engage customers who spend significant time browsing",
                "trigger_type": "time_based",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "time_based", conditions, analysis),
                "ai_copy_id": None,
                "display_type": "popup",
                "display_settings": {},
                "priority": 4,
                "status": "draft",
                "use_ai": False
            })
        
        # Rule 5: Category Rule (Always generate if products exist)
        if len(products) > 0:
            categories = list(set([p.get('product_type', 'general') for p in products if p.get('product_type')]))
            if not categories:
                categories = ['general']
            
            rule_name = f"Category Engagement ({categories[0]})"
            if rule_name not in existing_rule_names:
                logger.info(f"Generating Category Engagement rule for {categories[0]}")
                conditions = {
                    "category": categories[0],
                    "category_operator": "contains"
                }
                rules.append({
                    "name": rule_name,
                    "description": f"Engage customers browsing {categories[0]} products",
                    "trigger_type": "category",
                    "trigger_conditions": conditions,
                    "target_products": self._select_target_products(products, "category", conditions, analysis),
                    "ai_copy_id": None,
                    "display_type": "popup",
                    "display_settings": {},
                    "priority": 5,
                    "status": "draft",
                    "use_ai": False
                })
        
        # Rule 6: Cart Range Rule (Between operator)
        rule_name = "Cart Value Range Upsell"
        if rule_name not in existing_rule_names:
            min_threshold = max(20, int(analysis['price_range']['min'] * 0.8))
            max_threshold = max(80, int(analysis['price_range']['average'] * 1.2))
            logger.info(f"Generating Cart Value Range rule: ${min_threshold}-${max_threshold}")
            conditions = {
                "cart_value_operator": "between",
                "cart_value_min": min_threshold,
                "cart_value_max": max_threshold
            }
            rules.append({
                "name": rule_name,
                "description": f"Upsell customers with cart values between ${min_threshold} and ${max_threshold}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "ai_copy_id": None,
                "display_type": "popup",
                "display_settings": {},
                "priority": 6,
                "status": "draft",
                "use_ai": False
            })
        
        logger.info(f"Generated {len(rules)} diverse rules: {[r['trigger_type'] for r in rules]}")
        return rules
    
    def _calculate_abandonment_rate(self, cart_events: List[Dict], orders: List[Dict]) -> float:
        """Calculate cart abandonment rate based on actual data"""
        if not cart_events:
            return 0.0
        
        # Simple calculation: orders / cart events
        return 1 - (len(orders) / len(cart_events)) if len(cart_events) > 0 else 0.0
    
    def _calculate_avg_cart_value(self, cart_events: List[Dict]) -> float:
        """Calculate average cart value from cart events"""
        if not cart_events:
            return 0.0
        
        cart_values = [event.get('cart_total', 0) for event in cart_events if event.get('cart_total')]
        return sum(cart_values) / len(cart_values) if cart_values else 0.0
    
    async def _generate_campaign_suggestions(self, data: Dict[str, Any], insights: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """Generate data-driven campaign suggestions based on actual business data"""
        
        # Analyze data for campaign creation
        data_analysis = self._analyze_data_for_campaigns(data)
        
        # Create a simpler, focused prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert e-commerce marketer. Create specific, data-driven campaigns based on the provided business data.

IMPORTANT: Return ONLY valid JSON array. No explanations, no markdown, just pure JSON.

Example format:
[
  {
    "name": "Campaign Name",
    "description": "Description",
    "campaign_type": "popup",
    "trigger_type": "exit_intent",
    "trigger_delay": 0,
    "trigger_scroll_percentage": 50,
    "target_pages": ["/cart", "/checkout"],
    "excluded_pages": [],
    "settings": {"position": "center", "style": "modern"},
    "content": {"title": "Title", "message": "Message", "cta_text": "CTA", "offer": "Offer"},
    "expected_impact": "high",
    "implementation_notes": "Notes"
  }
]"""),
            ("user", f"""Based on this business data, create 3-5 specific campaigns:

BUSINESS DATA:
- Product Price Range: ${data_analysis['price_range']['min']} - ${data_analysis['price_range']['max']} (avg: ${data_analysis['price_range']['average']})
- Total Orders: {data_analysis['total_orders']}
- Cart Events: {data_analysis['total_cart_events']}
- Abandonment Rate: {data_analysis['abandonment_rate']:.1%}
- Average Order Value: ${data_analysis['avg_order_value']:.0f}
- Sample Products: {data_analysis['sample_products']}

Create campaigns that:
1. Address real customer behavior patterns
2. Use actual pricing data for offers
3. Target specific abandonment or conversion issues
4. Have realistic impact expectations
5. Include specific implementation strategies

Return ONLY the JSON array."""),
        ])
        
        try:
            response = await self.model.ainvoke(prompt.format_messages())
            
            # Clean and parse the response
            content = response.content.strip()
            
            # Remove any markdown formatting
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Try to parse the JSON
            try:
                campaigns = json.loads(content)
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON parsing error: {json_error}")
                logger.error(f"Content that failed to parse: {content}")
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    try:
                        campaigns = json.loads(json_match.group())
                        logger.info("Successfully extracted JSON from response")
                    except:
                        logger.error("Failed to extract JSON from AI response. AI campaigns are required.")
                        raise Exception("AI campaign generation failed: Could not extract JSON from AI response.")
                else:
                    logger.error("No JSON array found in AI response. AI campaigns are required.")
                    raise Exception("AI campaign generation failed: No JSON array found in AI response.")
            
            if isinstance(campaigns, list) and len(campaigns) > 0:
                logger.info(f"Successfully generated {len(campaigns)} AI-driven campaigns")
                return campaigns
            else:
                logger.error("AI returned empty or invalid campaigns. AI campaigns are required.")
                raise Exception("AI campaign generation failed: AI returned empty or invalid campaigns.")
                
        except Exception as e:
            logger.error(f"Error generating AI campaigns: {str(e)}")
            logger.error("CRITICAL: AI campaigns are required. No fallback allowed.")
            raise Exception(f"AI campaign generation failed: {str(e)}")
    
    def _analyze_data_for_campaigns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze actual data to create data-driven campaign insights"""
        
        products = data.get('shopify_products', [])
        orders = data.get('shopify_orders', [])
        cart_events = data.get('cart_events', [])
        
        # Analyze product pricing
        prices = [p.get('price', 0) for p in products if p.get('price')]
        price_analysis = {
            'min': min(prices) if prices else 0,
            'max': max(prices) if prices else 0,
            'average': sum(prices) / len(prices) if prices else 0,
            'count': len(prices)
        }
        
        # Analyze order patterns
        order_totals = [o.get('total_price', 0) for o in orders if o.get('total_price')]
        avg_order_value = sum(order_totals) / len(order_totals) if order_totals else 0
        
        # Calculate abandonment rate
        abandonment_rate = self._calculate_abandonment_rate(cart_events, orders)
        
        # Sample product names for context
        sample_products = [p.get('title', 'Unknown')[:20] for p in products[:3]]
        
        return {
            'price_range': price_analysis,
            'total_orders': len(orders),
            'total_cart_events': len(cart_events),
            'abandonment_rate': abandonment_rate,
            'avg_order_value': avg_order_value,
            'sample_products': sample_products
        }
    
    def _generate_data_driven_campaigns(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate campaigns based on actual data analysis - no generic fallbacks"""
        
        analysis = self._analyze_data_for_campaigns(data)
        campaigns = []
        
        # Campaign 1: Premium Product Campaign (based on max price)
        if analysis['price_range']['max'] > 100:
            discount_amount = int(analysis['price_range']['max'] * 0.15)  # 15% of max price
            campaigns.append({
                "name": f"Premium Product Campaign (${analysis['price_range']['max']})",
                "description": f"Promote premium ${analysis['price_range']['max']} products with strategic discount",
                "campaign_type": "popup",
                "trigger_type": "exit_intent",
                "trigger_delay": 0,
                "trigger_scroll_percentage": 50,
                "target_pages": ["/cart", "/checkout", "/product"],
                "excluded_pages": [],
                "settings": {
                    "position": "center",
                    "style": "premium"
                },
                "content": {
                    "title": f"Upgrade to Premium - Save ${discount_amount}",
                    "message": f"Get our premium ${analysis['price_range']['max']} product with exclusive discount",
                    "cta_text": "Upgrade Now",
                    "offer": f"${discount_amount} off premium products"
                },
                "expected_impact": "high",
                "implementation_notes": f"Target customers showing interest in premium ${analysis['price_range']['max']} products"
            })
        
        # Campaign 2: Cart Completion (based on abandonment rate)
        if analysis['abandonment_rate'] > 0.2:  # If abandonment > 20%
            completion_discount = int(analysis['price_range']['average'] * 0.1)  # 10% of average price
            campaigns.append({
                "name": "Cart Completion Campaign",
                "description": f"Reduce {analysis['abandonment_rate']:.1%} abandonment rate with completion incentives",
                "campaign_type": "popup",
                "trigger_type": "exit_intent",
                "trigger_delay": 0,
                "trigger_scroll_percentage": 30,
                "target_pages": ["/cart"],
                "excluded_pages": [],
                "settings": {
                    "position": "center",
                    "style": "urgent"
                },
                "content": {
                    "title": "Complete Your Order - Save Now!",
                    "message": f"Don't lose your cart! Complete your order and save ${completion_discount}",
                    "cta_text": "Complete Order",
                    "offer": f"${completion_discount} off when you complete your order"
                },
                "expected_impact": "high",
                "implementation_notes": f"Target {analysis['abandonment_rate']:.1%} cart abandonment rate with completion incentives"
            })
        
        # Campaign 3: Average Order Value Boost (based on current AOV)
        if analysis['avg_order_value'] > 0:
            aov_boost_target = int(analysis['avg_order_value'] * 1.2)  # 20% increase target
            boost_discount = int(analysis['price_range']['average'] * 0.05)  # 5% of average price
            campaigns.append({
                "name": f"AOV Boost Campaign (${analysis['avg_order_value']:.0f} → ${aov_boost_target})",
                "description": f"Increase average order value from ${analysis['avg_order_value']:.0f} to ${aov_boost_target}",
                "campaign_type": "popup",
                "trigger_type": "cart_add",
                "trigger_delay": 2,
                "trigger_scroll_percentage": 0,
                "target_pages": ["/cart"],
                "excluded_pages": [],
                "settings": {
                    "position": "bottom",
                    "style": "subtle"
                },
                "content": {
                    "title": f"Add ${aov_boost_target - analysis['avg_order_value']:.0f} More - Save ${boost_discount}",
                    "message": f"Add just ${aov_boost_target - analysis['avg_order_value']:.0f} more to your cart and save ${boost_discount}",
                    "cta_text": "Add Item",
                    "offer": f"${boost_discount} off when you reach ${aov_boost_target}"
                },
                "expected_impact": "medium",
                "implementation_notes": f"Boost AOV from ${analysis['avg_order_value']:.0f} to ${aov_boost_target} with targeted incentives"
            })
        
        # Campaign 4: Entry-Level Upgrade (based on minimum price)
        if analysis['price_range']['min'] > 0 and analysis['price_range']['average'] > analysis['price_range']['min']:
            upgrade_savings = int((analysis['price_range']['average'] - analysis['price_range']['min']) * 0.2)
            campaigns.append({
                "name": f"Entry-Level Upgrade (${analysis['price_range']['min']} → ${analysis['price_range']['average']:.0f})",
                "description": f"Upgrade customers from ${analysis['price_range']['min']} to ${analysis['price_range']['average']:.0f} products",
                "campaign_type": "inline",
                "trigger_type": "page_load",
                "trigger_delay": 3,
                "trigger_scroll_percentage": 0,
                "target_pages": ["/product"],
                "excluded_pages": [],
                "settings": {
                    "position": "inline",
                    "style": "informative"
                },
                "content": {
                    "title": "Upgrade & Save",
                    "message": f"Upgrade from ${analysis['price_range']['min']} to premium ${analysis['price_range']['average']:.0f} products and save ${upgrade_savings}",
                    "cta_text": "Upgrade Now",
                    "offer": f"${upgrade_savings} off premium upgrade"
                },
                "expected_impact": "medium",
                "implementation_notes": f"Upgrade customers from ${analysis['price_range']['min']} to ${analysis['price_range']['average']:.0f} products"
            })
        
        # Campaign 5: New Customer Welcome (if low order count)
        if analysis['total_orders'] < 10:  # New business
            welcome_discount = int(analysis['price_range']['average'] * 0.1)
            campaigns.append({
                "name": "New Customer Welcome",
                "description": f"Welcome new customers with {analysis['total_orders']} orders to date",
                "campaign_type": "popup",
                "trigger_type": "page_load",
                "trigger_delay": 5,
                "trigger_scroll_percentage": 0,
                "target_pages": ["/"],
                "excluded_pages": ["/cart", "/checkout"],
                "settings": {
                    "position": "center",
                    "style": "welcoming"
                },
                "content": {
                    "title": "Welcome! Here's Your Discount",
                    "message": f"Welcome to our store! Get ${welcome_discount} off your first order",
                    "cta_text": "Start Shopping",
                    "offer": f"${welcome_discount} off first order"
                },
                "expected_impact": "high",
                "implementation_notes": f"Welcome new customers with {analysis['total_orders']} total orders"
            })
        
        logger.info(f"Generated {len(campaigns)} data-driven campaigns based on actual business data")
        return campaigns
    
    async def _generate_priority_actions(self, insights: Dict[str, Any], rules: List[Dict], campaigns: List[Dict]) -> List[Dict[str, Any]]:
        """Generate priority actions based on insights and suggestions"""
        
        priority_actions = []
        
        # Add high-impact insights as priority actions
        for insight_type, insight_list in insights.items():
            if isinstance(insight_list, list):
                for insight in insight_list:
                    if isinstance(insight, dict) and insight.get('impact') == 'high':
                        priority_actions.append({
                            "name": f"High Impact {insight_type.replace('_', ' ').title()}",
                            "description": insight.get('insight', insight.get('opportunity', '')),
                            "priority": "high",
                            "action": insight.get('action', insight.get('implementation', '')),
                            "type": "insight"
                        })
        
        # Add high-impact rules as priority actions
        for rule in rules:
            if rule.get('expected_impact') == 'high':
                priority_actions.append({
                    "name": f"Implement Rule: {rule.get('name', '')}",
                    "description": rule.get('description', ''),
                    "priority": "high",
                    "action": f"Create upsell rule: {rule.get('name', '')}",
                    "type": "rule",
                    "rule_data": rule
                })
        
        # Add high-impact campaigns as priority actions
        for campaign in campaigns:
            if campaign.get('expected_impact') == 'high':
                priority_actions.append({
                    "name": f"Launch Campaign: {campaign.get('name', '')}",
                    "description": campaign.get('description', ''),
                    "priority": "high",
                    "action": f"Create campaign: {campaign.get('name', '')}",
                    "type": "campaign",
                    "campaign_data": campaign
                })
        
        return priority_actions[:5]  # Limit to top 5 priority actions
    
    def _create_data_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of the data for analysis"""
        # Filter for active rules and campaigns
        active_campaigns = [c for c in data.get('campaigns', []) if c.get('status') == 'active']
        active_rules = [r for r in data.get('upsell_rules', []) if r.get('status') == 'active']
        
        return {
            "customer_behavior": {
                "total_orders": len(data.get('shopify_orders', [])),
                "total_cart_events": len(data.get('cart_events', [])),
                "analysis_period_days": data.get('analysis_period_days', 30)
            },
            "performance": {
                "total_upsell_events": len(data.get('upsell_events', [])),
                "total_campaigns": len(active_campaigns),  # Only active campaigns
                "total_rules": len(active_rules)           # Only active rules
            },
            "products": {
                "total_products": len(data.get('shopify_products', [])),
                "product_price_range": self._get_product_price_range(data.get('shopify_products', []))
            },
            "user_profile": {
                "plan_type": data.get('profiles', {}).get('plan_type', 'unknown'),
                "company_name": data.get('profiles', {}).get('company_name', 'unknown')
            },
            "campaign_status_breakdown": self._get_campaign_status_breakdown(data.get('campaigns', [])),
            "rule_type_breakdown": self._get_rule_type_breakdown(data.get('upsell_rules', []))
        }
    
    def _get_campaign_status_breakdown(self, campaigns: List[Dict]) -> Dict[str, int]:
        """Get breakdown of campaign statuses"""
        breakdown = {}
        for campaign in campaigns:
            status = campaign.get('status', 'unknown')
            breakdown[status] = breakdown.get(status, 0) + 1
        return breakdown
    
    def _get_rule_type_breakdown(self, rules: List[Dict]) -> Dict[str, int]:
        """Get breakdown of rule types"""
        breakdown = {}
        for rule in rules:
            rule_type = rule.get('rule_type', 'unknown')
            breakdown[rule_type] = breakdown.get(rule_type, 0) + 1
        return breakdown
    
    def _get_product_price_range(self, products: List[Dict]) -> Dict[str, Any]:
        """Get product price range information"""
        if not products:
            return {"min": 0, "max": 0, "average": 0}
        
        prices = [p.get('price', 0) for p in products if p.get('price')]
        if not prices:
            return {"min": 0, "max": 0, "average": 0}
        
        return {
            "min": min(prices),
            "max": max(prices),
            "average": sum(prices) / len(prices)
        }
    
    def _generate_fallback_insights(self, data_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback insights when AI fails"""
        return {
            "customer_behavior_insights": [
                {
                    "insight": f"Analyzing {data_summary.get('customer_behavior', {}).get('total_orders', 0)} orders for patterns",
                    "impact": "medium",
                    "action": "Review order patterns for upsell opportunities",
                    "data": {
                        "total_orders": data_summary.get('customer_behavior', {}).get('total_orders', 0),
                        "total_cart_events": data_summary.get('customer_behavior', {}).get('total_cart_events', 0),
                        "analysis_period": data_summary.get('customer_behavior', {}).get('analysis_period_days', 30),
                        "confidence": 0.6
                    }
                }
            ],
            "performance_insights": [
                {
                    "insight": f"You have {data_summary.get('performance', {}).get('total_campaigns', 0)} campaigns and {data_summary.get('performance', {}).get('total_rules', 0)} rules",
                    "impact": "medium", 
                    "action": "Analyze campaign and rule performance",
                    "data": {
                        "total_campaigns": data_summary.get('performance', {}).get('total_campaigns', 0),
                        "total_rules": data_summary.get('performance', {}).get('total_rules', 0),
                        "total_upsell_events": data_summary.get('performance', {}).get('total_upsell_events', 0),
                        "recommended_minimum": 3,
                        "confidence": 0.8
                    }
                }
            ],
            "product_insights": [
                {
                    "insight": f"You have {data_summary.get('products', {}).get('total_products', 0)} products available for upsells",
                    "impact": "medium",
                    "action": "Review product catalog for bundling opportunities",
                    "data": {
                        "total_products": data_summary.get('products', {}).get('total_products', 0),
                        "price_range": data_summary.get('products', {}).get('product_price_range', {}),
                        "recommended_bundles": 2,
                        "confidence": 0.7
                    }
                }
            ],
            "revenue_opportunities": [
                {
                    "opportunity": "Increase upsell coverage",
                    "potential_impact": "10-20% revenue increase",
                    "implementation": "Create more targeted upsell rules and campaigns",
                    "data": {
                        "current_coverage": data_summary.get('performance', {}).get('total_rules', 0) + data_summary.get('performance', {}).get('total_campaigns', 0),
                        "recommended_coverage": 5,
                        "potential_revenue_increase": "10-20%",
                        "implementation_steps": [
                            "Create cart value-based upsell rules",
                            "Set up exit intent campaigns", 
                            "Implement product bundle suggestions"
                        ],
                        "estimated_impact": "medium",
                        "confidence": 0.7
                    }
                }
            ]
        }
    
    def _generate_fallback_rules(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback rules when AI fails"""
        return [
            {
                "name": "Cart Value Upsell",
                "description": "Show upsell when cart value is above threshold",
                "trigger_type": "cart_value",
                "trigger_conditions": {
                    "cart_value_operator": "greater_than",
                    "cart_value": 50
                },
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "cart_value_upsell"
                },
                "priority": 5,
                "expected_impact": "medium",
                "implementation_notes": "Create a campaign for cart value upsells"
            }
        ]
    
    def _generate_fallback_campaigns(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback campaigns when AI fails"""
        return [
            {
                "name": "Exit Intent Upsell",
                "description": "Show upsell when user tries to leave",
                "campaign_type": "popup",
                "trigger_type": "exit_intent",
                "trigger_delay": 0,
                "trigger_scroll_percentage": 50,
                "target_pages": ["/cart", "/checkout"],
                "excluded_pages": [],
                "settings": {
                    "position": "center",
                    "style": "modern"
                },
                "content": {
                    "title": "Wait! Don't miss out on savings!",
                    "message": "Add one more item and get 10% off your entire order!",
                    "cta_text": "Add to Cart",
                    "offer": "10% off entire order"
                },
                "expected_impact": "medium",
                "implementation_notes": "Create exit intent popup campaign"
            }
        ]

    def _generate_demo_rules_with_defaults(self) -> List[Dict[str, Any]]:
        """Generate demo rules with sensible defaults when no data is available"""
        logger.info("Generating demo rules with default values")
        
        rules = []
        
        # Rule 1: Entry-Level Cart Completion
        rules.append({
            "name": "Entry-Level Cart Completion ($50)",
            "description": "Encourage customers to add one more item when cart reaches $50",
            "trigger_type": "cart_value",
            "trigger_conditions": {
                "cart_value_operator": "greater_than",
                "cart_value": 50.00
            },
            "target_products": [],
            "ai_copy_id": None,
            "display_type": "popup",
            "display_settings": {},
            "priority": 5,
            "status": "draft",
            "use_ai": False
        })
        
        # Rule 2: Mid-Range Upsell
        rules.append({
            "name": "Mid-Range Upsell ($100)",
            "description": "Show premium products when cart value exceeds $100",
            "trigger_type": "cart_value",
            "trigger_conditions": {
                "cart_value_operator": "greater_than",
                "cart_value": 100.00
            },
            "target_products": [],
            "ai_copy_id": None,
            "display_type": "popup",
            "display_settings": {},
            "priority": 6,
            "status": "draft",
            "use_ai": False
        })
        
        # Rule 3: Premium Upsell
        rules.append({
            "name": "Premium Upsell ($200)",
            "description": "Target high-value customers with premium product suggestions",
            "trigger_type": "cart_value",
            "trigger_conditions": {
                "cart_value_operator": "greater_than",
                "cart_value": 200.00
            },
            "target_products": [],
            "ai_copy_id": None,
            "display_type": "popup",
            "display_settings": {},
            "priority": 7,
            "status": "draft",
            "use_ai": False
        })
        
        # Rule 4: Time-Based Engagement
        rules.append({
            "name": "Time-Based Engagement (3+ minutes)",
            "description": "Engage customers who spend significant time browsing",
            "trigger_type": "time_based",
            "trigger_conditions": {
                "time_on_site_operator": "greater_than",
                "time_on_site_min": 180
            },
            "target_products": [],
            "ai_copy_id": None,
            "display_type": "popup",
            "display_settings": {},
            "priority": 4,
            "status": "draft",
            "use_ai": False
        })
        
        logger.info(f"Generated {len(rules)} demo rules with default values")
        return rules

# Initialize the agent
agent = CoralResearchAgent()

@app.get("/")
async def root():
    return {
        "message": "Coral Research Agent - Upsell Engine",
        "status": "running",
        "endpoints": {
            "POST /analyze": "Analyze user data and generate upsell insights",
            "GET /health": "Health check endpoint"
        },
        "environment": {
            "supabase_connected": supabase is not None,
            "groq_connected": model is not None
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "Coral Research Agent",
        "supabase_connected": supabase is not None,
        "groq_connected": model is not None
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_user_data(request: AnalysisRequest):
    try:
        logger.info(f"Starting analysis for user {request.user_id}")
        logger.info(f"Request data: {request.model_dump()}")
        
        # Determine time range (handle both field names)
        time_range = request.time_range_days or request.analysis_days or 30
        
        # Perform the analysis with sent data if available
        result = await agent.analyze_user_data(
            user_id=request.user_id,
            time_range_days=time_range,
            sent_data=request.data
        )
        
        logger.info(f"Analysis completed for user {request.user_id}")
        return AnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Analysis failed for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/debug")
async def debug_request(request: AnalysisRequest):
    """Debug endpoint to see what data is being sent"""
    try:
        logger.info(f"=== DEBUG REQUEST ===")
        logger.info(f"User ID: {request.user_id}")
        logger.info(f"Analysis Type: {request.analysis_type}")
        logger.info(f"Time Range Days: {request.time_range_days}")
        logger.info(f"Analysis Days: {request.analysis_days}")
        logger.info(f"Data is None: {request.data is None}")
        
        if request.data:
            logger.info("Processing sent data from UpsellEngine...")
            transformed_data = agent._transform_upsell_engine_data(request.data)
            logger.info(f"Transformed data result: {json.dumps(transformed_data, indent=2, default=str)}")
            
            return {
                "status": "success",
                "data_source": "upsell_engine",
                "user_id": request.user_id,
                "data_summary": {
                    "products": len(request.data.get('products', [])),
                    "orders": len(request.data.get('orders', [])),
                    "cart_events": len(request.data.get('cart_events', [])),
                    "campaigns": len(request.data.get('campaigns', [])),
                    "rules": len(request.data.get('existing_rules', []))
                },
                "sample_data": {
                    "sample_product": request.data.get('products', [{}])[0] if request.data.get('products') else None,
                    "sample_order": request.data.get('orders', [{}])[0] if request.data.get('orders') else None,
                    "sample_cart_event": request.data.get('cart_events', [{}])[0] if request.data.get('cart_events') else None
                }
            }
        elif agent.supabase:
            logger.info("Testing Supabase connection...")
            data = await agent._fetch_user_data(request.user_id, request.time_range_days or 30)
            logger.info(f"Data fetch result: {json.dumps(data, indent=2, default=str)}")
            
            return {
                "status": "success",
                "data_source": "supabase",
                "user_id": request.user_id,
                "data_summary": {
                    "products": len(data.get('shopify_products', [])),
                    "orders": len(data.get('shopify_orders', [])),
                    "cart_events": len(data.get('cart_events', [])),
                    "campaigns": len(data.get('campaigns', [])),
                    "rules": len(data.get('upsell_rules', []))
                },
                "sample_data": {
                    "sample_product": data.get('shopify_products', [{}])[0] if data.get('shopify_products') else None,
                    "sample_order": data.get('shopify_orders', [{}])[0] if data.get('shopify_orders') else None,
                    "sample_cart_event": data.get('cart_events', [{}])[0] if data.get('cart_events') else None
                }
            }
        else:
            return {
                "status": "error",
                "message": "No data source available"
            }
            
    except Exception as e:
        logger.error(f"Debug request failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/test")
async def test_endpoint(request: AnalysisRequest):
    """Test endpoint to debug data issues"""
    try:
        logger.info(f"=== TEST ENDPOINT ===")
        logger.info(f"User ID: {request.user_id}")
        logger.info(f"Analysis Type: {request.analysis_type}")
        logger.info(f"Time Range Days: {request.time_range_days}")
        logger.info(f"Analysis Days: {request.analysis_days}")
        logger.info(f"Data is None: {request.data is None}")
        
        if request.data:
            logger.info(f"Data keys: {list(request.data.keys())}")
            logger.info(f"Products count: {len(request.data.get('products', []))}")
            logger.info(f"Orders count: {len(request.data.get('orders', []))}")
            
            # Test transformation
            transformed = agent._transform_upsell_engine_data(request.data)
            logger.info(f"Transformed successfully: {len(transformed.get('shopify_products', []))} products")
            
            return {
                "status": "success",
                "message": "Data received and transformed successfully",
                "data_summary": {
                    "products": len(request.data.get('products', [])),
                    "orders": len(request.data.get('orders', [])),
                    "cart_events": len(request.data.get('cart_events', [])),
                    "campaigns": len(request.data.get('campaigns', [])),
                    "rules": len(request.data.get('existing_rules', []))
                }
            }
        else:
            logger.warning("No data received from UpsellEngine")
            return {
                "status": "warning",
                "message": "No data received from UpsellEngine - using Supabase fallback",
                "data_source": "supabase"
            }
            
    except Exception as e:
        logger.error(f"Test endpoint failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5555))
    uvicorn.run(app, host="0.0.0.0", port=port) 