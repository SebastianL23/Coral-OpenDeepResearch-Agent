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
        
    async def analyze_user_data(self, user_id: str, time_range_days: int = 30) -> Dict[str, Any]:
        """Analyze user's data and generate insights"""
        logger.info(f"Starting analysis for user {user_id}")
        
        # Check if we have required services
        if not self.supabase:
            return await self._generate_demo_analysis(user_id, time_range_days)
        
        if not self.model:
            return await self._generate_fallback_analysis(user_id, time_range_days)
        
        # Get data from all relevant tables
        data = await self._fetch_user_data(user_id, time_range_days)
        
        # Generate insights using AI
        insights = await self._generate_insights(data, user_id)
        
        # Generate rule suggestions
        rule_suggestions = await self._generate_rule_suggestions(data, insights, user_id)
        
        # Generate campaign suggestions
        campaign_suggestions = await self._generate_campaign_suggestions(data, insights, user_id)
        
        # Generate priority actions
        priority_actions = await self._generate_priority_actions(insights, rule_suggestions, campaign_suggestions)
        
        return {
            "user_id": user_id,
            "analysis_timestamp": datetime.now().isoformat(),
            "insights": insights,
            "rule_suggestions": rule_suggestions,
            "campaign_suggestions": campaign_suggestions,
            "priority_actions": priority_actions,
            "data_summary": self._create_data_summary(data)
        }
    
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
                    "rule_type": "cart_value",
                    "conditions": {
                        "field": "cart_total",
                        "operator": "greater_than",
                        "value": 50
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
            
            # Shopify Products
            try:
                products_response = self.supabase.table('shopify_products').select('*').eq('user_id', user_id).execute()
                data["shopify_products"] = products_response.data if products_response.data else []
                logger.info(f"Found {len(data['shopify_products'])} shopify_products")
            except Exception as e:
                logger.warning(f"Could not fetch shopify_products: {str(e)}")
                # Try alternative table name
                try:
                    products_response = self.supabase.table('products').select('*').eq('user_id', user_id).execute()
                    data["shopify_products"] = products_response.data if products_response.data else []
                    logger.info(f"Found {len(data['shopify_products'])} products (alternative table)")
                except Exception as e2:
                    logger.warning(f"Could not fetch products either: {str(e2)}")
            
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
        """Generate insights from the data using AI"""
        
        # Create a summary of the data for AI analysis
        data_summary = self._create_data_summary(data)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence expert specializing in e-commerce upsell optimization. 
            Analyze the provided data and generate actionable insights for improving upsell performance.
            
            Focus on:
            1. Customer behavior patterns from orders and cart events
            2. Current upsell performance and campaign effectiveness
            3. Product performance and bundling opportunities
            4. Rule optimization opportunities
            5. Revenue optimization potential
            
            Provide specific, actionable insights that can be used to create better upsell rules and campaigns."""),
            ("user", f"""Analyze this e-commerce data and provide insights:
            
            {json.dumps(data_summary, indent=2)}
            
            Generate insights in this JSON format:
            {{
                "customer_behavior_insights": [
                    {{
                        "insight": "description",
                        "impact": "high/medium/low",
                        "action": "specific action to take"
                    }}
                ],
                "performance_insights": [
                    {{
                        "insight": "description", 
                        "impact": "high/medium/low",
                        "action": "specific action to take"
                    }}
                ],
                "product_insights": [
                    {{
                        "insight": "description",
                        "impact": "high/medium/low", 
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
            }}""")
        ])
        
        try:
            response = await self.model.ainvoke(prompt.format_messages())
            insights = json.loads(response.content)
            return insights
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return self._generate_fallback_insights(data_summary)
    
    async def _generate_rule_suggestions(self, data: Dict[str, Any], insights: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """Generate specific upsell rule suggestions in UpsellEngine format"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert in creating upsell rules for e-commerce. 
            Based on the customer behavior, performance data, and product data provided, generate specific, actionable upsell rules.
            
            Each rule should be in the exact format expected by the UpsellEngine system.
            
            Rule Types:
            - product_based: Triggered by specific products in cart
            - cart_value: Triggered by cart total value
            - customer_segment: Triggered by customer characteristics
            - time_based: Triggered by time factors
            
            Focus on creating rules that will increase revenue based on the actual data patterns."""),
            ("user", f"""Create upsell rules based on this data and insights:
            
            Customer Behavior Data: {json.dumps({
                'orders': len(data.get('shopify_orders', [])),
                'cart_events': len(data.get('cart_events', [])),
                'sample_orders': data.get('shopify_orders', [])[:3] if data.get('shopify_orders') else [],
                'sample_cart_events': data.get('cart_events', [])[:3] if data.get('cart_events') else []
            }, indent=2)}
            
            Performance Data: {json.dumps({
                'upsell_events': len(data.get('upsell_events', [])),
                'campaigns': len(data.get('campaigns', [])),
                'existing_rules': len(data.get('upsell_rules', []))
            }, indent=2)}
            
            Product Data: {json.dumps({
                'products': len(data.get('shopify_products', [])),
                'sample_products': data.get('shopify_products', [])[:3] if data.get('shopify_products') else []
            }, indent=2)}
            
            Insights: {json.dumps(insights, indent=2)}
            
            Generate rules in this EXACT JSON format for UpsellEngine:
            [
                {{
                    "name": "Descriptive rule name",
                    "description": "Clear description of what this rule does",
                    "rule_type": "product_based/cart_value/customer_segment/time_based",
                    "conditions": {{
                        "field": "cart_total/product_id/customer_segment/time",
                        "operator": "equals/greater_than/less_than/contains/in",
                        "value": "specific value or array"
                    }},
                    "actions": {{
                        "action_type": "show_campaign/add_product/apply_discount",
                        "campaign_id": "campaign_id_to_show",
                        "products": ["product_ids_to_add"],
                        "discount": "discount_percentage_or_amount"
                    }},
                    "priority": 1-10,
                    "expected_impact": "high/medium/low",
                    "implementation_notes": "Specific notes on how to implement this rule"
                }}
            ]
            
            Create 3-5 high-quality rules based on the actual data patterns you see.""")
        ])
        
        try:
            response = await self.model.ainvoke(prompt.format_messages())
            rules = json.loads(response.content)
            return rules if isinstance(rules, list) else []
        except Exception as e:
            logger.error(f"Error generating rules: {str(e)}")
            return self._generate_fallback_rules(data)
    
    async def _generate_campaign_suggestions(self, data: Dict[str, Any], insights: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """Generate campaign suggestions"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert in creating e-commerce campaigns for upsells.
            Based on the data and insights, generate specific campaign suggestions that will increase revenue."""),
            ("user", f"""Create campaign suggestions based on this data and insights:
            
            Data Summary: {json.dumps(self._create_data_summary(data), indent=2)}
            Insights: {json.dumps(insights, indent=2)}
            
            Generate campaigns in this JSON format:
            [
                {{
                    "name": "Campaign name",
                    "description": "What this campaign does",
                    "campaign_type": "popup/banner/modal/inline",
                    "trigger_type": "page_load/scroll/time_delay/exit_intent",
                    "trigger_delay": 0,
                    "trigger_scroll_percentage": 50,
                    "target_pages": ["/cart", "/checkout"],
                    "excluded_pages": [],
                    "settings": {{
                        "position": "top/bottom/center",
                        "style": "modern/minimal/bold"
                    }},
                    "content": {{
                        "title": "Campaign title",
                        "message": "Campaign message",
                        "cta_text": "Call to action",
                        "offer": "Special offer details"
                    }},
                    "expected_impact": "high/medium/low",
                    "implementation_notes": "How to implement"
                }}
            ]""")
        ])
        
        try:
            response = await self.model.ainvoke(prompt.format_messages())
            campaigns = json.loads(response.content)
            return campaigns if isinstance(campaigns, list) else []
        except Exception as e:
            logger.error(f"Error generating campaigns: {str(e)}")
            return self._generate_fallback_campaigns(data)
    
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
        return {
            "customer_behavior": {
                "total_orders": len(data.get('shopify_orders', [])),
                "total_cart_events": len(data.get('cart_events', [])),
                "analysis_period_days": data.get('analysis_period_days', 30)
            },
            "performance": {
                "total_upsell_events": len(data.get('upsell_events', [])),
                "total_campaigns": len(data.get('campaigns', [])),
                "total_rules": len(data.get('upsell_rules', []))
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
                    "action": "Review order patterns for upsell opportunities"
                }
            ],
            "performance_insights": [
                {
                    "insight": f"You have {data_summary.get('performance', {}).get('total_campaigns', 0)} campaigns and {data_summary.get('performance', {}).get('total_rules', 0)} rules",
                    "impact": "medium", 
                    "action": "Analyze campaign and rule performance"
                }
            ],
            "product_insights": [
                {
                    "insight": f"You have {data_summary.get('products', {}).get('total_products', 0)} products available for upsells",
                    "impact": "medium",
                    "action": "Review product catalog for bundling opportunities"
                }
            ],
            "revenue_opportunities": [
                {
                    "opportunity": "Increase upsell coverage",
                    "potential_impact": "10-20% revenue increase",
                    "implementation": "Create more targeted upsell rules and campaigns"
                }
            ]
        }
    
    def _generate_fallback_rules(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback rules when AI fails"""
        return [
            {
                "name": "Cart Value Upsell",
                "description": "Show upsell when cart value is above threshold",
                "rule_type": "cart_value",
                "conditions": {
                    "field": "cart_total",
                    "operator": "greater_than",
                    "value": 50
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
        
        # Perform the analysis
        result = await agent.analyze_user_data(
            user_id=request.user_id,
            time_range_days=request.time_range_days
        )
        
        logger.info(f"Analysis completed for user {request.user_id}")
        return AnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Analysis failed for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5555))
    uvicorn.run(app, host="0.0.0.0", port=port) 