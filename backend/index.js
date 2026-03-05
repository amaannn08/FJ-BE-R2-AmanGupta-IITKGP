require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const recurringScheduleRoutes = require('./src/routes/recurringScheduleRoutes');
const recurringBillRoutes = require('./src/routes/recurringBillRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Health check passed' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Health check passed' });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Finance Tracker API is running' });
});

app.use('/', authRoutes);
app.use('/', categoryRoutes);
app.use('/', transactionRoutes);
app.use('/', dashboardRoutes);
app.use('/', reportRoutes);
app.use('/', budgetRoutes);
app.use('/', recurringScheduleRoutes);
app.use('/', recurringBillRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }

  // Handle explicit validation-style errors.
  if (err && (err.name === 'ValidationError' || err.status === 400)) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid request.',
      details: err.details,
    });
  }

  // Handle common PG connection errors without leaking internal details.
  if (
    err &&
    (err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED' ||
      err.name === 'AggregateError')
  ) {
    return res.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable. Please try again later.',
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});