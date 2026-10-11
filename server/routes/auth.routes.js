/**
 * Authentication Routes
 * Role: Maps user registration, login, and profile retrieval to AuthController.
 */

import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);

export default router;
