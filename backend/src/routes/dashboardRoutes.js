const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getSummary,
  getBreakdown,
  getMonthlyTrend,
} = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard/summary', getSummary);

router.get('/dashboard/breakdown', getBreakdown);

router.get('/dashboard/trend/monthly', getMonthlyTrend);

module.exports = router;

