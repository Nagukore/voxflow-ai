/**
 * VoxFlow — Session Store
 * Server-side conversation memory with topic tracking,
 * action history, and pending action management.
 */

import { randomUUID } from 'crypto';

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get or create a session by ID.
 */
export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      topics: [],
      actions: [],
      pendingActions: new Map(),
      lastActive: Date.now(),
    });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

/**
 * Record a conversation topic in session memory.
 */
export function recordTopic(session, intent, message) {
  session.topics.push({
    intent,
    summary: message.substring(0, 80),
    timestamp: Date.now(),
  });
  // Keep last 50 topics
  if (session.topics.length > 50) session.topics.shift();
}

/**
 * Record an executed action in session history.
 */
export function recordAction(session, action) {
  session.actions.push({
    ...action,
    timestamp: Date.now(),
  });
}

/**
 * Store a pending action that awaits user confirmation.
 * Returns the action ID for reference.
 */
export function storePendingAction(session, action) {
  const actionId = randomUUID();
  session.pendingActions.set(actionId, {
    ...action,
    id: actionId,
    status: 'pending',
    createdAt: Date.now(),
  });
  return actionId;
}

/**
 * Confirm a pending action by ID.
 * Moves it to executed status and records it.
 */
export function confirmPendingAction(session, actionId) {
  const action = session.pendingActions.get(actionId);
  if (!action) return null;

  action.status = 'confirmed';
  action.confirmedAt = Date.now();
  session.pendingActions.delete(actionId);
  recordAction(session, action);

  return action;
}

/**
 * Cancel a pending action by ID.
 */
export function cancelPendingAction(session, actionId) {
  const action = session.pendingActions.get(actionId);
  if (!action) return null;

  action.status = 'cancelled';
  action.cancelledAt = Date.now();
  session.pendingActions.delete(actionId);

  return action;
}

/**
 * Retrieve conversation memory for "what did we discuss" queries.
 */
export function retrieveMemory(session) {
  if (session.topics.length === 0) return null;

  const recentTopics = session.topics.slice(-8);
  return recentTopics.map(t => `• ${t.summary}`).join('\n');
}

/**
 * Analyze conversation context from history.
 */
export function analyzeContext(history) {
  if (!history || history.length === 0) {
    return { isFollowUp: false, turnCount: 0 };
  }

  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  const lastUser = [...history].reverse().find(m => m.role === 'user');

  return {
    isFollowUp: history.length > 2,
    lastTopic: lastAssistant?.content?.substring(0, 120) || '',
    lastUserMsg: lastUser?.content || '',
    turnCount: history.length,
  };
}

// ── Garbage-collect stale sessions every 10 min ──
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);
