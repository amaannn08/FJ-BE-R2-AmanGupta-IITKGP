const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteAllTransactions,
  getTransactions,
} = require('../controllers/transaction.controller');
const {
  uploadReceiptMiddleware,
  uploadReceipt,
  getReceipt,
  deleteReceipt,
} = require('../controllers/receipt.controller');

const router = express.Router();

router.use(authenticateToken);

router.delete('/transactions', deleteAllTransactions);

router.post('/transactions', createTransaction);

router.get('/transactions', getTransactions);

router.put('/transactions/:id', updateTransaction);

router.delete('/transactions/:id', deleteTransaction);

router.post('/transactions/:id/receipt', uploadReceiptMiddleware, uploadReceipt);

router.get('/transactions/:id/receipt', getReceipt);

router.delete('/transactions/:id/receipt', deleteReceipt);

module.exports = router;

