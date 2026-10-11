/**
 * Receipt Controller
 * Role: Coordinates between ReceiptView, backend AI receipt extraction endpoint (/api/receipt),
 * on-device OCR fallback (Tesseract), and TransactionController.
 * Enforces client-side validation (file type and 5MB size limit).
 */

import { parseReceiptText } from '../utils/receiptParser.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];

export class ReceiptController {
  /**
   * @param {import('../views/ReceiptView.js').ReceiptView} view
   * @param {import('./TransactionController.js').TransactionController} transactionController
   */
  constructor(view, transactionController) {
    this.view = view;
    this.transactionController = transactionController;
    this.selectedFile = null;
    this.selectedBase64 = null;
    this.hasGeminiKey = false;
  }

  /**
   * Initializes event listeners and checks backend OCR status.
   */
  async init() {
    this.view.bindFileSelect((file) => this.handleFileSelection(file));
    this.view.bindDrop((file) => this.handleFileSelection(file));
    this.view.bindScanAction(() => this.handleScanReceipt());

    await this.checkApiKeyStatus();
  }

  /**
   * Checks with backend if server-side vision AI is configured.
   */
  async checkApiKeyStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        this.hasGeminiKey = Boolean(data.hasGeminiKey);
      }
    } catch (e) {
      console.warn('Could not check backend OCR status:', e);
    }
  }

  /**
   * Validates and loads the chosen file into preview.
   * @param {File} file
   */
  handleFileSelection(file) {
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.view.showError('File is too large. Receipts must be under 5 MB.');
      return;
    }

    const type = file.type ? file.type.toLowerCase() : '';
    // If type is empty or standard image extension
    if (type && !ALLOWED_TYPES.includes(type) && !type.startsWith('image/')) {
      this.view.showError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedBase64 = dataUrl;
      this.view.showPreview(dataUrl, file.name);
    };
    reader.onerror = () => {
      this.view.showError('Failed to read the image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Scans the receipt using Gemini Vision if configured, or Tesseract OCR fallback.
   */
  async handleScanReceipt() {
    if (!this.selectedBase64 || !this.selectedFile) {
      this.view.showError('Please choose or capture a receipt image first.');
      return;
    }

    // 1. If backend Vision AI is configured on the server, use it
    if (this.hasGeminiKey) {
      this.view.showLoading('Analyzing receipt with Smart Vision AI...');

      try {
        const response = await fetch('/api/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: this.selectedBase64,
            mimeType: this.selectedFile.type || 'image/jpeg'
          })
        });

        const data = await response.json();

        if (response.ok) {
          data.receiptImage = this.selectedBase64;
          this.transactionController.prefillForReview(data, 'Smart Vision OCR');
          this.view.hideLoading();
          this.view.clearPreview();
          this.selectedFile = null;
          this.selectedBase64 = null;
          return;
        }

        // If server indicated missing key, continue to local fallback
        if (data.noApiKey) {
          this.hasGeminiKey = false;
        } else {
          throw new Error(data.error || 'Vision scanning failed.');
        }
      } catch (err) {
        console.warn('Backend Vision attempt failed, falling back to on-device OCR:', err.message);
      }
    }

    // 2. On-Device OCR Fallback (Tesseract.js)
    if (typeof window.Tesseract !== 'undefined') {
      try {
        this.view.showLoading('Reading receipt with on-device OCR engine...');

        const result = await window.Tesseract.recognize(
          this.selectedBase64,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text' && m.progress) {
                const pct = Math.round(m.progress * 100);
                this.view.showLoading(`Reading receipt text: ${pct}%`);
              }
            }
          }
        );

        const extractedText = result.data.text;
        console.log('=== EXTRACTED OCR TEXT ===\n' + extractedText + '\n=== END OCR TEXT ===');

        const parsedData = parseReceiptText(extractedText);
        parsedData.engine = 'Smart OCR';
        parsedData.receiptImage = this.selectedBase64;

        this.transactionController.prefillForReview(parsedData, 'Smart OCR');
        this.view.hideLoading();
        this.view.clearPreview();
        this.selectedFile = null;
        this.selectedBase64 = null;
        return;
      } catch (ocrErr) {
        console.error('OCR processing failed:', ocrErr);
        this.view.hideLoading();
        this.view.showError('Could not read text from receipt. Please ensure good lighting and contrast.');
        return;
      }
    }

    // 3. Neither engine available
    this.view.hideLoading();
    this.view.showError('Could not process receipt image. Please enter transaction details manually.');
  }
}
