## [Open Deep Research Coral Agent](https://github.com/Coral-Protocol/open-deep-research-coral-agent)

The Open Deep Research agent is an open-source AI assistant that automates in-depth research and report generation via multi-agent workflows, supporting web search, structured reporting, human feedback, and API/LLM integration

## Responsibility
The Open Deep Research agent is an open-source research assistant that automates comprehensive report generation using a graph-based workflow or multi-agent architecture. It can perform in-depth web searches, generate structured reports, support human-in-the-loop feedback, and integrate with APIs like Tavily, Linkup, DuckDuckGo, and Azure AI Search, using customizable LLMs for tailored, high-quality research outputs.

## Details
- **Framework**: LangChain
- **Tools used**: OpenDeepResearch Tools, Coral server tools
- **AI model**: GPT-4o
- **Date added**: June 4, 2025
- **Reference**: [Open Deep Research Repo](https://github.com/langchain-ai/open_deep_research)
- **License**: MIT 


## Use the Agent  

### 1. Clone & Install Dependencies


<details>  

Ensure that the [Coral Server](https://github.com/Coral-Protocol/coral-server) is running on your system. If you are trying to run Open Deep Research agent and require an input, you can either create your agent which communicates on the coral server or run and register the [Interface Agent](https://github.com/Coral-Protocol/Coral-Interface-Agent) on the Coral Server.  

```bash
# In a new terminal clone the repository:
git clone https://github.com/Coral-Protocol/Coral-OpenDeepResearch-Agent.git

# Navigate to the project directory:
cd Coral-OpenDeepResearch-Agent

# Install `uv`:
pip install uv

# Install dependencies from `pyproject.toml` using `uv`:
uv sync
```

</details>
 

### 2. Configure Environment Variables

<details>
 
Get the API Key:
[Linkup](https://app.linkup.so/api-keys) || 
[OpenAI](https://platform.openai.com/api-keys)


```bash
# Create .env file in project root
cp -r .env_sample .env
```
</details>


### 3. Run Agent

<details>

```bash
# Run the agent using `uv`:
uv run python langchain_open_deep_research.py
```
</details>


### 4. Example

<details>


```bash
# Input:
Write me a report on Model Context Protocol.

#Output:
The research report will be displayed directly in the console output when you run the agent.
```
</details>


## Creator Details
- **Name**: Suman Deb
- **Affiliation**: Coral Protocol
- **Contact**: [Discord](https://discord.com/invite/Xjm892dtt3)
