/**
 * Chat View
 * Role: Manages chatbot UI: chat panel open/close, rendering messages (using textContent for XSS safety),
 * typing indicator, suggested question chips, and clear-chat actions.
 * Contains no business logic or API calls.
 */

export class ChatView {
  constructor() {
    this.chatDrawer = document.getElementById('chatDrawer');
    this.openChatBtn = document.getElementById('openChatBtn');
    this.closeChatBtn = document.getElementById('closeChatBtn');
    this.messagesContainer = document.getElementById('chatMessages');
    this.typingIndicator = document.getElementById('chatTypingIndicator');
    this.inputField = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('chatSendBtn');
    this.clearBtn = document.getElementById('clearChatBtn');
    this.chipsContainer = document.getElementById('suggestedChipsContainer');
    this.unreadBadge = document.getElementById('chatUnreadBadge');
  }

  /**
   * Opens the chat side panel.
   */
  open() {
    if (this.chatDrawer) {
      this.chatDrawer.classList.add('chat-open');
      this.chatDrawer.setAttribute('aria-hidden', 'false');
      if (this.unreadBadge) {
        this.unreadBadge.classList.add('hidden');
      }
      setTimeout(() => this.inputField?.focus(), 150);
    }
  }

  /**
   * Closes the chat side panel.
   */
  close() {
    if (this.chatDrawer) {
      this.chatDrawer.classList.remove('chat-open');
      this.chatDrawer.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Toggles chat panel open/closed state.
   */
  toggle() {
    if (this.chatDrawer?.classList.contains('chat-open')) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Appends a message bubble safely using textContent.
   * @param {string} role - 'user' | 'assistant'
   * @param {string} text - Message text
   */
  appendMessage(role, text) {
    if (!this.messagesContainer) return;

    const row = document.createElement('div');
    row.className = `chat-row chat-row-${role}`;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${role}`;

    // Header badge
    const senderTag = document.createElement('div');
    senderTag.className = 'chat-sender';
    senderTag.textContent = role === 'user' ? 'You' : 'Financial Assistant';

    // Body text (textContent prevents XSS)
    const contentText = document.createElement('div');
    contentText.className = 'chat-text';
    contentText.textContent = text;

    bubble.appendChild(senderTag);
    bubble.appendChild(contentText);
    row.appendChild(bubble);

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  /**
   * Shows animated typing indicator.
   */
  showTyping() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.remove('hidden');
      this.scrollToBottom();
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = true;
    }
  }

  /**
   * Hides typing indicator.
   */
  hideTyping() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.add('hidden');
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = false;
    }
  }

  /**
   * Displays an error message bubble.
   * @param {string} errorText
   */
  showError(errorText) {
    if (!this.messagesContainer) return;

    const row = document.createElement('div');
    row.className = 'chat-row chat-row-error';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-error';

    const contentText = document.createElement('div');
    contentText.className = 'chat-text';
    contentText.textContent = errorText || 'An error occurred while contacting AI.';

    bubble.appendChild(contentText);
    row.appendChild(bubble);

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  /**
   * Clears all message bubbles except the default greeting.
   */
  clearMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';
    this.appendMessage(
      'assistant',
      'Hello! I am your personal finance assistant. Ask me anything about your spending, monthly comparisons, or tips to save!'
    );
  }

  /**
   * Scrolls chat message container to the bottom.
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  /**
   * Gets current input value and clears input.
   * @returns {string}
   */
  getAndClearInput() {
    if (!this.inputField) return '';
    const val = this.inputField.value.trim();
    this.inputField.value = '';
    return val;
  }

  /**
   * Binds toggle chat button and close button.
   * @param {Function} handler
   */
  bindToggle(handler) {
    if (this.openChatBtn) {
      this.openChatBtn.addEventListener('click', () => handler());
    }
    if (this.closeChatBtn) {
      this.closeChatBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * Binds send button and Enter key.
   * @param {Function} handler
   */
  bindSendMessage(handler) {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => {
        const text = this.getAndClearInput();
        if (text) handler(text);
      });
    }

    if (this.inputField) {
      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const text = this.getAndClearInput();
          if (text) handler(text);
        }
      });
    }
  }

  /**
   * Binds suggested question chips.
   * @param {Function} handler
   */
  bindSuggestedChips(handler) {
    if (this.chipsContainer) {
      this.chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggested-chip');
        if (chip) {
          const question = chip.getAttribute('data-question');
          if (question) handler(question);
        }
      });
    }
  }

  /**
   * Binds clear chat button.
   * @param {Function} handler
   */
  bindClearChat(handler) {
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => handler());
    }
  }
}
