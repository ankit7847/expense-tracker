/**
 * Chat Model
 * Role: Manages AI conversation history state and handles API calls to /api/chat.
 * Does not interact with the DOM or UI elements.
 */

export class ChatModel {
  constructor() {
    this.history = [];
  }

  /**
   * Retrieves conversation history.
   * @returns {Array<{ role: string, content: string, timestamp: number }>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Adds a message to the history.
   * @param {string} role - 'user' | 'assistant'
   * @param {string} content - Message text
   */
  addMessage(role, content) {
    this.history.push({
      role,
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Clears conversation history.
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Sends user message, compact summary, and transactions to backend /api/chat.
   * @param {string} message - User query
   * @param {Object} contextSummary - Compact precomputed summary
   * @param {Array} transactions - All transactions
   * @returns {Promise<string>} Assistant reply
   */
  async sendMessage(message, contextSummary, transactions) {
    const payload = {
      message,
      history: this.history,
      contextSummary,
      transactions
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch response from AI assistant.');
    }

    return data.reply;
  }
}
