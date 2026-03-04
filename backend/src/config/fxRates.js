const DEFAULT_FX_RATES_IN_INR = {
  INR: 1,
  USD: 83.5,
  EUR: 90.0,
};

const FX_RATES_IN_INR = {
  INR:
    Number(process.env.FX_RATE_INR) ||
    DEFAULT_FX_RATES_IN_INR.INR,
  USD:
    Number(process.env.FX_RATE_USD_INR) ||
    DEFAULT_FX_RATES_IN_INR.USD,
  EUR:
    Number(process.env.FX_RATE_EUR_INR) ||
    DEFAULT_FX_RATES_IN_INR.EUR,
};

const SUPPORTED_CURRENCIES = Object.freeze(Object.keys(FX_RATES_IN_INR));

function normalizeCurrencyCode(code) {
  if (!code || typeof code !== 'string') return 'INR';
  return code.trim().toUpperCase() || 'INR';
}

function assertSupportedCurrency(currencyCode) {
  const normalized = normalizeCurrencyCode(currencyCode);
  if (!SUPPORTED_CURRENCIES.includes(normalized)) {
    const error = new Error(
      `Unsupported currency code. Allowed: ${SUPPORTED_CURRENCIES.join(', ')}.`,
    );
    error.name = 'ValidationError';
    error.status = 400;
    error.details = {
      field: 'currencyCode',
      allowed: SUPPORTED_CURRENCIES,
    };
    throw error;
  }
  return normalized;
}

function convertToInr(amount, currencyCode) {
  const normalizedCurrency = assertSupportedCurrency(currencyCode);
  const numericAmount =
    typeof amount === 'string' ? Number(amount) : amount;

  if (!Number.isFinite(numericAmount)) {
    const error = new Error('Amount must be a finite number.');
    error.name = 'ValidationError';
    error.status = 400;
    error.details = { field: 'amount' };
    throw error;
  }

  const rate = FX_RATES_IN_INR[normalizedCurrency];
  const amountInInr = Math.round(numericAmount * rate * 100) / 100;

  return {
    amountInInr,
    rateUsed: rate,
    currencyCode: normalizedCurrency,
  };
}

module.exports = {
  FX_RATES_IN_INR,
  SUPPORTED_CURRENCIES,
  normalizeCurrencyCode,
  assertSupportedCurrency,
  convertToInr,
};

