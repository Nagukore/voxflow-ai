/**
 * VoxFlow — Main Application Bootstrap
 * Wires up UI elements, initializes speech engines, and handles the conversation flow.
 */

import './style.css';
import { SpeechRecognizer } from './speechRecognition.js';
import { SpeechSynth } from './speechSynthesis.js';
import { ConversationManager } from './conversationManager.js';

// ── DOM References ──
const micBtn = document.getElementById('micBtn');
const micIcon = micBtn.querySelector('.mic-icon');
const micStopIcon = micBtn.querySelector('.mic-stop-icon');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const liveTranscript = document.getElementById('liveTranscript');
const transcriptText = document.getElementById('transcriptText');
const chatMessages = document.getElementById('chatMessages');

// ── Status Helper ──
function setStatus(state, text) {
  statusDot.className = 'status-dot';
  if (state !== 'ready') statusDot.classList.add(state);
  statusText.textContent = text;
}

// ── Conversation Manager ──
const conversation = new ConversationManager({
  chatContainer: chatMessages,
  onStatusChange: setStatus,
});

// ── Speech Synthesis ──
const tts = new SpeechSynth({
  rate: 1.05,
  onStart: () => setStatus('processing', 'Speaking'),
  onEnd: () => setStatus('ready', 'Ready'),
});

// ── Speech Recognition ──
let recognizer = null;

if (SpeechRecognizer.isSupported()) {
  recognizer = new SpeechRecognizer({
    onStart: () => {
      micBtn.classList.add('listening');
      micIcon.classList.add('hidden');
      micStopIcon.classList.remove('hidden');
      liveTranscript.classList.remove('hidden');
      transcriptText.textContent = 'Listening...';
      setStatus('listening', 'Listening');
      tts.cancel(); // Stop TTS when user starts speaking
    },
    onInterim: (text) => {
      transcriptText.textContent = text;
    },
    onResult: async (text) => {
      transcriptText.textContent = text;
      // Small delay so user can see the final transcript
      setTimeout(async () => {
        stopListeningUI();
        const reply = await conversation.send(text);
        if (reply) tts.speak(reply);
      }, 300);
    },
    onEnd: () => {
      stopListeningUI();
    },
    onError: (err) => {
      stopListeningUI();
      if (err === 'not-allowed') {
        setStatus('error', 'Mic denied');
      }
    },
  });
} else {
  // Disable mic button if not supported
  micBtn.style.opacity = '0.4';
  micBtn.style.cursor = 'not-allowed';
  micBtn.title = 'Speech recognition not supported in this browser';
}

function stopListeningUI() {
  micBtn.classList.remove('listening');
  micIcon.classList.remove('hidden');
  micStopIcon.classList.add('hidden');
  liveTranscript.classList.add('hidden');
}

// ── Event Listeners ──

// Mic button
micBtn.addEventListener('click', () => {
  if (!recognizer) return;
  recognizer.toggle();
});

// Text input — send on Enter
textInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && textInput.value.trim()) {
    e.preventDefault();
    await sendTextMessage();
  }
});

// Send button
sendBtn.addEventListener('click', async () => {
  if (textInput.value.trim()) {
    await sendTextMessage();
  }
});

// Highlight send button when input has text
textInput.addEventListener('input', () => {
  sendBtn.classList.toggle('active', textInput.value.trim().length > 0);
});

// Quick action buttons
document.addEventListener('click', async (e) => {
  if (e.target.matches('.quick-action-btn')) {
    const query = e.target.dataset.query;
    if (query) {
      textInput.value = '';
      const reply = await conversation.send(query);
      if (reply) tts.speak(reply);
    }
  }
});

async function sendTextMessage() {
  const text = textInput.value.trim();
  textInput.value = '';
  sendBtn.classList.remove('active');
  const reply = await conversation.send(text);
  if (reply) tts.speak(reply);
}

// ── Initialization ──
setStatus('ready', 'Ready');
console.log('[VoxFlow] Application initialized.');
