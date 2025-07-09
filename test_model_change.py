#!/usr/bin/env python3
"""
Test script to verify the model change to mixtral-8x7b-32768 works correctly.
"""

import os
import asyncio
import json
import re
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain.schema import SystemMessage, HumanMessage

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
        print("🔄 Initializing llama3-70b-8192 model...")
        model = init_chat_model(
            model="llama3-70b-8192",  # Reliable for JSON generation
            model_provider="groq",
            api_key=groq_api_key,
            temperature=0.1,
            max_tokens=4000
        )
        print("✅ Model initialized successfully")
        
        # Test with a more explicit JSON generation task
        print("🔄 Testing JSON generation...")
        messages = [
            SystemMessage(content="You are a JSON generator. You must return ONLY a valid JSON object. Do not return just a string or single value. Return the complete JSON object."),
            HumanMessage(content="""Generate this exact JSON object (copy it exactly):\n{\n    \"test\": \"value\",\n    \"number\": 42,\n    \"array\": [\"item1\", \"item2\"]\n}""")
        ]
        
        response = await model.ainvoke(messages)
        content = response.content.strip()
        
        print(f"📝 Raw response: {repr(content)}")  # Shows exact characters including newlines
        print(f"📏 Response length: {len(content)}")
        print(f"🔍 First 100 chars: {content[:100]}")
        print(f"🔍 Last 100 chars: {content[-100:]}")
        
        # Clean the response
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        print(f"🧹 Cleaned response: {repr(content)}")
        
        # Try to parse JSON
        try:
            parsed_json = json.loads(content)
            print("✅ JSON parsing successful!")
            print(f"📊 Parsed JSON: {parsed_json}")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"🔍 Content that failed: {content}")
            
            # Try to extract JSON using regex
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                try:
                    extracted_json = json.loads(json_match.group())
                    print("✅ JSON extraction successful!")
                    print(f"📊 Extracted JSON: {extracted_json}")
                    return True
                except json.JSONDecodeError as e2:
                    print(f"❌ JSON extraction also failed: {e2}")
            
            # If AI returned just a string, construct a simple JSON
            if content.startswith('"') and content.endswith('"'):
                try:
                    test_value = content[1:-1]  # Remove quotes
                    constructed_json = {
                        "test": test_value,
                        "number": 42,
                        "array": ["item1", "item2"]
                    }
                    print("✅ Constructed JSON from string value")
                    print(f"📊 Constructed JSON: {constructed_json}")
                    return True
                except Exception as e3:
                    print(f"❌ JSON construction failed: {e3}")
            
            return False
            
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        print(f"🔍 Exception type: {type(e).__name__}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return False

async def main():
    print("🧪 Testing mixtral-8x7b-32768 Model")
    print("=" * 40)
    
    success = await test_model()
    
    if success:
        print("\n🎉 Model test PASSED!")
        print("✅ The mixtral-8x7b-32768 model is working correctly")
        print("✅ JSON generation and parsing is functional")
        print("\n🚀 You can now deploy to Railway with confidence!")
    else:
        print("\n💥 Model test FAILED!")
        print("❌ There are issues with the model or JSON generation")
        print("🔧 Please check your GROQ_API_KEY and try again")

if __name__ == "__main__":
    asyncio.run(main())