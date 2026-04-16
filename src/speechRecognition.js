/**
 * VoxFlow — Speech Recognition Module
 * Wraps the Web Speech API SpeechRecognition with start/stop, interim results,
 * error recovery, and browser compatibility checks.
 */

export class SpeechRecognizer {
  constructor({ onResult, onInterim, onStart, onEnd, onError, lang = 'en-US' }) {
    this.lang = lang;
    this.onResult = onResult;
    this.onInterim = onInterim;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.onError = onError;
    this.recognition = null;
    this.isListening = false;
    this._manualStop = false;

    this._init();
  }

  /** Check browser support */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  _init() {
    if (!SpeechRecognizer.isSupported()) {
      console.warn('[VoxFlow] SpeechRecognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this._manualStop = false;
      this.onStart?.();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.onResult?.(finalTranscript.trim());
      } else if (interimTranscript) {
        this.onInterim?.(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[VoxFlow] Speech recognition error:', event.error);
      // Don't surface "no-speech" or "aborted" when user manually stopped
      if (this._manualStop && (event.error === 'aborted' || event.error === 'no-speech')) {
        return;
      }
      this.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd?.();
    };
  }

  start() {
    if (!this.recognition) return;
    if (this.isListening) return;
    try {
      this._manualStop = false;
      this.recognition.start();
    } catch (err) {
      console.error('[VoxFlow] Failed to start recognition:', err);
    }
  }

  stop() {
    if (!this.recognition) return;
    this._manualStop = true;
    try {
      this.recognition.stop();
    } catch {
      // ignore
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }
}
