# VoxFlow AI

VoxFlow is an intelligent, voice-driven AI application that integrates semantic knowledge retrieval with real-time voice interactions. The system seamlessly combines a responsive front-end, an orchestrator backend, vector-based semantic search, and Vapi AI for professional voice synthesis.

## Features

- **Voice Interface**: Professional voice interactions powered by [Vapi AI](https://vapi.ai/).
- **Semantic Retrieval**: Advanced vector space searches using [Qdrant](https://qdrant.tech/) and Google Gemini embeddings.
- **Node.js Orchestrator**: Handles conversation state, intention detection, context aggregation, and dynamic response generation.
- **Python Qdrant Service**: A dedicated local service explicitly managing data ingestion, embedding, and vector similarity querying.
- **Modern Full-Stack Architecture**: Built with Vite and Express, supporting concurrent local development.

## Project Structure

- `src/` — Vite Frontend. Manages the browser-native presentation layer and Vapi voice connection.
- `server/` — Node.js Express backend. The main "Orchestrator" pipeline routing intent, parsing semantic queries, and building LLM responses.
- `qdrant/` — Python-based knowledge retrieval system interacting with Qdrant Cloud.
- `public/` — Static assets and global resources.

## Pre-requisites

- Node.js (v18+)
- Python 3.10+ (for running semantic ingestion and Qdrant backend functions)
- API Keys: Google Gemini platform, Vapi AI, and Qdrant Cloud cluster setup.

## Setup & Installation

### 1. Environment Configuration

Copy the `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

Populate the following values in your `.env` file:
- `GEMINI_API_KEY`: Google Generative AI API Key.
- `VAPI_PUBLIC_KEY` & `VAPI_ASSISTANT_ID`: Your Vapi keys for browser-based voice synthesis.
- `QDRANT_URL` & `QDRANT_API_KEY`: Connection strings for your Qdrant cluster.

### 2. Node.js Environment (Frontend & Orchestrator)

Install dependencies and start the dual concurrent server mapping backend to `localhost:3001` and Vite to `localhost:5173`:

```bash
npm install
npm run dev
```

### 3. Python Service Setup

If utilizing the local Python pipeline for ingesting data or local mock services:

```bash
cd qdrant
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
# Install necessary ML/FastAPI dependencies (Make sure qdrant-client is installed)
pip install qdrant-client sentence-transformers
```

## Available Scripts

- `npm run dev`: Starts both frontend and backend concurrently using nodemon and Vite.
- `npm run build`: Bundles the Vite frontend for production.
- `npm run preview`: Previews the bundled web app.
