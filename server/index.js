/**
 * VoxFlow — Backend API Server
 * Express server with POST /api/chat endpoint.
 * Built-in conversational AI engine with intent detection, task execution stubs,
 * context-aware multi-turn responses, and knowledge retrieval simulation.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Intent Detection ──
const INTENTS = [
  { name: 'greeting', patterns: [/^(hi|hello|hey|howdy|good morning|good evening|good afternoon|sup|yo)\b/i] },
  { name: 'farewell', patterns: [/^(bye|goodbye|see you|later|take care|good night)\b/i] },
  { name: 'thanks', patterns: [/\b(thanks|thank you|appreciate|cheers)\b/i] },
  { name: 'capabilities', patterns: [/\b(what can you do|help me|capabilities|features|how do you work|what do you do)\b/i] },
  { name: 'weather', patterns: [/\b(weather|temperature|forecast|rain|sunny|cloudy|snow)\b/i] },
  { name: 'time', patterns: [/\b(what time|current time|time is it|what.s the time)\b/i] },
  { name: 'date', patterns: [/\b(what date|today.s date|what day|current date)\b/i] },
  { name: 'reminder', patterns: [/\b(remind|reminder|set a reminder|don.t forget)\b/i] },
  { name: 'schedule', patterns: [/\b(schedule|meeting|appointment|calendar|event|book a)\b/i] },
  { name: 'email', patterns: [/\b(email|send.*mail|compose.*email|write.*email)\b/i] },
  { name: 'search', patterns: [/\b(search|look up|find|google|look for|search for)\b/i] },
  { name: 'joke', patterns: [/\b(joke|funny|make me laugh|tell me something funny)\b/i] },
  { name: 'name', patterns: [/\b(your name|who are you|what are you|introduce yourself)\b/i] },
  { name: 'status', patterns: [/\b(how are you|how.s it going|what.s up|you doing)\b/i] },
  { name: 'calculate', patterns: [/\b(calculate|compute|what is \d|math|add|subtract|multiply|divide)\b/i] },
  { name: 'news', patterns: [/\b(news|headlines|what.s happening|current events)\b/i] },
  { name: 'music', patterns: [/\b(play music|song|playlist|music)\b/i] },
  { name: 'note', patterns: [/\b(take a note|save this|note down|remember this)\b/i] },
];

function detectIntent(message) {
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(message)) {
        return intent.name;
      }
    }
  }
  return 'general';
}

// ── Context Analysis ──
function analyzeContext(history) {
  if (!history || history.length === 0) return { isFollowUp: false };

  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  const lastUser = [...history].reverse().find(m => m.role === 'user');

  return {
    isFollowUp: history.length > 2,
    lastTopic: lastAssistant?.content?.substring(0, 100) || '',
    turnCount: history.length,
  };
}

// ── Response Generation ──
const RESPONSES = {
  greeting: [
    "Hey! How can I help you today?",
    "Hello there! What can I do for you?",
    "Hi! I'm ready to help. What do you need?",
    "Hey! Good to hear from you. What's on your mind?",
  ],
  farewell: [
    "Take care! Let me know if you need anything else.",
    "Goodbye! Have a great day.",
    "See you later! I'll be here whenever you need me.",
  ],
  thanks: [
    "You're welcome! Anything else I can help with?",
    "Happy to help! Let me know if there's more.",
    "No problem at all! What else do you need?",
  ],
  capabilities: [
    "I can help you with quite a bit! Here's what I can do: set reminders, search for information, help schedule meetings, draft emails, answer questions, and much more. Just ask naturally — I'll figure out the rest.",
  ],
  weather: [
    "I'd love to check the weather for you! Which city are you asking about?",
    "Sure, let me get the weather forecast. What location should I check?",
  ],
  time: () => {
    const now = new Date();
    return `It's currently ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}. Anything else?`;
  },
  date: () => {
    const now = new Date();
    return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. What else can I help with?`;
  },
  reminder: {
    reply: "Got it! I'll set that reminder for you. Can you confirm what I should remind you about and when?",
    action: { type: 'Reminder', description: 'Setting a new reminder — awaiting details.' },
  },
  schedule: {
    reply: "I'll help you schedule that. What's the event, and when should it be?",
    action: { type: 'Calendar', description: 'Creating a new calendar event — awaiting details.' },
  },
  email: {
    reply: "Sure, I'll draft that email. Who should I send it to, and what should it say?",
    action: { type: 'Email', description: 'Composing a new email — awaiting recipient and content.' },
  },
  search: [
    "Let me look that up for you. What exactly would you like me to search for?",
    "Sure, I'll search for that. Can you give me a bit more detail on what you're looking for?",
  ],
  joke: [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my computer I needed a break. Now it won't stop sending me vacation ads.",
    "Why did the developer go broke? Because he used up all his cache!",
    "What do you call a fake noodle? An impasta!",
    "Why do programmers prefer dark mode? Because the light attracts bugs!",
  ],
  name: [
    "I'm VoxFlow — your voice-first AI assistant. I'm here to help you get things done through conversation. What do you need?",
  ],
  status: [
    "I'm doing great, thanks for asking! Ready to help you with whatever you need.",
    "All systems go! What can I help you with?",
  ],
  calculate: [
    "I'd be happy to help with that calculation. What numbers are we working with?",
  ],
  news: [
    "I can help you catch up on the latest news. Any specific topic you're interested in — tech, business, sports, world news?",
  ],
  music: [
    "I can help with music! Would you like me to play something specific, or should I suggest a playlist?",
    "Sure! What kind of music are you in the mood for?",
  ],
  note: {
    reply: "I'll save that for you. What would you like the note to say?",
    action: { type: 'Note', description: 'Creating a new note — awaiting content.' },
  },
  general: [
    "Interesting! Tell me a bit more so I can help you better.",
    "I'm not 100% sure about that, but I can look into it. Can you give me more context?",
    "Got it. Let me think about the best way to help you with that.",
    "That's a great question. Let me see what I can find.",
    "I want to make sure I get this right. Could you rephrase that for me?",
  ],
};

function generateResponse(intent, message, context) {
  const responseSet = RESPONSES[intent];

  if (!responseSet) {
    return { reply: pickRandom(RESPONSES.general) };
  }

  // Function-based responses (time, date)
  if (typeof responseSet === 'function') {
    return { reply: responseSet() };
  }

  // Action-bearing responses
  if (responseSet.reply) {
    return { reply: responseSet.reply, action: responseSet.action };
  }

  // Array of possible replies
  if (Array.isArray(responseSet)) {
    let reply = pickRandom(responseSet);

    // Add context-aware follow-up for follow-up turns
    if (context.isFollowUp && context.turnCount > 4 && Math.random() > 0.7) {
      reply += " By the way, let me know if you'd like me to do anything else.";
    }

    return { reply };
  }

  return { reply: pickRandom(RESPONSES.general) };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── API Endpoint ──
app.post('/api/chat', (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message.' });
    }

    const intent = detectIntent(message);
    const context = analyzeContext(history || []);
    const response = generateResponse(intent, message, context);

    console.log(`[VoxFlow] Intent: ${intent} | Message: "${message.substring(0, 60)}"`);

    res.json({
      reply: response.reply,
      action: response.action || null,
      intent,
    });
  } catch (err) {
    console.error('[VoxFlow] Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'VoxFlow API', timestamp: new Date().toISOString() });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`[VoxFlow] API server running on http://localhost:${PORT}`);
});
