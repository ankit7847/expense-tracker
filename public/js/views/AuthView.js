/**
 * Auth View
 * Role: Manages both the Welcome/Landing Auth Gate and the backup Auth Modal.
 * Controls top-level screen visibility (Landing Gate vs App Workspace).
 * Decoupled from data and network logic. Pure DOM rendering.
 */

export class AuthView {
  constructor() {
    // Top-level views
    this.landingView = document.getElementById('authLandingView');
    this.appWorkspace = document.getElementById('appWorkspace');
    this.authNavItems = document.querySelectorAll('.auth-nav-item');
    this.demoGuestNotice = document.getElementById('demoGuestNotice');
    this.dismissDemoNoticeBtn = document.getElementById('dismissDemoNoticeBtn');
    this.demoNoticeSignInBtn = document.getElementById('demoNoticeSignInBtn');

    // Landing view auth elements
    this.landingAuthTitle = document.getElementById('landingAuthTitle');
    this.landingAuthSubtitle = document.getElementById('landingAuthSubtitle');
    this.landingTabLogin = document.getElementById('landingTabLogin');
    this.landingTabRegister = document.getElementById('landingTabRegister');
    this.landingAuthError = document.getElementById('landingAuthError');
    this.landingAuthErrorText = document.getElementById('landingAuthErrorText');
    this.landingAuthForm = document.getElementById('landingAuthForm');
    this.landingNameGroup = document.getElementById('landingNameGroup');
    this.landingName = document.getElementById('landingName');
    this.landingEmail = document.getElementById('landingEmail');
    this.landingPassword = document.getElementById('landingPassword');
    this.landingAuthSubmit = document.getElementById('landingAuthSubmit');
    this.landingExploreDemoBtn = document.getElementById('landingExploreDemoBtn');

    // Modal auth elements (for guest users inside the dashboard)
    this.authModal = document.getElementById('authModal');
    this.openAuthBtn = document.getElementById('openAuthBtn');
    this.closeAuthBtn = document.getElementById('closeAuthBtn');
    this.tabLoginBtn = document.getElementById('tabLoginBtn');
    this.tabRegisterBtn = document.getElementById('tabRegisterBtn');
    this.authForm = document.getElementById('authForm');
    this.authModalTitle = document.getElementById('authModalTitle');
    this.nameGroup = document.getElementById('authNameGroup');
    this.nameInput = document.getElementById('authName');
    this.emailInput = document.getElementById('authEmail');
    this.passwordInput = document.getElementById('authPassword');
    this.authSubmitBtn = document.getElementById('authSubmitBtn');
    this.authErrorBanner = document.getElementById('authErrorBanner');
    this.authErrorText = document.getElementById('authErrorText');

    // Header user profile area
    this.headerAuthArea = document.getElementById('headerAuthArea');
    this.userProfilePill = document.getElementById('userProfilePill');
    this.userNameText = document.getElementById('userNameText');
    this.logoutBtn = document.getElementById('logoutBtn');

    this.currentMode = 'login'; // 'login' | 'register'

    this.initEvents();
  }

  /**
   * Initializes tab switches, modal triggers, and dismissal events.
   */
  initEvents() {
    // Landing tabs
    this.landingTabLogin?.addEventListener('click', () => this.setMode('login'));
    this.landingTabRegister?.addEventListener('click', () => this.setMode('register'));

    // Modal triggers & tabs
    this.openAuthBtn?.addEventListener('click', () => this.openModal('login'));
    this.closeAuthBtn?.addEventListener('click', () => this.closeModal());
    this.demoNoticeSignInBtn?.addEventListener('click', () => this.openModal('login'));

    if (this.authModal) {
      this.authModal.addEventListener('click', (e) => {
        if (e.target === this.authModal) this.closeModal();
      });
    }

    this.tabLoginBtn?.addEventListener('click', () => this.setMode('login'));
    this.tabRegisterBtn?.addEventListener('click', () => this.setMode('register'));

    // Guest demo banner dismiss
    this.dismissDemoNoticeBtn?.addEventListener('click', () => {
      if (this.demoGuestNotice) this.demoGuestNotice.classList.add('hidden');
    });
  }

  /**
   * Synchronously switches between Login and Register modes on both landing and modal forms.
   * @param {'login'|'register'} mode
   */
  setMode(mode) {
    this.currentMode = mode;
    this.hideError();

    const isLogin = mode === 'login';

    // 1. Update Landing Card
    if (this.landingTabLogin) this.landingTabLogin.className = `landing-tab-btn ${isLogin ? 'active' : ''}`;
    if (this.landingTabRegister) this.landingTabRegister.className = `landing-tab-btn ${!isLogin ? 'active' : ''}`;
    if (this.landingNameGroup) this.landingNameGroup.classList.toggle('hidden', isLogin);
    if (this.landingName) this.landingName.required = !isLogin;
    if (this.landingAuthTitle) this.landingAuthTitle.textContent = isLogin ? 'Sign In to Your Account' : 'Create Free Account';
    if (this.landingAuthSubtitle) this.landingAuthSubtitle.textContent = isLogin
      ? 'Access your financial dashboard & saved receipts'
      : 'Start tracking expenses with smart OCR & AI insights';
    if (this.landingAuthSubmit) this.landingAuthSubmit.textContent = isLogin ? 'Sign In to Dashboard' : 'Create Free Account';

    // 2. Update Modal Form
    if (this.tabLoginBtn) this.tabLoginBtn.className = `auth-tab-btn ${isLogin ? 'active' : ''}`;
    if (this.tabRegisterBtn) this.tabRegisterBtn.className = `auth-tab-btn ${!isLogin ? 'active' : ''}`;
    if (this.nameGroup) this.nameGroup.classList.toggle('hidden', isLogin);
    if (this.nameInput) this.nameInput.required = !isLogin;
    if (this.authModalTitle) this.authModalTitle.textContent = isLogin ? 'Sign In to Your Account' : 'Create New Account';
    if (this.authSubmitBtn) this.authSubmitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
  }

