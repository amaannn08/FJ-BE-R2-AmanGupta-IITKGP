const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { analyzeTransactions } = require('../controllers/analysis.controller');

const router = express.Router();

router.use(authenticateToken);

router.post('/analysis', analyzeTransactions);

module.exports = router;
