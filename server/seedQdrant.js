/**
 * VoxFlow — Qdrant Seed Script
 * Creates the voxflow-kb collection and populates it with knowledge base entries.
 *
 * Usage: node server/seedQdrant.js
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Load .env ──
try {
  const dotenv = await import('dotenv');
  const configFn = dotenv.config || dotenv.default?.config;
  if (configFn) {
    configFn({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  }
} catch {
  console.error('❌ dotenv not found. Install it: npm install dotenv');
  process.exit(1);
}

// ── Validate env ──
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || 'voxflow-kb';

if (!QDRANT_URL || !QDRANT_API_KEY) {
  console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY in .env');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env (needed for embeddings)');
  process.exit(1);
}

// ── Knowledge Base Entries ──
const KNOWLEDGE_BASE = [
  {
    topic: 'capabilities',
    content: 'VoxFlow is a voice-first AI assistant. I can set reminders, schedule meetings, draft emails, take notes, search for information, tell jokes, check the time and date, retrieve news, and play music. I use a combination of knowledge retrieval, reasoning, and external API integrations to serve you.',
    source: 'VoxFlow Documentation',
  },
  {
    topic: 'weather',
    content: "I can look up real-time weather data for any city. Just tell me the location, and I'll fetch the current conditions and forecast. I integrate with weather APIs to provide accurate temperature, humidity, wind, and precipitation info.",
    source: 'Weather Module',
  },
  {
    topic: 'scheduling',
    content: "I can create, view, and manage calendar events. Tell me the event name, date, time, and any attendees. I'll confirm before adding it to your calendar. I support recurring events and can check for conflicts.",
    source: 'Calendar Integration',
  },
  {
    topic: 'email',
    content: "I can compose and send emails on your behalf. Provide the recipient, subject, and body — I'll draft it for you to review before sending. I can also summarize recent emails if needed.",
    source: 'Email Integration',
  },
  {
    topic: 'reminders',
    content: "I can set time-based and location-based reminders. Just tell me what to remind you about and when. I'll confirm the details and notify you at the right time.",
    source: 'Reminder System',
  },
  {
    topic: 'notes',
    content: "I can take and organize notes for you. Dictate or type your thoughts, and I'll save them with timestamps. You can retrieve notes later by topic or keyword.",
    source: 'Notes Module',
  },
  {
    topic: 'news',
    content: "I can fetch the latest news headlines across categories — tech, business, sports, science, entertainment, and world news. Ask for a specific category or I'll give you a general roundup.",
    source: 'News API',
  },
  {
    topic: 'music',
    content: 'I can help you find and play music. Tell me a genre, artist, mood, or specific song. I can create playlists, queue tracks, and control playback.',
    source: 'Music Integration',
  },
  {
    topic: 'math',
    content: 'I can perform calculations, unit conversions, and basic math operations. Just give me the numbers and the operation. I support arithmetic, percentages, and common conversions.',
    source: 'Calculator Engine',
  },
  {
    topic: 'architecture',
    content: 'VoxFlow uses an orchestrator architecture. Every query goes through: 1) Intent Detection, 2) Query Classification (KNOWLEDGE, ACTION, or GENERAL), 3) Tool Routing (retrieval, API, or reasoning), 4) Response Generation. Knowledge queries use Qdrant vector search for retrieval. Action queries prepare tasks for user confirmation. General queries respond directly.',
    source: 'System Architecture',
  },
  {
    topic: 'voice',
    content: 'VoxFlow integrates with Vapi AI for professional voice I/O. Users can tap the microphone to start a voice conversation. Vapi handles speech-to-text transcription and text-to-speech responses. The system also supports text input for users who prefer typing.',
    source: 'Voice System',
  },
];

// ── Main ──
async function main() {
  console.log('🚀 VoxFlow Qdrant Seed Script');
  console.log(`📍 Target: ${QDRANT_URL}`);
  console.log(`📦 Collection: ${COLLECTION}`);
  console.log(`📄 Entries: ${KNOWLEDGE_BASE.length}`);
  console.log('');

  // Initialize clients
  const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  // Step 1: Check/create collection
  console.log('1️⃣  Checking collection...');
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION);

  if (exists) {
    console.log(`   Collection "${COLLECTION}" already exists. Deleting and recreating...`);
    await qdrant.deleteCollection(COLLECTION);
  }

  // gemini-embedding-001 outputs 3072-dimensional vectors
  await qdrant.createCollection(COLLECTION, {
    vectors: {
      size: 3072,
      distance: 'Cosine',
    },
  });
  console.log(`   ✅ Collection "${COLLECTION}" created (3072d, Cosine)`);

  // Step 2: Generate embeddings and upsert
  console.log('');
  console.log('2️⃣  Generating embeddings & upserting...');

  const points = [];
  for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
    const entry = KNOWLEDGE_BASE[i];
    const textToEmbed = `${entry.topic}: ${entry.content}`;

    process.stdout.write(`   [${i + 1}/${KNOWLEDGE_BASE.length}] Embedding "${entry.topic}"...`);

    const result = await embeddingModel.embedContent(textToEmbed);
    const vector = result.embedding.values;

    points.push({
      id: i + 1,
      vector,
      payload: {
        topic: entry.topic,
        content: entry.content,
        source: entry.source,
      },
    });

    console.log(` ✅ (${vector.length}d)`);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  // Step 3: Upsert all points
  console.log('');
  console.log('3️⃣  Upserting to Qdrant...');

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points,
  });

  console.log(`   ✅ Upserted ${points.length} points`);

  // Step 4: Verify with a test search
  console.log('');
  console.log('4️⃣  Verifying with test search: "What can you do?"');

  const testResult = await embeddingModel.embedContent('What can you do?');
  const testVector = testResult.embedding.values;

  const searchResults = await qdrant.search(COLLECTION, {
    vector: testVector,
    limit: 3,
    with_payload: true,
  });

  console.log('   Search results:');
  for (const result of searchResults) {
    console.log(`   • [${result.score.toFixed(4)}] ${result.payload.topic}: ${result.payload.content.substring(0, 80)}...`);
  }

  console.log('');
  console.log('✅ Seed complete! Qdrant is ready for VoxFlow retrieval.');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