  /**
   * Displays the Welcome Landing Gate view and hides the application workspace.
   */
  showLandingView() {
    if (this.landingView) this.landingView.classList.remove('hidden');
    if (this.appWorkspace) this.appWorkspace.classList.add('hidden');

    // Hide workspace navigation controls in header
    this.authNavItems.forEach(el => el.classList.add('hidden'));

    // Header user profile
    if (this.userProfilePill) this.userProfilePill.classList.add('hidden');
    if (this.openAuthBtn) this.openAuthBtn.classList.add('hidden');

    this.clearForms();
    this.hideError();
  }

  /**
   * Displays the active application workspace and hides the Landing Gate.
   * @param {Object|null} user - Null for guest demo mode, or user object for authenticated state.
   */
  showAppWorkspace(user = null) {
    if (this.landingView) this.landingView.classList.add('hidden');
    if (this.appWorkspace) this.appWorkspace.classList.remove('hidden');

    // Show workspace navigation controls in header
    this.authNavItems.forEach(el => el.classList.remove('hidden'));

    if (user) {
      // Authenticated user
      if (this.openAuthBtn) this.openAuthBtn.classList.add('hidden');
      if (this.userProfilePill) {
        this.userProfilePill.classList.remove('hidden');
        if (this.userNameText) this.userNameText.textContent = user.name || user.email;
      }
      if (this.demoGuestNotice) this.demoGuestNotice.classList.add('hidden');
    } else {
      // Guest demo mode
      if (this.userProfilePill) this.userProfilePill.classList.add('hidden');
      if (this.openAuthBtn) {
        this.openAuthBtn.classList.remove('hidden');
        const span = this.openAuthBtn.querySelector('span');
        if (span) span.textContent = 'Sign In to Save';
      }
      if (this.demoGuestNotice) this.demoGuestNotice.classList.remove('hidden');
    }

    this.closeModal();
  }

  /**
   * Opens the auth modal (used by guests from the workspace).
   * @param {'login'|'register'} [mode='login']
   */
  openModal(mode = 'login') {
    this.setMode(mode);
    if (this.authModal) {
      this.authModal.classList.remove('hidden');
    }
    if (this.emailInput) {
      this.emailInput.focus();
    }
  }

  /**
   * Closes the auth modal.
   */
  closeModal() {
    if (this.authModal) {
      this.authModal.classList.add('hidden');
    }
    this.hideError();
  }

  /**
   * Clears form input fields on both forms.
   */
  clearForms() {
    [this.landingName, this.landingEmail, this.landingPassword, this.nameInput, this.emailInput, this.passwordInput].forEach(input => {
      if (input) input.value = '';
    });
    this.hideError();
  }

  /**
   * Displays an error message on the active form.
   * @param {string} msg
   */
  showError(msg) {
    if (this.landingAuthError && this.landingAuthErrorText) {
      this.landingAuthErrorText.textContent = msg;
      this.landingAuthError.classList.remove('hidden');
    }
    if (this.authErrorBanner && this.authErrorText) {
      this.authErrorText.textContent = msg;
      this.authErrorBanner.classList.remove('hidden');
    }
  }

  /**
   * Hides error banners on both forms.
   */
  hideError() {
    if (this.landingAuthError) this.landingAuthError.classList.add('hidden');
    if (this.authErrorBanner) this.authErrorBanner.classList.add('hidden');
  }

  /**
   * Updates submit buttons with loading indicator.
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    const text = isLoading
      ? (this.currentMode === 'login' ? 'Signing in...' : 'Creating account...')
      : (this.currentMode === 'login' ? 'Sign In to Dashboard' : 'Create Free Account');

    if (this.landingAuthSubmit) {
      this.landingAuthSubmit.disabled = isLoading;
      this.landingAuthSubmit.textContent = text;
    }

    if (this.authSubmitBtn) {
      this.authSubmitBtn.disabled = isLoading;
      this.authSubmitBtn.textContent = isLoading
        ? (this.currentMode === 'login' ? 'Signing in...' : 'Creating account...')
        : (this.currentMode === 'login' ? 'Sign In' : 'Create Account');
    }
  }

  /**
   * Binds submission from either the landing form or the modal form.
   * @param {Function} handler - receives { mode, name, email, password }
   */
  bindSubmit(handler) {
    const handleFormSubmit = (e, nameField, emailField, passwordField) => {
      e.preventDefault();
      const payload = {
        mode: this.currentMode,
        name: nameField ? nameField.value.trim() : '',
        email: emailField ? emailField.value.trim() : '',
        password: passwordField ? passwordField.value : ''
      };
      handler(payload);
    };

    if (this.landingAuthForm) {
      this.landingAuthForm.addEventListener('submit', (e) =>
        handleFormSubmit(e, this.landingName, this.landingEmail, this.landingPassword)
      );
    }

    if (this.authForm) {
      this.authForm.addEventListener('submit', (e) =>
        handleFormSubmit(e, this.nameInput, this.emailInput, this.passwordInput)
      );
    }
  }

  /**
   * Binds 1-Click "Try Live Demo as Guest" button.
   * @param {Function} handler
   */
  bindExploreDemo(handler) {
    if (this.landingExploreDemoBtn) {
      this.landingExploreDemoBtn.addEventListener('click', () => handler());
    }
  }

  /**
   * Binds logout action.
   * @param {Function} handler
   */
  bindLogout(handler) {
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => handler());
    }
  }
}
