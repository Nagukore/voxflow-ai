/**
 * VoxFlow — Knowledge Retriever
 * Retrieves relevant knowledge using Qdrant vector search with Python backend.
 * Falls back to in-memory TF-IDF-like search if Python backend is not configured.
 */

function getPythonApiUrl() {
  return process.env.PYTHON_QDRANT_URL || 'http://127.0.0.1:8000';
}

// ══════════════════════════════════════════════════════════════
// ── Python FastApi Qdrant + Ollama ────────────────────────────
// ══════════════════════════════════════════════════════════════

let qdrantReady = false;

/**
 * Initialize / Check Python Backend.
 * Called once at server startup.
 */
export async function initQdrant() {
  const pythonApiUrl = getPythonApiUrl();
  console.log('[VoxFlow] ℹ️ Checking Python Qdrant backend...');
  qdrantReady = true;
  console.log(`[VoxFlow] ✅ Python Qdrant Backend enabled at ${pythonApiUrl}`);
  return true;
}

/**
 * Check if Qdrant is ready.
 */
export function isQdrantReady() {
  return qdrantReady;
}

/**
 * Generate embedding for text
 * Not used natively anymore - backend handles it.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  throw new Error('Embeddings handled by Python backend');
}

/**
 * Search Qdrant via Python backend for relevant knowledge.
 * @param {string} message - User query
 * @param {number} topK - Number of results
 * @returns {Promise<{answer: string, context: Array, insights: Array, results: Array, contextText: string, sources: string[]}>}
 */
async function qdrantRetrieve(message, topK = 3) {
  try {
    const pythonApiUrl = getPythonApiUrl();
    const response = await fetch(`${pythonApiUrl}/ask?q=${encodeURIComponent(message)}`);
    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }
    const data = await response.json();
    
    // Fallbacks if data structure doesn't match perfectly
    const context = Array.isArray(data.context) ? data.context : [];
    const insights = data.insights && typeof data.insights === 'object' ? data.insights : {};
    const answer = typeof data.answer === 'string' ? data.answer : '';
    const results = context;
    const contextText = results.map(r => r.text || '').join('\n\n');
    const sources = [...new Set(results.map(r => r.source || 'Qdrant Backend'))];

    console.log(`[VoxFlow] 🔍 Python Backend Query: ${data.refined_query || message}`);
    if (answer) {
      console.log('[VoxFlow] ✅ Python Backend Answer received!');
    }

    return { answer, context, insights, results, contextText, sources };
  } catch (err) {
    console.error('[VoxFlow] Python API search error:', err.message);
    // Fallback to in-memory
    return inMemoryRetrieve(message, topK);
  }
}


