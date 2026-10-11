/**
 * Application Bootstrap
 * Role: Main entry point for the frontend ES Modules. Instantiates Models, Views,
 * and Controllers, wires them up strictly according to MVC principles,
 * handles top-level view switching, authentication, and demo seeding.
 */

import { AuthModel } from './models/AuthModel.js';
import { TransactionModel } from './models/TransactionModel.js';
import { ChatModel } from './models/ChatModel.js';

import { AuthView } from './views/AuthView.js';
import { DemoBannerView } from './views/DemoBannerView.js';
import { TransactionView } from './views/TransactionView.js';
import { ChartView } from './views/ChartView.js';
import { ReceiptView } from './views/ReceiptView.js';
import { ReceiptHistoryView } from './views/ReceiptHistoryView.js';
import { ChatView } from './views/ChatView.js';

import { AuthController } from './controllers/AuthController.js';
import { TransactionController } from './controllers/TransactionController.js';
import { ReceiptController } from './controllers/ReceiptController.js';
import { ReceiptHistoryController } from './controllers/ReceiptHistoryController.js';
import { ChatController } from './controllers/ChatController.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Instantiate Models
  const authModel = new AuthModel();
  const transactionModel = new TransactionModel();
  const chatModel = new ChatModel();

  // 2. Instantiate Views
  const authView = new AuthView();
  const demoBannerView = new DemoBannerView();
  const transactionView = new TransactionView();
  const chartView = new ChartView();
  const receiptView = new ReceiptView();
  const receiptHistoryView = new ReceiptHistoryView();
  const chatView = new ChatView();

  // 3. Instantiate Controllers with dependency injection
  const transactionController = new TransactionController(transactionModel, transactionView, chartView);
  const receiptHistoryController = new ReceiptHistoryController(transactionModel, receiptHistoryView, transactionController);
  const receiptController = new ReceiptController(receiptView, transactionController);
  const chatController = new ChatController(chatModel, transactionModel, chatView, transactionController);
  const authController = new AuthController(authModel, authView, transactionModel, transactionController);

  // Link transaction controller to history controller for automatic cross-sync
  transactionController.setReceiptHistoryController(receiptHistoryController);

  // 4. Initialize Controllers
  transactionController.init();
  receiptHistoryController.init();
  receiptController.init();
  chatController.init();
  await authController.init();

  // 5. Initialize Demo Banner & 1-Click Interactive Demo Loader
  demoBannerView.init();
  demoBannerView.bindDismiss();
  demoBannerView.bindCreateAccount(() => {
    authView.openModal('register');
  });
  demoBannerView.bindLoadDemo(() => {
    console.log('Loading rich interactive demo data...');
    transactionModel.seedDemoData();
    transactionController.refreshView();
    receiptHistoryController.refreshView();
  });

  // 6. Setup Top-Level Navigation Tabs (Dashboard vs Receipts)
  const navDashboardBtn = document.getElementById('navDashboardBtn');
  const navReceiptsBtn = document.getElementById('navReceiptsBtn');
  const viewDashboard = document.getElementById('viewDashboard');
  const viewReceipts = document.getElementById('viewReceipts');

  function switchTab(target) {
    if (target === 'receipts') {
      navDashboardBtn?.classList.remove('active');
      navReceiptsBtn?.classList.add('active');
      viewDashboard?.classList.add('hidden');
      viewReceipts?.classList.remove('hidden');
      receiptHistoryController.refreshView();
    } else {
      navReceiptsBtn?.classList.remove('active');
      navDashboardBtn?.classList.add('active');
      viewReceipts?.classList.add('hidden');
      viewDashboard?.classList.remove('hidden');
      transactionController.refreshView();
    }
  }

  navDashboardBtn?.addEventListener('click', () => switchTab('dashboard'));
  navReceiptsBtn?.addEventListener('click', () => switchTab('receipts'));

  console.log('Expense Tracker initialized with Auth, Cloud DB, and Interactive Demo.');
});
