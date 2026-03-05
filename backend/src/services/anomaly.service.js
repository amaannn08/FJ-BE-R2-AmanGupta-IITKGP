const transactionModel = require('../models/transaction.model');
const userModel = require('../models/user.model');
const emailService = require('./email.service');

async function checkAndSendAnomalyAlert({ user_id, transaction }) {
  try {
    // 1. Fetch recent transactions
    const recentTransactions = await transactionModel.getRecentTransactionsForAnomaly({
      user_id,
      limit: 50,
    });

    if (recentTransactions.length < 5) return; // Not enough data for meaningful analysis

    let anomalyType = null;
    let details = {};

    // 2. High Frequency Check (many transactions in last 5 mins)
    // created_at is the timestamp when the record was created in DB
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = recentTransactions.filter(
      (t) => new Date(t.created_at) > fiveMinutesAgo
    ).length;

    // If more than 10 transactions in last 5 minutes (adjust threshold as needed)
    if (recentCount >= 10) {
      anomalyType = 'high_frequency';
      details = { count: recentCount };
    }

    // 3. High Value Check (Z-score > 3)
    // Only check if not already flagged as high frequency (or could flag both)
    if (!anomalyType) {
      const currentAmount = Number(transaction.amount);
      if (currentAmount > 0) {
        // Exclude the current transaction from the baseline to avoid skewing stats
        const history = recentTransactions.filter((t) => t.id !== transaction.id);
        const amounts = history.map((t) => Number(t.amount)).filter((a) => a > 0);

        if (amounts.length >= 5) {
          const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const variance =
            amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
          const stdDev = Math.sqrt(variance);

          // If stdDev is 0 (all transactions same amount), any deviation is infinite z-score.
          // Handle gracefully: if stdDev is 0, check if current > mean * 2 (simple heuristic)
          if (stdDev === 0) {
            if (currentAmount > mean * 2) {
              anomalyType = 'high_value';
              details = { mean, stdDev: 0, amount: currentAmount };
            }
          } else {
            const zScore = (currentAmount - mean) / stdDev;
            if (zScore > 3) {
              anomalyType = 'high_value';
              details = { mean, stdDev, amount: currentAmount };
            }
          }
        }
      }
    }

    // 4. Send Alert if Anomalous
    if (anomalyType) {
      const user = await userModel.findUserById(user_id);
      if (user && user.email) {
        // eslint-disable-next-line no-console
        console.log(
          `[Anomaly Detected] User: ${user_id}, Type: ${anomalyType}, Details:`,
          details
        );
        await emailService.sendAnomalyAlertEmail({
          to: user.email,
          userName: user.name,
          transaction,
          anomalyType,
          details,
        });
      }
    }
  } catch (error) {
    // Log error but don't crash the transaction flow
    // eslint-disable-next-line no-console
    console.error('Error in anomaly detection:', error);
  }
}

module.exports = {
  checkAndSendAnomalyAlert,
};
