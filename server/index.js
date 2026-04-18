/**
 * VoxFlow — Backend API Server
 * Express server with orchestrator-powered endpoints.
 *
 * Routes:
 *   POST /api/chat           → Main conversation endpoint (orchestrator pipeline)
 *   POST /api/action/confirm → Confirm a pending action
 *   POST /api/action/cancel  → Cancel a pending action
 *   GET  /api/health         → Health check
 */

import express from 'express';
import cors from 'cors';
import { orchestrate } from './orchestrator.js';
import { initLLM, isLLMAvailable } from './responseGenerator.js';
import { initQdrant, isQdrantReady, getRetrievalHealth } from './retriever.js';
import {
  getSession,
  confirmPendingAction,
  cancelPendingAction,
} from './sessionStore.js';
import { executeConfirmedAction } from './actionExecutor.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Load .env if available ──
try {
  const dotenv = await import('dotenv');
  const configFn = dotenv.config || dotenv.default?.config;
  if (configFn) {
    configFn({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  }
} catch {
  // dotenv not installed — no problem, continue without it
}

// ── Initialize services on startup ──
await initLLM();
await initQdrant();


// ══════════════════════════════════════════════════════════════
// ── POST /api/chat — Main Conversation Endpoint ─────────────
// ══════════════════════════════════════════════════════════════

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, sessionId, debug } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message.' });
    }

    const enableDebug = debug === true || process.env.DEBUG_MODE === 'true';

    const response = await orchestrate({
      message: message.trim(),
      history: history || [],
      sessionId: sessionId || 'default',
      debug: enableDebug,
    });

    res.json(response);
  } catch (err) {
    console.error('[VoxFlow] Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// ══════════════════════════════════════════════════════════════
// ── POST /api/action/confirm — Confirm a Pending Action ─────
// ══════════════════════════════════════════════════════════════

app.post('/api/action/confirm', (req, res) => {
  try {
    const { actionId, sessionId } = req.body;

    if (!actionId || !sessionId) {
      return res.status(400).json({ error: 'Missing actionId or sessionId.' });
    }

    const session = getSession(sessionId);
    const action = confirmPendingAction(session, actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found or already processed.' });
    }

    // Execute the confirmed action
    const result = executeConfirmedAction(action);

    console.log(`[VoxFlow] ✅ Action confirmed: ${action.type} (${actionId})`);

    res.json({
      status: 'confirmed',
      action: {
        id: actionId,
        type: action.type,
        icon: action.icon,
      },
      result,
    });
  } catch (err) {
    console.error('[VoxFlow] Action confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm action.' });
  }
});


// ══════════════════════════════════════════════════════════════
// ── POST /api/action/cancel — Cancel a Pending Action ───────
// ══════════════════════════════════════════════════════════════

app.post('/api/action/cancel', (req, res) => {
  try {
    const { actionId, sessionId } = req.body;

    if (!actionId || !sessionId) {
      return res.status(400).json({ error: 'Missing actionId or sessionId.' });
    }

    const session = getSession(sessionId);
    const action = cancelPendingAction(session, actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found or already processed.' });
    }

    console.log(`[VoxFlow] ❌ Action cancelled: ${action.type} (${actionId})`);

    res.json({
      status: 'cancelled',
      action: {
        id: actionId,
        type: action.type,
      },
    });
  } catch (err) {
    console.error('[VoxFlow] Action cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel action.' });
  }
});


// ══════════════════════════════════════════════════════════════
// ── GET /api/config — Public Config for Frontend ────────────
// ══════════════════════════════════════════════════════════════

app.get('/api/config', (req, res) => {
  res.json({
    vapi: {
      publicKey: process.env.VAPI_PUBLIC_KEY || '',
      assistantId: process.env.VAPI_ASSISTANT_ID || '',
      enabled: !!(process.env.VAPI_PUBLIC_KEY && process.env.VAPI_ASSISTANT_ID),
    },
  });
});


// ══════════════════════════════════════════════════════════════
// ── GET /api/health — Health Check ──────────────────────────
// ══════════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  const retrieval = await getRetrievalHealth();

  res.json({
    status: 'ok',
    service: 'VoxFlow Orchestrator API',
    version: '3.1.0',
    architecture: 'Orchestrator Pipeline',
    tools: ['retrieval', 'api', 'reasoning'],
    llmAvailable: isLLMAvailable(),
    qdrantReady: isQdrantReady(),
    retrieval,
    vapiEnabled: !!(process.env.VAPI_PUBLIC_KEY && process.env.VAPI_ASSISTANT_ID),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/retrieval', async (req, res) => {
  try {
    const retrieval = await getRetrievalHealth();
    res.json({
      status: 'ok',
      retrieval,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err?.message || 'Failed to inspect retrieval health',
    });
  }
});


// ── Start ──
app.listen(PORT, () => {
  const vapiStatus = process.env.VAPI_PUBLIC_KEY ? '✅ Vapi Voice' : '⚠️ Vapi not configured (browser fallback)';
  const qdrantStatus = isQdrantReady() ? '✅ Python Qdrant backend' : '⚠️ Qdrant not available (in-memory fallback)';

  console.log(`[VoxFlow] 🚀 Orchestrator API v3.1 running on http://localhost:${PORT}`);
  console.log(`[VoxFlow] 🔧 Pipeline: Intent → Classify → Route → Generate`);
  console.log(`[VoxFlow] 🛠️  Tools: Retrieval | API | Reasoning`);
  console.log(`[VoxFlow] 🎙️  Voice: ${vapiStatus}`);
  console.log(`[VoxFlow] 🔍 Search: ${qdrantStatus}`);
});
