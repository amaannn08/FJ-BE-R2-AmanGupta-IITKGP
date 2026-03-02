const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactions,
} = require('../controllers/transaction.controller');

const router = express.Router();

router.use(authenticateToken);

router.post('/transactions', createTransaction);

router.get('/transactions', getTransactions);

router.put('/transactions/:id', updateTransaction);

router.delete('/transactions/:id', deleteTransaction);

module.exports = router;

