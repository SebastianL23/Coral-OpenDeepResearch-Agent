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
        """Generate specific upsell rule suggestions based on actual data analysis"""
        
        # First, let's analyze the actual data to create data-driven rules
        data_analysis = self._analyze_data_for_rules(data)
        
        # Create a much simpler, more focused prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert e-commerce analyst. Create specific, data-driven upsell rules based on the provided business data.

IMPORTANT: Return ONLY valid JSON array. No explanations, no markdown, just pure JSON.

Example format:
[
  {
    "name": "Rule Name",
    "description": "Description",
    "trigger_type": "cart_value",
    "trigger_conditions": {"cart_value_operator": "greater_than", "cart_value": 100},
    "actions": {"action_type": "show_campaign", "campaign_id": "premium_upsell"},
    "priority": 5,
    "expected_impact": "high",
    "implementation_notes": "Notes"
  }
]"""),
            ("user", f"""Based on this business data, create 3-5 specific upsell rules:

BUSINESS DATA:
- Product Price Range: ${data_analysis['price_range']['min']} - ${data_analysis['price_range']['max']} (avg: ${data_analysis['price_range']['average']})
- Total Orders: {data_analysis['total_orders']}
- Cart Events: {data_analysis['total_cart_events']}
- Existing Campaigns: {data_analysis['existing_campaigns']}
- Existing Rules: {data_analysis['existing_rules']}
- Sample Products: {data_analysis['sample_products']}
- Order Patterns: {data_analysis['order_patterns']}

