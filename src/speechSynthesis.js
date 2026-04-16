/**
 * VoxFlow — Speech Synthesis Module
 * Wraps the Web Speech API SpeechSynthesis with voice selection,
 * queue management, and cancel support.
 */

export class SpeechSynth {
  constructor({ onStart, onEnd, voiceName, rate = 1, pitch = 1 } = {}) {
    this.synth = window.speechSynthesis;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.preferredVoice = voiceName || null;
    this.rate = rate;
    this.pitch = pitch;
    this.voice = null;
    this.isSpeaking = false;

    this._loadVoices();
    // Chrome loads voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this._loadVoices();
    }
  }

  static isSupported() {
    return 'speechSynthesis' in window;
  }

  _loadVoices() {
    const voices = this.synth.getVoices();
    if (this.preferredVoice) {
      this.voice = voices.find(v => v.name.includes(this.preferredVoice)) || null;
    }
    if (!this.voice) {
      // Prefer a natural-sounding English voice
      this.voice =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en') && v.localService) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0] || null;
    }
  }

  speak(text) {
    if (!text || !this.synth) return;

    // Cancel any ongoing speech
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = 1;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('[VoxFlow] Speech synthesis error:', e.error);
      }
      this.isSpeaking = false;
      this.onEnd?.();
    };

    this.synth.speak(utterance);
  }

  cancel() {
    if (this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }
}
