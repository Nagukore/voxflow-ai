/**
 * VoxFlow — Vapi Voice Module
 * Wraps the @vapi-ai/web SDK for professional voice I/O.
 * Handles call lifecycle, real-time transcripts, and TTS.
 * Falls back to browser Web Speech API if Vapi is not configured.
 */

import Vapi from '@vapi-ai/web';

export class VapiVoice {
  /**
   * @param {object} opts
   * @param {string} opts.publicKey  - Vapi Public API Key
   * @param {string} opts.assistantId - Vapi Assistant ID
   * @param {Function} [opts.onCallStart]   - Called when voice call begins
   * @param {Function} [opts.onCallEnd]     - Called when voice call ends
   * @param {Function} [opts.onTranscript]  - Called with transcript text (partial + final)
   * @param {Function} [opts.onSpeechStart] - Called when assistant starts speaking
   * @param {Function} [opts.onSpeechEnd]   - Called when assistant stops speaking
   * @param {Function} [opts.onError]       - Called on error
   */
  constructor({ publicKey, assistantId, onCallStart, onCallEnd, onTranscript, onSpeechStart, onSpeechEnd, onError }) {
    this.publicKey = publicKey;
    this.assistantId = assistantId;
    this.onCallStart = onCallStart;
    this.onCallEnd = onCallEnd;
    this.onTranscript = onTranscript;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.onError = onError;

    this.vapi = null;
    this.isInCall = false;
    this.isMuted = false;

    this._init();
  }

  /**
   * Check if Vapi is configured (keys provided).
   */
  static isConfigured(publicKey, assistantId) {
    return !!(publicKey && assistantId && publicKey !== 'your-vapi-public-key');
  }

  /**
   * Initialize the Vapi instance and register event handlers.
   */
  _init() {
    if (!this.publicKey) {
      console.warn('[VoxFlow] Vapi public key not provided — voice will use browser fallback.');
      return;
    }

    try {
      this.vapi = new Vapi(this.publicKey);

      // ── Call lifecycle events ──
      this.vapi.on('call-start', () => {
        console.log('[VoxFlow] 🎙️ Vapi call started');
        this.isInCall = true;
        this.onCallStart?.();
      });

      this.vapi.on('call-end', () => {
        console.log('[VoxFlow] 🔇 Vapi call ended');
        this.isInCall = false;
        this.onCallEnd?.();
      });

      // ── Speech events ──
      this.vapi.on('speech-start', () => {
        this.onSpeechStart?.();
      });

      this.vapi.on('speech-end', () => {
        this.onSpeechEnd?.();
      });

      // ── Message events (transcripts, tool calls, etc.) ──
      this.vapi.on('message', (message) => {
        if (message.type === 'transcript') {
          this.onTranscript?.({
            text: message.transcript,
            role: message.role,           // 'user' or 'assistant'
            isFinal: message.transcriptType === 'final',
          });
        }
      });

      // ── Error handling ──
      this.vapi.on('error', (error) => {
        console.error('[VoxFlow] Vapi error:', error);
        this.onError?.(error);
      });

      console.log('[VoxFlow] ✅ Vapi voice initialized');
    } catch (err) {
      console.error('[VoxFlow] Failed to initialize Vapi:', err);
      this.vapi = null;
    }
  }

  /**
   * Start a voice call with the configured assistant.
   */
  async start() {
    if (!this.vapi) {
      console.warn('[VoxFlow] Vapi not initialized');
      return false;
    }

    if (this.isInCall) {
      console.warn('[VoxFlow] Already in a call');
      return false;
    }

    try {
      await this.vapi.start(this.assistantId);
      return true;
    } catch (err) {
      console.error('[VoxFlow] Failed to start Vapi call:', err);
      this.onError?.(err);
      return false;
    }
  }

  /**
   * Stop the current voice call.
   */
  stop() {
    if (!this.vapi || !this.isInCall) return;

    try {
      this.vapi.stop();
    } catch (err) {
      console.error('[VoxFlow] Failed to stop Vapi call:', err);
    }
  }

  /**
   * Toggle the voice call (start/stop).
   */
  async toggle() {
    if (this.isInCall) {
      this.stop();
    } else {
      await this.start();
    }
  }

  /**
   * Make the assistant say specific text.
   * @param {string} text
   * @param {boolean} [endCallAfter=false]
   */
  say(text, endCallAfter = false) {
    if (!this.vapi || !this.isInCall) return;

    try {
      this.vapi.say(text, endCallAfter);
    } catch (err) {
      console.error('[VoxFlow] Failed to say text:', err);
    }
  }

  /**
   * Toggle mute on the user's microphone.
   */
  toggleMute() {
    if (!this.vapi || !this.isInCall) return;

    this.isMuted = !this.isMuted;
    this.vapi.setMuted(this.isMuted);
    return this.isMuted;
  }

  /**
   * Set mute state explicitly.
   */
  setMuted(muted) {
    if (!this.vapi || !this.isInCall) return;

    this.isMuted = muted;
    this.vapi.setMuted(muted);
  }

  /**
   * Check if Vapi is ready to use.
   */
  isReady() {
    return this.vapi !== null;
  }
}
