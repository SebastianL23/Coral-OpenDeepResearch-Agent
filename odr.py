import os
import sys
import uuid
import asyncio
from dotenv import load_dotenv
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "open_deep_research")))
from graph import builder

load_dotenv()

class OpenDeepResearch:
    def __init__(self):
        self.REPORT_STRUCTURE = """Use this structure to create a report on the user-provided topic:

        1. Introduction (no research needed)
        - Brief overview of the topic area

        2. Main Body Sections:
        - Each section should focus on a sub-topic of the user-provided topic
        
        3. Conclusion
        - Aim for 1 structural element (either a list or table) that distills the main body sections 
        - Provide a concise summary of the report"""

    async def generate_research_report(self, topic: str):
        # Setup memory + graph
        memory = MemorySaver()
        graph = builder.compile(checkpointer=memory)

        # Thread config like in notebook
        thread = {
            "configurable": {
                "thread_id": str(uuid.uuid4()),
                "search_api": "linkup",
                "planner_provider": "groq",
                "planner_model": "llama3-70b-8192",
                "writer_provider": "groq",
                "writer_model": "llama3-70b-8192",
                "max_search_depth": 0,
                "number_of_queries": 1,
                "report_structure": self.REPORT_STRUCTURE,
            }
        }

        # Step 1: Run graph with the topic
        async for _ in graph.astream({"topic": topic}, thread, stream_mode="updates"):
            pass

        # Step 2: Resume automatically (like skipping feedback)
        async for _ in graph.astream(Command(resume=True), thread, stream_mode="updates"):
            print(_)
            print("\n")
            pass

        # Step 3: Get final report
        final_state = graph.get_state(thread)
        report = final_state.values.get("final_report")
        
        # Check if report was generated successfully
        if not report:
            raise ValueError("No report was generated. Please check the topic and try again.")

        return report


if __name__ == "__main__":
    topic = "What is Model Context Protocol?"
    research = OpenDeepResearch()
    report = asyncio.run(research.generate_research_report(topic))
    print("\n📄 FINAL REPORT:\n")
    print(report)