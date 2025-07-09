#!/usr/bin/env python3
"""
Test script to verify the model change to llama3.1-8b-instant works correctly.
"""

import os
import asyncio
import json
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain.prompts import ChatPromptTemplate

# Load environment variables from .env file
load_dotenv()

async def test_model():
    """Test the new model with a simple JSON generation task"""
    
    # Get API key
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found. Please set the environment variable.")
        return False
    
    try:
        # Initialize the new model
        print("🔄 Initializing llama3.1-8b-instant model...")
        model = init_chat_model(
            model="llama3.1-8b-instant",  # Better for JSON generation
            model_provider="groq",
            api_key=groq_api_key,
            temperature=0.1,
            max_tokens=4000
        )
        print("✅ Model initialized successfully")
        
        # Test with a simple JSON generation task
        print("🔄 Testing JSON generation...")
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a JSON generator. Return ONLY valid JSON. No text, no explanations, no markdown."),
            ("user", """Generate a simple test JSON object with this structure:
{
    "test": "value",
    "number": 42,
    "array": ["item1", "item2"]
}""")
        ])
        
        response = await model.ainvoke(prompt.format_messages())
        content = response.content.strip()
        
        print(f"📝 Raw response: {content}")
        
        # Clean the response
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        # Try to parse JSON
        try:
            parsed_json = json.loads(content)
            print("✅ JSON parsing successful!")
            print(f"📊 Parsed JSON: {json.dumps(parsed_json, indent=2)}")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"📝 Content that failed to parse: {content}")
            return False
            
    except Exception as e:
        print(f"❌ Model test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Testing model change to llama3.1-8b-instant")
    print("=" * 50)
    
    success = asyncio.run(test_model())
    
    if success:
        print("\n🎉 Model change test PASSED!")
        print("The new model is working correctly for JSON generation.")
    else:
        print("\n💥 Model change test FAILED!")
        print("Please check your GROQ_API_KEY and try again.") 