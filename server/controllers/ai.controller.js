/**
 * AI Controller
 * Role: Express controller for /api/receipt, /api/chat, /api/status, and /api/config/key endpoints.
 * Validates inputs, limits payload size, invokes Gemini service, and manages API key status.
 * Never logs raw image data or sensitive user information.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseReceiptImage, generateChatResponse, isApiKeyConfigured } from '../services/gemini.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.37; // Up to ~10MB payload limit

/**
 * Returns whether a Gemini API key is active.
 * GET /api/status
 */
export function getStatus(req, res) {
  res.json({
    hasGeminiKey: isApiKeyConfigured()
  });
}

/**
 * Allows user to configure GEMINI_API_KEY securely from the UI.
 * Saves to .env and updates process.env in memory.
 * POST /api/config/key
 * Body: { apiKey: string }
 */
export async function setApiKey(req, res) {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(400).json({ error: 'Please provide a valid Gemini API key.' });
    }

    const trimmedKey = apiKey.trim();
    const envPath = path.join(__dirname, '../../.env');

    let currentEnv = '';
    if (fs.existsSync(envPath)) {
      currentEnv = fs.readFileSync(envPath, 'utf8');
    }

    // Replace existing GEMINI_API_KEY or append
    let updatedEnv;
    if (/^GEMINI_API_KEY=.*/m.test(currentEnv)) {
      updatedEnv = currentEnv.replace(/^GEMINI_API_KEY=.*/m, `GEMINI_API_KEY=${trimmedKey}`);
    } else {
      updatedEnv = currentEnv + (currentEnv.endsWith('\n') ? '' : '\n') + `GEMINI_API_KEY=${trimmedKey}\n`;
    }

    fs.writeFileSync(envPath, updatedEnv, 'utf8');
    process.env.GEMINI_API_KEY = trimmedKey;

    console.log('Gemini API key updated in .env successfully.');
    return res.json({ success: true, message: 'Gemini API key configured successfully!' });
  } catch (err) {
    console.error('Failed to save API key:', err.message);
    return res.status(500).json({ error: 'Failed to write key to .env file: ' + err.message });
  }
}

/**
 * Handles receipt image analysis.
 * POST /api/receipt
 * Body: { image: string (base64 data), mimeType: string }
 */
export async function scanReceipt(req, res) {
  try {
    const { image, mimeType } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid receipt image in base64 format.'
      });
    }

    // Robustly strip data URL prefix (handles any mime type or parameter like charset)
    let cleanBase64 = image;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    cleanBase64 = cleanBase64.trim();

    if (!cleanBase64) {
      return res.status(400).json({
        error: 'Empty image data received.'
      });
    }

    if (cleanBase64.length > MAX_BASE64_LENGTH) {
      return res.status(400).json({
        error: 'Image exceeds maximum allowed size of 5 MB.'
      });
    }

    // Normalize mime type
    let normalizedMime = (mimeType || 'image/jpeg').toLowerCase();
    if (normalizedMime === 'image/jpg') normalizedMime = 'image/jpeg';

    // Call service to extract receipt data
    const receiptData = await parseReceiptImage({
      base64Data: cleanBase64,
      mimeType: normalizedMime
    });

    return res.status(200).json(receiptData);
  } catch (error) {
    console.error('Error in scanReceipt controller:', error.message);
    if (error.code === 'NO_API_KEY') {
      return res.status(400).json({
        error: 'Gemini API key is not configured in .env. Please configure your key to use Gemini Vision OCR.',
        noApiKey: true
      });
    }
    return res.status(500).json({
      error: error.message || 'An error occurred while analyzing the receipt image.'
    });
  }
}

/**
 * Handles AI chat financial questions.
 * POST /api/chat
 * Body: { message: string, history: Array, transactions: Array, contextSummary: Object }
 */
export async function chat(req, res) {
  try {
    const { message, history, transactions, contextSummary } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'A non-empty question message is required.'
      });
    }

    const reply = await generateChatResponse({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      compactSummary: contextSummary || {},
      transactions: Array.isArray(transactions) ? transactions : []
    });

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in chat controller:', error.message);
    return res.status(500).json({
      error: error.message || 'An error occurred while answering your question.'
    });
  }
}