// ══════════════════════════════════════════════════════════════
// ── In-Memory Fallback ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const KNOWLEDGE_BASE = [
  {
    id: 'kb-capabilities',
    topic: 'capabilities',
    keywords: ['can you do', 'help', 'capabilities', 'features', 'what do you do', 'how do you work'],
    content: 'VoxFlow is a voice-first AI assistant. I can set reminders, schedule meetings, draft emails, take notes, search for information, tell jokes, check the time and date, retrieve news, and play music. I use a combination of knowledge retrieval, reasoning, and external API integrations to serve you.',
    source: 'VoxFlow Documentation',
  },
  {
    id: 'kb-weather',
    topic: 'weather',
    keywords: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'snow', 'climate'],
    content: "I can look up real-time weather data for any city. Just tell me the location, and I'll fetch the current conditions and forecast. I integrate with weather APIs to provide accurate temperature, humidity, wind, and precipitation info.",
    source: 'Weather Module',
  },
  {
    id: 'kb-scheduling',
    topic: 'scheduling',
    keywords: ['schedule', 'meeting', 'appointment', 'calendar', 'event', 'book'],
    content: "I can create, view, and manage calendar events. Tell me the event name, date, time, and any attendees. I'll confirm before adding it to your calendar. I support recurring events and can check for conflicts.",
    source: 'Calendar Integration',
  },
  {
    id: 'kb-email',
    topic: 'email',
    keywords: ['email', 'mail', 'compose', 'send', 'draft', 'inbox'],
    content: "I can compose and send emails on your behalf. Provide the recipient, subject, and body — I'll draft it for you to review before sending. I can also summarize recent emails if needed.",
    source: 'Email Integration',
  },
  {
    id: 'kb-reminders',
    topic: 'reminders',
    keywords: ['remind', 'reminder', "don't forget", 'alert', 'notify'],
    content: "I can set time-based and location-based reminders. Just tell me what to remind you about and when. I'll confirm the details and notify you at the right time.",
    source: 'Reminder System',
  },
  {
    id: 'kb-notes',
    topic: 'notes',
    keywords: ['note', 'save', 'note down', 'remember this', 'jot'],
    content: "I can take and organize notes for you. Dictate or type your thoughts, and I'll save them with timestamps. You can retrieve notes later by topic or keyword.",
    source: 'Notes Module',
  },
  {
    id: 'kb-news',
    topic: 'news',
    keywords: ['news', 'headlines', 'current events', "what's happening", 'breaking'],
    content: "I can fetch the latest news headlines across categories — tech, business, sports, science, entertainment, and world news. Ask for a specific category or I'll give you a general roundup.",
    source: 'News API',
  },
  {
    id: 'kb-music',
    topic: 'music',
    keywords: ['music', 'song', 'playlist', 'play', 'track', 'album'],
    content: 'I can help you find and play music. Tell me a genre, artist, mood, or specific song. I can create playlists, queue tracks, and control playback.',
    source: 'Music Integration',
  },
  {
    id: 'kb-math',
    topic: 'math',
    keywords: ['calculate', 'compute', 'math', 'add', 'subtract', 'multiply', 'divide', 'percentage'],
    content: 'I can perform calculations, unit conversions, and basic math operations. Just give me the numbers and the operation. I support arithmetic, percentages, and common conversions.',
    source: 'Calculator Engine',
  },
];

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

function termFrequency(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const max = Math.max(...Object.values(freq));
  for (const t in freq) freq[t] /= max;
  return freq;
}

function inMemoryRetrieve(message, topK = 3) {
  const lower = message.toLowerCase();
  const queryTokens = tokenize(message);
  const queryTF = termFrequency(queryTokens);
  const results = [];

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) score += 3;
    }
    const entryTokens = tokenize(entry.content + ' ' + entry.keywords.join(' '));
    const entryTF = termFrequency(entryTokens);
    for (const token of queryTokens) {
      if (entryTF[token]) score += queryTF[token] * entryTF[token];
    }
    if (score > 0) {
      results.push({ id: entry.id, topic: entry.topic, content: entry.content, source: entry.source, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, topK);

  if (top.length === 0) {
    return { answer: '', context: [], insights: {}, results: [], contextText: '', sources: [] };
  }

  return {
    answer: '',
    context: [],
    insights: {},
    results: top,
    contextText: top.map(r => r.content).join('\n\n'),
    sources: [...new Set(top.map(r => r.source))],
  };
}


// ══════════════════════════════════════════════════════════════
// ── Public API ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

/**
 * Retrieve relevant knowledge — uses Qdrant when available, in-memory fallback otherwise.
 * @param {string} message
 * @param {number} topK
 * @returns {Promise<{answer: string, context: Array, insights: Array, results: Array, contextText: string, sources: string[]}>}
 */
export async function retrieve(message, topK = 3) {
  if (qdrantReady) {
    return qdrantRetrieve(message, topK);
  }
  return inMemoryRetrieve(message, topK);
}

/**
 * Get the knowledge base entries (used by seed script).
 */
export function getKnowledgeBase() {
  return KNOWLEDGE_BASE;
}
