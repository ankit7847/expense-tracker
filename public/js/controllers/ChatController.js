/**
 * Chat Controller
 * Role: Coordinates AI financial assistant interactions between ChatModel,
 * TransactionModel, and ChatView. Computes context summaries and manages chat turn life cycle.
 */

export class ChatController {
  /**
   * @param {import('../models/ChatModel.js').ChatModel} model
   * @param {import('../models/TransactionModel.js').TransactionModel} transactionModel
   * @param {import('../views/ChatView.js').ChatView} view
   * @param {import('./TransactionController.js').TransactionController} transactionController
   */
  constructor(model, transactionModel, view, transactionController) {
    this.model = model;
    this.transactionModel = transactionModel;
    this.view = view;
    this.transactionController = transactionController;
  }

  /**
   * Initializes chat view event listeners.
   */
  init() {
    this.view.bindToggle(() => this.view.toggle());
    this.view.bindSendMessage((message) => this.handleSendMessage(message));
    this.view.bindSuggestedChips((question) => {
      this.view.open();
      this.handleSendMessage(question);
    });
    this.view.bindClearChat(() => this.handleClearChat());
  }

  /**
   * Handles user question submission.
   * @param {string} userQuestion
   */
  async handleSendMessage(userQuestion) {
    if (!userQuestion || !userQuestion.trim()) return;

    const trimmed = userQuestion.trim();

    // 1. Render user message in UI and add to history
    this.view.appendMessage('user', trimmed);
    this.model.addMessage('user', trimmed);

    // 2. Check for empty transactions edge-case
    const allTransactions = this.transactionModel.getAll();
    if (allTransactions.length === 0) {
      const emptyMsg = "You don't have any transactions recorded yet. Add some income or expenses first so I can analyze your spending!";
      this.view.appendMessage('assistant', emptyMsg);
      this.model.addMessage('assistant', emptyMsg);
      return;
    }

    // 3. Show typing indicator while querying backend
    this.view.showTyping();

    try {
      const activeMonth = this.transactionController?.getCurrentMonth() || new Date().toISOString().substring(0, 7);
      const compactSummary = this.transactionModel.getChatContext(activeMonth);

      // Call ChatModel API
      const reply = await this.model.sendMessage(trimmed, compactSummary, allTransactions);

      // 4. Update UI and history with assistant response
      this.view.hideTyping();
      this.view.appendMessage('assistant', reply);
      this.model.addMessage('assistant', reply);
    } catch (error) {
      this.view.hideTyping();
      this.view.showError(error.message || 'Sorry, I encountered an issue analyzing your transactions.');
    }
  }

  /**
   * Clears conversation history in both model and view.
   */
  handleClearChat() {
    this.model.clearHistory();
    this.view.clearMessages();
  }
}
