# VoxFlow

Voice-first AI assistant with an **orchestrator backend**, **semantic retrieval** (Qdrant + Gemini embeddings), and **optional Vapi** for production voice. The web UI supports typed chat, browser speech, and Vapi calls—with replies shown in chat and spoken when appropriate.

## What it does

- **Chat UI** (Vite): messages, quick actions, optional debug pipeline trace.
- **Orchestrator** (Express): intent detection, query classification (`KNOWLEDGE` / `ACTION` / `GENERAL`), tool routing, response generation.
- **Retrieval**: tries **direct Qdrant** from Node (Gemini embeddings), then **Python FastAPI** (`/ask`) if needed, then **in-memory** fallback.
- **LLM**: Google Gemini for generation when configured; template fallback when not.
- **Voice**: Vapi (if keys set) or Web Speech API; Vapi final transcripts are sent through the same `/api/chat` flow so you get **text + voice**.

## Tech stack

| Layer | Stack |
|--------|--------|
| Frontend | Vite, vanilla JS (`src/`), CSS |
| Backend | Node.js, Express, `dotenv`, `cors` |
| Retrieval | `@qdrant/js-client-rest`, Python `fastapi` + `uvicorn`, `qdrant-client` |
| AI | `@google/generative-ai` (Gemini chat + embeddings) |
| Voice | `@vapi-ai/web`, browser `SpeechRecognition` + `SpeechSynthesis` |

## Repository layout

```
src/           Web app (UI, conversation, voice helpers)
server/        Express API, orchestrator, retriever, intent, actions
qdrant/        FastAPI app (e.g. /ask), Qdrant helpers, mock data
public/        Static assets
```

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+ (for the `qdrant` service when using `npm run dev`)
- Accounts / keys as needed:
  - [Google AI Studio](https://aistudio.google.com/apikey) — Gemini
  - [Qdrant Cloud](https://cloud.qdrant.io/) (or compatible cluster)
  - [Vapi](https://vapi.ai/) — optional voice

## Environment variables

Copy `.env.example` to `.env` and fill values:

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | `gemini` (default) |
| `GEMINI_API_KEY` | Gemini API key (chat + embeddings for direct Qdrant) |
| `OPENAI_API_KEY` | Optional alternative provider |
| `VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID` | Enable Vapi voice in the UI |
| `QDRANT_URL`, `QDRANT_API_KEY` | Qdrant HTTP endpoint and API key |
| `QDRANT_COLLECTION` | Collection name (default: `voxflow-kb`) |
| `PYTHON_QDRANT_URL` | Python FastAPI base URL (default: `http://127.0.0.1:8001`) |
| `DEBUG_MODE` | `true` to include pipeline debug in chat responses |

## Install and run (development)

From the repo root:

```bash
npm install
npm run dev
```

This runs (via `concurrently`):

| Service | Port | Role |
|---------|------|------|
| Vite | **5173** | Frontend — proxies `/api` to Express |
| Express | **3001** | REST API + orchestrator |
| Uvicorn | **8001** | Python FastAPI (`cd qdrant && uvicorn main:app`) |

Open **http://localhost:5173**.

### Windows note

`dev:clean` uses `kill-port` on ports `3001`, `5173`, `5174`, `8001` before start.

### Python dependencies (qdrant service)

Install what you need for `qdrant/main.py` (see `requiremnets.txt`):

```bash
cd qdrant
pip install -r ../requiremnets.txt
# Optional extras used by some flows:
pip install sentence-transformers
```

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Clean ports, then frontend + backend + Python API together |
| `npm run dev:frontend` | Vite only |
| `npm run dev:backend` | Nodemon + `server/index.js` |
| `npm run dev:python` | Uvicorn on port 8001 |
| `npm run build` | Production build of the frontend |
| `npm run preview` | Preview production build |

## Seeding Qdrant (optional)

Populates the configured collection with Gemini embeddings (see `server/seedQdrant.js`):

```bash
node server/seedQdrant.js
```

Requires `QDRANT_URL`, `QDRANT_API_KEY`, `GEMINI_API_KEY`, and optionally `QDRANT_COLLECTION`.

## API overview

Base URL in dev: **http://localhost:3001** (browser uses Vite proxy: `/api` → 3001).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Main chat: `{ message, history?, sessionId?, debug? }` |
| `GET` | `/api/config` | Public config (e.g. Vapi enabled + ids) |
| `GET` | `/api/health` | Service health + retrieval snapshot |
| `GET` | `/api/health/retrieval` | Retrieval path: `direct_qdrant`, `python_backend`, or `in_memory` |
| `POST` | `/api/action/confirm` | Confirm pending action |
| `POST` | `/api/action/cancel` | Cancel pending action |

Python service (when running): `GET http://127.0.0.1:8001/ask?q=...`

## Retrieval behavior (high level)

1. **Direct Qdrant (Node)** — embed query with Gemini, search `QDRANT_COLLECTION`.
2. **Python `/ask`** — if direct path fails or is unavailable; returns structured `context` / `answer` / `insights`.
3. **In-memory** — keyword-style fallback in `server/retriever.js`.

Check **`GET /api/health/retrieval`** to see which path last succeeded and whether the Python backend is reachable.

## Production build

```bash
npm run build
```

Serve the `dist/` output with any static host. You still need the Express API (or equivalent) and env vars for LLM, Qdrant, and voice as you configure them.

## Troubleshooting

- **No Qdrant / wrong answers**: Verify `.env`, run `/api/health/retrieval`, ensure Python API is up if you rely on fallback.
- **Gemini errors (quota, leaked key)**: Rotate `GEMINI_API_KEY` in Google AI Studio; check billing/quotas.
- **Vapi vs browser voice**: If Vapi keys are missing, the app uses Web Speech API.
- **CORS**: Dev uses Vite proxy; for custom setups, align origins with your API.

## License

Private project — see repository owner for licensing.
