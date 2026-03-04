const fs = require('fs');
const path = require('path');

const RECEIPTS_UPLOAD_DIR =
  process.env.RECEIPTS_UPLOAD_DIR
  || path.join(__dirname, '..', '..', 'uploads', 'receipts');

function ensureReceiptsDirExists() {
  try {
    fs.mkdirSync(RECEIPTS_UPLOAD_DIR, { recursive: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to create receipts upload directory:', err);
  }
}

module.exports = {
  RECEIPTS_UPLOAD_DIR,
  ensureReceiptsDirExists,
};

