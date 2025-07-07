#!/usr/bin/env python3
"""
Test script for Coral Research Agent
"""

import asyncio
import json
import os
from dotenv import load_dotenv
from web_service import CoralResearchAgent

load_dotenv()

async def test_agent():
    """Test the Coral Research Agent with sample data"""
    
    # Initialize the agent
    agent = CoralResearchAgent()
    
    # Test user ID (replace with a real user ID from your database)
    test_user_id = "test-user-id"
    
    print("🧪 Testing Coral Research Agent...")
    print(f"User ID: {test_user_id}")
    print("-" * 50)
    
    try:
        # Run analysis
        print("📊 Running analysis...")
        result = await agent.analyze_user_data(
            user_id=test_user_id,
            time_range_days=30
        )
        
        print("✅ Analysis completed successfully!")
        print("\n📋 Results Summary:")
        print(f"- User ID: {result['user_id']}")
        print(f"- Analysis Timestamp: {result['analysis_timestamp']}")
        print(f"- Total Products: {result['data_summary']['total_products']}")
        print(f"- Total Campaigns: {result['data_summary']['total_campaigns']}")
        print(f"- Total Rules: {result['data_summary']['total_rules']}")
        
        print(f"\n🎯 Priority Actions: {len(result['priority_actions'])}")
        for i, action in enumerate(result['priority_actions'], 1):
            print(f"  {i}. {action['name']} ({action['priority']} priority)")
        
        print(f"\n📋 Rule Suggestions: {len(result['rule_suggestions'])}")
        for i, rule in enumerate(result['rule_suggestions'], 1):
            print(f"  {i}. {rule['name']} - {rule['expected_impact']} impact")
        
        print(f"\n📈 Campaign Suggestions: {len(result['campaign_suggestions'])}")
        for i, campaign in enumerate(result['campaign_suggestions'], 1):
            print(f"  {i}. {campaign['name']} - {campaign['expected_impact']} impact")
        
        # Save detailed results to file
        with open('test_results.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Detailed results saved to test_results.json")
        
        return result
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return None

if __name__ == "__main__":
    asyncio.run(test_agent()) 