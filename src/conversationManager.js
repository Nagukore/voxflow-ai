/**
 * VoxFlow — Conversation Manager
 * Multi-turn context tracking, API communication, and chat UI rendering.
 */

const MAX_HISTORY = 20;

export class ConversationManager {
  constructor({ chatContainer, onStatusChange }) {
    this.chatContainer = chatContainer;
    this.onStatusChange = onStatusChange;
    this.history = [];
    this.isProcessing = false;
  }

  /** Send user message, get assistant reply */
  async send(userText) {
    if (!userText.trim() || this.isProcessing) return null;

    this.isProcessing = true;
    this.onStatusChange?.('processing', 'Thinking...');

    // Add user message to history + UI
    this.history.push({ role: 'user', content: userText.trim() });
    this._renderMessage('user', userText.trim());

    // Show typing indicator
    const typingEl = this._showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText.trim(),
          history: this.history.slice(-MAX_HISTORY),
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      const reply = data.reply || "Sorry, I didn't quite catch that.";

      // Remove typing indicator
      typingEl.remove();

      // Add assistant reply
      this.history.push({ role: 'assistant', content: reply });
      this._renderMessage('assistant', reply, data.action);

      this.isProcessing = false;
      this.onStatusChange?.('ready', 'Ready');

      return reply;
    } catch (err) {
      console.error('[VoxFlow] Chat error:', err);
      typingEl.remove();

      const errReply = "Hmm, I had trouble processing that. Can you try again?";
      this._renderMessage('assistant', errReply);

      this.isProcessing = false;
      this.onStatusChange?.('error', 'Error');

      // Reset status after a moment
      setTimeout(() => this.onStatusChange?.('ready', 'Ready'), 3000);

      return errReply;
    }
  }

  /** Render a chat bubble */
  _renderMessage(role, text, action) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}-message`;

    if (role === 'assistant') {
      msgEl.innerHTML = `
        <div class="message-avatar">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="url(#avatarGrad)" stroke-width="2" fill="none"/>
            <circle cx="16" cy="16" r="4" fill="url(#avatarGrad)"/>
            <defs>
              <linearGradient id="avatarGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stop-color="#6C63FF"/>
                <stop offset="100%" stop-color="#00D4AA"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="message-content">
          <p>${this._escapeHtml(text)}</p>
          ${action ? this._renderAction(action) : ''}
        </div>
      `;
    } else {
      msgEl.innerHTML = `
        <div class="message-content">
          <p>${this._escapeHtml(text)}</p>
        </div>
      `;
    }

    this.chatContainer.appendChild(msgEl);
    this._scrollToBottom();
  }

  /** Render action confirmation card */
  _renderAction(action) {
    return `
      <div class="action-card">
        <div class="action-card-title">⚡ ${this._escapeHtml(action.type || 'Action')}</div>
        <div class="action-card-body">${this._escapeHtml(action.description || '')}</div>
      </div>
    `;
  }

  /** Show typing dots */
  _showTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message assistant-message';
    el.id = 'typingIndicator';
    el.innerHTML = `
      <div class="message-avatar">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="url(#avatarGrad)" stroke-width="2" fill="none"/>
          <circle cx="16" cy="16" r="4" fill="url(#avatarGrad)"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="typing-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    `;
    this.chatContainer.appendChild(el);
    this._scrollToBottom();
    return el;
  }

  _scrollToBottom() {
    const area = this.chatContainer.closest('#chatArea');
    if (area) {
      requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
      });
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
