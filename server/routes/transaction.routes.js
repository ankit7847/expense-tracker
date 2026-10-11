/**
 * Transaction Routes
 * Role: Maps transaction CRUD endpoints to TransactionController with JWT authentication.
 */

import express from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', TransactionController.getAll);
router.post('/', TransactionController.create);
router.delete('/:id', TransactionController.delete);
router.post('/sync', TransactionController.sync);

export default router;
