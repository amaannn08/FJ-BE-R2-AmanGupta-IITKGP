const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const { getMonthlyIncomeExpenseReport } = require('../controllers/report.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/reports/monthly-income-expense', getMonthlyIncomeExpenseReport);

module.exports = router;

