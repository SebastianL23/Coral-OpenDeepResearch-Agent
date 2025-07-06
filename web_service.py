from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
from dotenv import load_dotenv
from odr import OpenDeepResearch

load_dotenv()

app = FastAPI(
    title="Open Deep Research Agent",
    description="An AI assistant that automates in-depth research and report generation",
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

class ResearchRequest(BaseModel):
    topic: str

class ResearchResponse(BaseModel):
    topic: str
    report: str
    status: str

@app.get("/")
async def root():
    return {
        "message": "Open Deep Research Agent API",
        "status": "running",
        "endpoints": {
            "POST /research": "Generate a research report on a topic",
            "GET /health": "Health check endpoint"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Open Deep Research Agent"}

@app.post("/research", response_model=ResearchResponse)
async def generate_research(request: ResearchRequest):
    try:
        # Initialize the research agent
        research = OpenDeepResearch()
        
        # Generate the research report
        report = await research.generate_research_report(request.topic)
        
        return ResearchResponse(
            topic=request.topic,
            report=report,
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5555))
    uvicorn.run(app, host="0.0.0.0", port=port) 