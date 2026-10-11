/**
 * AI Routes
 * Role: Maps /api endpoints to AI controller handlers.
 */

import { Router } from 'express';
import { scanReceipt, chat, getStatus, setApiKey } from '../controllers/ai.controller.js';

const router = Router();

// Endpoint for receipt vision analysis
router.post('/receipt', scanReceipt);

// Endpoint for personal finance assistant chat
router.post('/chat', chat);

// Endpoint to check if Gemini API key is configured
router.get('/status', getStatus);

// Endpoint to configure Gemini API key
router.post('/config/key', setApiKey);

export default router;
