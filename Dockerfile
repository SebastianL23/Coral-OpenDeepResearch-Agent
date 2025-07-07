FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

# Copy the Coral agent files
COPY . .

# Copy the integration-bridge files from parent directory
COPY ../integration-bridge ./integration-bridge

RUN uv sync --no-dev

EXPOSE 5555

CMD ["uv", "run", "python", "web_service.py"]