Create rules that:
1. Use actual price thresholds based on the data
2. Target specific product categories or price points
3. Address real customer behavior patterns
4. Have realistic priority levels (1-10)
5. Include specific implementation notes

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
            rules = json.loads(content)
            
            if isinstance(rules, list) and len(rules) > 0:
                logger.info(f"Successfully generated {len(rules)} AI-driven rules")
                
                # Log the exact JSON structure being returned
                for i, rule in enumerate(rules):
                    logger.info(f"Rule {i+1} JSON structure: {json.dumps(rule, indent=2)}")
                
                return rules
            else:
                logger.warning("AI returned empty or invalid rules, using data-driven fallback")
                return self._generate_data_driven_rules(data)
                
        except Exception as e:
            logger.error(f"Error generating AI rules: {str(e)}")
            logger.info("Falling back to data-driven rule generation")
            return self._generate_data_driven_rules(data)
    
    def _analyze_data_for_rules(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze actual data to create data-driven insights"""
        
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
        order_analysis = {
            'total_orders': len(orders),
            'avg_order_value': sum(order_totals) / len(order_totals) if order_totals else 0,
            'min_order': min(order_totals) if order_totals else 0,
            'max_order': max(order_totals) if order_totals else 0
        }
        
        # Analyze cart behavior
        cart_analysis = {
            'total_cart_events': len(cart_events),
            'abandonment_rate': self._calculate_abandonment_rate(cart_events, orders),
            'avg_cart_value': self._calculate_avg_cart_value(cart_events)
        }
        
        # Sample product names for context
        sample_products = [p.get('title', 'Unknown')[:20] for p in products[:3]]
        
        return {
            'price_range': price_analysis,
            'total_orders': len(orders),
            'total_cart_events': len(cart_events),
            'existing_campaigns': len(data.get('campaigns', [])),
            'existing_rules': len(data.get('upsell_rules', [])),
            'sample_products': sample_products,
            'order_patterns': order_analysis,
            'cart_patterns': cart_analysis
        }
    
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
        else:
            selected_products = [p['id'] for p in available_products[:3]]
            logger.info(f"Selected default products: {selected_products}")
            return selected_products
    
    def _generate_data_driven_rules(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate rules based on actual data analysis - no generic fallbacks"""
        
        analysis = self._analyze_data_for_rules(data)
        products = data.get('shopify_products', [])
        existing_rules = data.get('upsell_rules', [])
        
        # Add debugging logs
        logger.info(f"Data analysis for rules: {analysis}")
        logger.info(f"Number of products: {len(products)}")
        logger.info(f"Number of existing rules: {len(existing_rules)}")
        if products:
            logger.info(f"Sample product: {products[0]}")
        
        # Get existing rule names to avoid duplicates
        existing_rule_names = [rule.get('name', '') for rule in existing_rules]
        logger.info(f"Existing rule names: {existing_rule_names}")
        
        rules = []
        
        # Rule 1: Premium Product Upsell (based on actual max price)
        rule_name = f"Premium Product Upsell (${analysis['price_range']['max']})"
        if rule_name not in existing_rule_names and analysis['price_range']['max'] > 100:
            cart_threshold = int(analysis['price_range']['average'] * 1.5)
            logger.info(f"Generating Premium Product Upsell rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            logger.info(f"Cart Completion trigger_conditions: {conditions}")
            rules.append({
                "name": rule_name,
                "description": f"Target customers with high-value carts to promote premium ${analysis['price_range']['max']} products",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "premium_product_upsell"
                },
                "priority": 8,
                "expected_impact": "high",
                "implementation_notes": f"Target customers spending ${cart_threshold}+ to promote premium ${analysis['price_range']['max']} products"
            })
        
        # Rule 2: Mid-Range Cart Completion (based on average product price)
        rule_name = f"Cart Completion (${analysis['price_range']['average']:.0f} threshold)"
        if rule_name not in existing_rule_names and analysis['price_range']['average'] > 0:
            cart_threshold = int(analysis['price_range']['average'])
            logger.info(f"Generating Cart Completion rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            logger.info(f"Cart Completion trigger_conditions: {conditions}")
            rules.append({
                "name": rule_name,
                "description": f"Encourage customers to add one more item when cart reaches ${analysis['price_range']['average']:.0f}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "cart_completion_upsell"
                },
                "priority": 6,
                "expected_impact": "medium",
                "implementation_notes": f"Trigger when cart exceeds ${analysis['price_range']['average']:.0f} (average product price)"
            })
        
        # Rule 3: Entry-Level Upgrade (based on minimum price)
        rule_name = f"Entry-Level Upgrade (${analysis['price_range']['min']} → ${analysis['price_range']['average']:.0f})"
        if rule_name not in existing_rule_names and analysis['price_range']['min'] > 0:
            min_threshold = analysis['price_range']['min']
            max_threshold = int(analysis['price_range']['average'] * 0.8)
            logger.info(f"Generating Entry-Level Upgrade rule with cart range: ${min_threshold}-${max_threshold}")
            conditions = {
                "cart_value_operator": "between",
                "cart_value": [min_threshold, max_threshold]
            }
            logger.info(f"Entry-Level Upgrade trigger_conditions: {conditions}")
            rules.append({
                "name": rule_name,
                "description": f"Upgrade customers from ${analysis['price_range']['min']} items to ${analysis['price_range']['average']:.0f} average products",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "entry_level_upgrade"
                },
                "priority": 5,
                "expected_impact": "medium",
                "implementation_notes": f"Target customers with ${analysis['price_range']['min']}-${int(analysis['price_range']['average'] * 0.8)} carts for upgrades"
            })
        
        # Rule 4: High-Value Customer (based on order history)
        rule_name = f"High-Value Customer (${analysis['order_patterns']['avg_order_value']:.0f} AOV)"
        if rule_name not in existing_rule_names and analysis['order_patterns']['avg_order_value'] > 0:
            cart_threshold = int(analysis['order_patterns']['avg_order_value'])
            logger.info(f"Generating High-Value Customer rule with cart threshold: ${cart_threshold}")
            conditions = {
                "cart_value_operator": "greater_than",
                "cart_value": cart_threshold
            }
            logger.info(f"High-Value Customer trigger_conditions: {conditions}")
            rules.append({
                "name": rule_name,
                "description": f"Target customers with above-average order values of ${analysis['order_patterns']['avg_order_value']:.0f}",
                "trigger_type": "cart_value",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "high_value_customer_upsell"
                },
                "priority": 7,
                "expected_impact": "high",
                "implementation_notes": f"Target customers spending above your ${analysis['order_patterns']['avg_order_value']:.0f} average order value"
            })
        
        # Rule 5: Cart Abandonment Recovery (based on actual abandonment rate)
        rule_name = "Cart Abandonment Recovery"
        if rule_name not in existing_rule_names and analysis['cart_patterns']['abandonment_rate'] > 0.3:  # If abandonment rate > 30%
            logger.info(f"Generating Cart Abandonment Recovery rule with abandonment rate: {analysis['cart_patterns']['abandonment_rate']:.1%}")
            conditions = {
                "time_on_site_operator": "greater_than",
                "time_on_site_min": 300  # 5 minutes
            }
            logger.info(f"Cart Abandonment Recovery trigger_conditions: {conditions}")
            rules.append({
                "name": rule_name,
                "description": f"Recover abandoned carts with {analysis['cart_patterns']['abandonment_rate']:.1%} abandonment rate",
                "trigger_type": "time_based",
                "trigger_conditions": conditions,
                "target_products": self._select_target_products(products, "time_based", conditions, analysis),
                "actions": {
                    "action_type": "show_campaign",
                    "campaign_id": "abandonment_recovery"
                },
                "priority": 9,
                "expected_impact": "high",
                "implementation_notes": f"Target customers who spend 5+ minutes on site with {analysis['cart_patterns']['abandonment_rate']:.1%} abandonment rate"
            })
        
        # Rule 6: Product Category Upsell (if we have different product categories)
        if len(products) > 2:
            categories = list(set([p.get('product_type', 'general') for p in products if p.get('product_type')]))
            if len(categories) > 1:
                rule_name = f"Category Cross-Sell ({categories[0]} → {categories[1]})"
                if rule_name not in existing_rule_names:
                    cart_threshold = int(analysis['price_range']['average'] * 0.7)
                    logger.info(f"Generating Category Cross-Sell rule with cart threshold: ${cart_threshold}")
                    conditions = {
                        "cart_value_operator": "greater_than",
                        "cart_value": cart_threshold
                    }
                    logger.info(f"Category Cross-Sell trigger_conditions: {conditions}")
                    rules.append({
                        "name": rule_name,
                        "description": f"Cross-sell from {categories[0]} to {categories[1]} products",
                        "trigger_type": "cart_value",
                        "trigger_conditions": conditions,
                        "target_products": self._select_target_products(products, "cart_value", conditions, analysis),
                        "actions": {
                            "action_type": "show_campaign",
                            "campaign_id": "category_cross_sell"
                        },
                        "priority": 4,
                        "expected_impact": "medium",
                        "implementation_notes": f"Cross-sell between {categories[0]} and {categories[1]} product categories"
                    })
        
        # Rule 7: Seasonal/Time-based Rule (if no other rules generated)
        if len(rules) == 0:
            rule_name = "Time-Based Engagement"
            if rule_name not in existing_rule_names:
                logger.info("Generating Time-Based Engagement rule as fallback")
                conditions = {
                    "time_on_site_operator": "greater_than",
                    "time_on_site_min": 180  # 3 minutes
                }
                logger.info(f"Time-Based Engagement trigger_conditions: {conditions}")
                rules.append({
                    "name": rule_name,
                    "description": "Engage customers who spend significant time browsing",
                    "trigger_type": "time_based",
                    "trigger_conditions": conditions,
                    "target_products": self._select_target_products(products, "time_based", conditions, analysis),
                    "actions": {
                        "action_type": "show_campaign",
                        "campaign_id": "time_based_engagement"
                    },
                    "priority": 3,
                    "expected_impact": "medium",
                    "implementation_notes": "Engage customers who show browsing interest (3+ minutes)"
                })
        
        logger.info(f"Generated {len(rules)} data-driven rules with target products based on actual business data")
        
        # Log the exact JSON structure being returned
        for i, rule in enumerate(rules):
            logger.info(f"Rule {i+1} JSON structure: {json.dumps(rule, indent=2)}")
        
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
            campaigns = json.loads(content)
            
            if isinstance(campaigns, list) and len(campaigns) > 0:
                logger.info(f"Successfully generated {len(campaigns)} AI-driven campaigns")
                return campaigns
            else:
                logger.warning("AI returned empty or invalid campaigns, using data-driven fallback")
                return self._generate_data_driven_campaigns(data)
                
        except Exception as e:
            logger.error(f"Error generating AI campaigns: {str(e)}")
            logger.info("Falling back to data-driven campaign generation")
            return self._generate_data_driven_campaigns(data)
    
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