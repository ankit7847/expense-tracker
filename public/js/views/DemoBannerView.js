/**
 * Demo Banner View
 * Role: Renders the introductory project overview banner on the dashboard,
 * explaining what the project does, highlighting key features, and providing
 * a 1-click interactive demo loader.
 */

export class DemoBannerView {
  constructor() {
    this.banner = document.getElementById('demoHeroBanner');
    this.loadDemoBtn = document.getElementById('loadDemoBtn');
    this.createAccountHeroBtn = document.getElementById('createAccountHeroBtn');
    this.dismissHeroBtn = document.getElementById('dismissHeroBtn');
  }

  /**
   * Shows the demo banner if not dismissed.
   */
  init() {
    const isDismissed = localStorage.getItem('expense_tracker_hero_dismissed');
    if (this.banner && !isDismissed) {
      this.banner.classList.remove('hidden');
    }
  }

  /**
   * Binds click on the "Load Interactive Demo" button.
   * @param {Function} handler
   */
  bindLoadDemo(handler) {
    if (this.loadDemoBtn) {
      this.loadDemoBtn.addEventListener('click', () => handler());
    }
  }

  /**
   * Binds click on "Create Account" CTA.
   * @param {Function} handler
   */
  bindCreateAccount(handler) {
    if (this.createAccountHeroBtn) {
      this.createAccountHeroBtn.addEventListener('click', () => handler());
    }
  }

  /**
   * Binds dismissal of the hero banner.
   */
  bindDismiss() {
    if (this.dismissHeroBtn) {
      this.dismissHeroBtn.addEventListener('click', () => {
        if (this.banner) this.banner.classList.add('hidden');
        localStorage.setItem('expense_tracker_hero_dismissed', 'true');
      });
    }
  }
}
