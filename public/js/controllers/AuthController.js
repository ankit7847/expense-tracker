/**
 * Auth Controller
 * Role: Coordinates authentication gate workflow, login/registration,
 * guest demo exploration, and database data synchronization.
 */

export class AuthController {
  /**
   * @param {import('../models/AuthModel.js').AuthModel} authModel
   * @param {import('../views/AuthView.js').AuthView} authView
   * @param {import('../models/TransactionModel.js').TransactionModel} transactionModel
   * @param {import('./TransactionController.js').TransactionController} transactionController
   */
  constructor(authModel, authView, transactionModel, transactionController) {
    this.authModel = authModel;
    this.authView = authView;
    this.transactionModel = transactionModel;
    this.transactionController = transactionController;

    // Link models
    this.transactionModel.setAuthModel(this.authModel);
  }

  /**
   * Initializes session check and event listeners.
   */
  async init() {
    this.authView.bindSubmit((credentials) => this.handleSubmit(credentials));
    this.authView.bindExploreDemo(() => this.handleExploreDemo());
    this.authView.bindLogout(() => this.handleLogout());

    // Check existing session
    const isValid = await this.authModel.verifySession();

    if (isValid && this.authModel.getUser()) {
      // User is already logged in: show dashboard workspace
      const user = this.authModel.getUser();
      this.authView.showAppWorkspace(user);
      await this.transactionModel.loadFromServer();
      this.transactionController.refreshView();
    } else {
      // User is not logged in: gate the application behind the Landing Page
      this.authView.showLandingView();
    }
  }

  /**
   * Handles user submission of login or register form.
   * @param {Object} credentials
   */
  async handleSubmit({ mode, name, email, password }) {
    this.authView.hideError();
    this.authView.setLoading(true);

    try {
      let user;
      if (mode === 'register') {
        user = await this.authModel.register({ name, email, password });
      } else {
        user = await this.authModel.login({ email, password });
      }

      // Transition to application workspace
      this.authView.showAppWorkspace(user);

      // Optionally sync local/guest transactions to cloud database account
      const localTxs = this.transactionModel.loadFromStorage();
      if (localTxs.length > 0) {
        try {
          const token = this.authModel.getToken();
          await fetch('/api/transactions/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ transactions: localTxs })
          });
        } catch (syncErr) {
          console.warn('Sync failed:', syncErr);
        }
      }

      // Reload fresh transactions from server database
      await this.transactionModel.loadFromServer();
      this.transactionController.refreshView();
    } catch (err) {
      this.authView.showError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      this.authView.setLoading(false);
    }
  }

  /**
   * Allows visitors to explore the interactive dashboard as a guest.
   */
  handleExploreDemo() {
    this.transactionModel.seedDemoData();
    this.authView.showAppWorkspace(null); // Guest mode
    this.transactionController.refreshView();
  }

  /**
   * Handles user logout: clears credentials, wipes private workspace,
   * and transitions back to the Landing / Sign-in screen.
   */
  handleLogout() {
    this.authModel.clearSession();
    this.transactionModel.transactions = [];
    localStorage.removeItem('expense_tracker_transactions_v1');
    this.authView.showLandingView();
  }
}
