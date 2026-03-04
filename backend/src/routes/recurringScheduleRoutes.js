const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getRecurringSchedules,
  toggleRecurringScheduleActive,
  runDueRecurringSchedules,
  runRecurringScheduleReminders,
} = require('../controllers/recurringSchedule.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/recurring-schedules', getRecurringSchedules);
router.patch('/recurring-schedules/:id/toggle-active', toggleRecurringScheduleActive);
router.post('/recurring-schedules/run-due', runDueRecurringSchedules);
router.post('/recurring-schedules/run-reminders', runRecurringScheduleReminders);

module.exports = router;

