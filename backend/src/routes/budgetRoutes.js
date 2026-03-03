const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  setBudget,
  getBudgetsForMonth,
  getBudgetProgress,
} = require('../controllers/budget.controller');

const router = express.Router();

router.use(authenticateToken);

router.put('/budgets/:categoryId', setBudget);

router.get('/budgets', getBudgetsForMonth);

router.get('/budgets/progress', getBudgetProgress);

module.exports = router;

