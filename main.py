import logging
import os, json, asyncio, traceback
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
    "agentDescription": "Open Deep Research agent can perform in-depth web searches, generate structured reports, support human-in-the-loop feedback, and integrate with APIs like Tavily, Linkup, DuckDuckGo, and Azure AI Search, using customizable LLMs for tailored, high-quality research outputs."
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

async def create_agent(coral_tools, agent_tools):
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
        model=os.getenv("MODEL_NAME", "llama3-70b-8192"),
        model_provider=os.getenv("MODEL_PROVIDER", "groq"),
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=os.getenv("MODEL_TEMPERATURE", "0.1"),
        max_tokens=os.getenv("MODEL_TOKEN", "8000")
    )

    agent = create_tool_calling_agent(model, combined_tools, prompt)
    return AgentExecutor(agent=agent, tools=combined_tools, verbose=True)




async def main():
    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    logger.info(f"Connecting to Coral Server: {CORAL_SERVER_URL}")

    client = MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": CORAL_SERVER_URL,
                "timeout": 600,
                "sse_read_timeout": 600,
            }
        }
    )
    logger.info("Coral Server Connection Established")

    coral_tools = await client.get_tools(server_name="coral")
    logger.info(f"Coral tools count: {len(coral_tools)}")

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

    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", "devmode")
    
    agent_executor = await create_agent(coral_tools, agent_tools)

    while True:
        try:
            logger.info("Starting new agent invocation")
            await agent_executor.ainvoke({"agent_scratchpad": []})
            logger.info("Completed agent invocation, restarting loop")
            await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Error in agent loop: {str(e)}")
            logger.error(traceback.format_exc())
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())