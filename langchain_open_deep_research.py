import asyncio
import os
import json
import logging
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.tools import Tool
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse
from odr import OpenDeepResearch 

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
load_dotenv()

base_url = os.getenv("CORAL_SSE_URL")
agentID = os.getenv("CORAL_AGENT_ID")

params = {
    # "waitForAgents": 1,
    "agentId": agentID,
    "agentDescription": "The Open Deep Research agent is an open-source research assistant that automates comprehensive report generation using a graph-based workflow or multi-agent architecture. "
    "It can perform in-depth web searches, generate structured reports, support human-in-the-loop feedback, and integrate with APIs like Tavily, Linkup, DuckDuckGo, and Azure AI Search, using customizable LLMs for tailored, high-quality research outputs."
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

async def odr_tool_async(topic: str):
    research = OpenDeepResearch()
    report = await research.generate_research_report(topic)
    return (report, report)

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args_schema).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

async def create_odr_agent(coral_tools, agent_tools):
    coral_tools_description = get_tools_description(coral_tools)
    agent_tools_description = get_tools_description(agent_tools)
    combined_tools = coral_tools + agent_tools

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are a specialized research agent that integrates with Coral Server tools and provides comprehensive research capabilities.

CORE WORKFLOW:
1. Always monitor for incoming requests using `wait_for_mentions` (timeoutMs: 30000)
2. Extract thread_id and sender_id from received mentions from the 'wait_for_mentions' tool response
3. Analyze the request content and determine appropriate tools to use for example if the request is a research report, use the open_deepresearch tool
4. Send complete results back to the requesting agent using `send_message` tool and pass the thread_id and sender_id to the tool call you got from the `wait_for_mentions` tool response
5. Handle errors gracefully by sending descriptive error messages
6. Continue monitoring for new requests

RESEARCH CAPABILITIES:
- Use `open_deepresearch` tool for comprehensive research report generation
- Return complete, unmodified research content to requesting agents
- Handle research topics of any complexity or domain

RESPONSE GUIDELINES:
- Always respond with actual tool outputs, never placeholder text
- Provide complete research reports without summarization
- Send detailed error descriptions if tool execution fails
- Maintain thread context throughout the conversation

AVAILABLE TOOLS:
Coral Tools: {coral_tools_description}
Research Tools: {agent_tools_description}

Execute this workflow continuously to serve research requests from other agents."""
        ),
        ("placeholder", "{agent_scratchpad}")
    ])

    model = init_chat_model(
        model="gpt-4.1-2025-04-14",
        model_provider="openai",
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
        max_tokens=16000
    )

    agent = create_tool_calling_agent(model, combined_tools, prompt)
    return AgentExecutor(agent=agent, tools=combined_tools, verbose=True)

async def main():
    max_retries = 300
    for attempt in range(max_retries):
        try:
            async with MultiServerMCPClient(
                connections={
                    "coral": {
                        "transport": "sse",
                        "url": MCP_SERVER_URL,
                        "timeout": 300,
                        "sse_read_timeout": 300,
                    }
                }
            ) as client:
                logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
                coral_tools = client.get_tools()
                agent_tools = [
                    Tool(
                        name="open_deepresearch",
                        func=None,
                        coroutine=odr_tool_async,
                        description="Generates a comprehensive research report on a given topic using OpenDeepResearch. Returns the complete research report content with introduction, main body sections with research findings, and conclusions with structured elements.",
                        args_schema={
                            "properties": {
                                "topic": {
                                    "type": "string",
                                    "description": "The topic for the research report"
                                }
                            },
                            "required": ["topic"],
                            "type": "object"
                        },
                        response_format="content_and_artifact"
                    )
                ]
                await (await create_odr_agent(coral_tools, agent_tools)).ainvoke({})
        except ClosedResourceError as e:
            logger.error(f"ClosedResourceError on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                raise
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                raise

if __name__ == "__main__":
    asyncio.run(main())
