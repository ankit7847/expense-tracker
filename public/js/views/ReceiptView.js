/**
 * Receipt View
 * Role: Manages receipt upload UI elements: drop zone, file input, camera button,
 * image preview, loading spinner, status indicators, and API key setup modal.
 * Pure DOM layer, no direct business logic.
 */

export class ReceiptView {
  constructor() {
    this.dropZone = document.getElementById('receiptDropZone');
    this.fileInput = document.getElementById('receiptFileInput');
    this.cameraInput = document.getElementById('receiptCameraInput');
    this.selectFileBtn = document.getElementById('selectFileBtn');
    this.openCameraBtn = document.getElementById('openCameraBtn');

    // Preview elements
    this.previewContainer = document.getElementById('receiptPreviewContainer');
    this.previewImage = document.getElementById('receiptPreviewImg');
    this.previewFileName = document.getElementById('receiptFileName');
    this.removePreviewBtn = document.getElementById('removePreviewBtn');
    this.scanBtn = document.getElementById('scanReceiptBtn');

    // Spinner and progress
    this.spinnerContainer = document.getElementById('receiptSpinnerContainer');
    this.spinnerText = document.getElementById('receiptSpinnerText');

    // Error and status banner
    this.errorBanner = document.getElementById('receiptErrorBanner');
    this.errorText = document.getElementById('receiptErrorText');
  }

  /**
   * Displays loading spinner with custom message.
   * @param {string} message
   */
  showLoading(message = 'Analyzing receipt...') {
    if (this.spinnerContainer) {
      this.spinnerContainer.classList.remove('hidden');
    }
    if (this.spinnerText) {
      this.spinnerText.textContent = message;
    }
    if (this.scanBtn) {
      this.scanBtn.disabled = true;
    }
    this.clearError();
  }

  /**
   * Hides the loading spinner.
   */
  hideLoading() {
    if (this.spinnerContainer) {
      this.spinnerContainer.classList.add('hidden');
    }
    if (this.scanBtn) {
      this.scanBtn.disabled = false;
    }
  }

  /**
   * Displays an error banner with accessible text.
   * @param {string} message
   */
  showError(message) {
    if (this.errorBanner && this.errorText) {
      this.errorText.textContent = message;
      this.errorBanner.classList.remove('hidden');
    }
  }

  /**
   * Clears the error banner.
   */
  clearError() {
    if (this.errorBanner && this.errorText) {
      this.errorText.textContent = '';
      this.errorBanner.classList.add('hidden');
    }
  }

  /**
   * Displays image thumbnail preview.
   * @param {string} dataUrl
   * @param {string} fileName
   */
  showPreview(dataUrl, fileName) {
    if (this.previewContainer) {
      this.previewContainer.classList.remove('hidden');
    }
    if (this.previewImage) {
      this.previewImage.src = dataUrl;
    }
    if (this.previewFileName) {
      this.previewFileName.textContent = fileName || 'Selected receipt image';
    }
    if (this.dropZone) {
      this.dropZone.classList.add('has-preview');
    }
    this.clearError();
  }

  /**
   * Clears the image preview.
   */
  clearPreview() {
    if (this.previewContainer) {
      this.previewContainer.classList.add('hidden');
    }
    if (this.previewImage) {
      this.previewImage.src = '';
    }
    if (this.previewFileName) {
      this.previewFileName.textContent = '';
    }
    if (this.dropZone) {
      this.dropZone.classList.remove('has-preview');
    }
    if (this.fileInput) {
      this.fileInput.value = '';
    }
    if (this.cameraInput) {
      this.cameraInput.value = '';
    }
  }

  /**
   * Binds file selection from standard picker and camera capture input.
   * Also binds click on dropZone area.
   * @param {Function} handler
   */
  bindFileSelect(handler) {
    // Clicking anywhere on dropZone opens file dialog (unless clicking child buttons)
    if (this.dropZone) {
      this.dropZone.addEventListener('click', (e) => {
        if (e.target.closest('#openCameraBtn')) return;
        if (this.fileInput) this.fileInput.click();
      });
    }

    if (this.selectFileBtn && this.fileInput) {
      this.selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.fileInput.click();
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handler(file);
      });
    }

    if (this.openCameraBtn && this.cameraInput) {
      this.openCameraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cameraInput.click();
      });
    }

    if (this.cameraInput) {
      this.cameraInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handler(file);
      });
    }
  }

  /**
   * Binds drag-and-drop interactions to drop zone.
   * @param {Function} handler
   */
  bindDrop(handler) {
    if (!this.dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-active');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) handler(file);
    });
  }

  /**
   * Binds the "Scan & Extract" action button.
   * @param {Function} handler
   */
  bindScanAction(handler) {
    if (this.scanBtn) {
      this.scanBtn.addEventListener('click', () => {
        handler();
      });
    }

    if (this.removePreviewBtn) {
      this.removePreviewBtn.addEventListener('click', () => {
        this.clearPreview();
        this.clearError();
      });
    }
  }
}

