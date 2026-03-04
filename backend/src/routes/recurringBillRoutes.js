const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  toggleRecurringBillActive,
  deleteRecurringBill,
  runDueRecurringBills,
} = require('../controllers/recurringBill.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/recurring-bills', getRecurringBills);
router.post('/recurring-bills', createRecurringBill);
router.put('/recurring-bills/:id', updateRecurringBill);
router.patch('/recurring-bills/:id/toggle-active', toggleRecurringBillActive);
router.delete('/recurring-bills/:id', deleteRecurringBill);
router.post('/recurring-bills/run-due', runDueRecurringBills);

module.exports = router;

