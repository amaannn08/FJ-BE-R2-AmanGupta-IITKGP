const fs = require('fs');
const path = require('path');
const multer = require('multer');

const transactionModel = require('../models/transaction.model');
const { RECEIPTS_UPLOAD_DIR, ensureReceiptsDirExists } = require('../config/uploads');

ensureReceiptsDirExists();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function extensionForMime(mime) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, RECEIPTS_UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const transactionId = req.params && req.params.id;
    const ext = extensionForMime(file.mimetype) || path.extname(file.originalname) || '';
    const safeId = String(transactionId || '').replace(/[^a-zA-Z0-9-]/g, '');
    const filename = safeId ? `${safeId}${ext}` : `receipt-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(Object.assign(new Error('Invalid file type. Only images and PDFs are allowed.'), { status: 400 }));
      return;
    }
    cb(null, true);
  },
});

const uploadReceiptMiddleware = upload.single('receipt');

async function uploadReceipt(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const transactionId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction id is required.' });
    }

    const transaction = await transactionModel.getTransactionByIdForUser({
      id: transactionId,
      user_id: userId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt file uploaded.' });
    }

    const newFilename = req.file.filename;

    if (transaction.receipt_filename && transaction.receipt_filename !== newFilename) {
      const oldPath = path.join(RECEIPTS_UPLOAD_DIR, path.basename(transaction.receipt_filename));
      try {
        await fs.promises.unlink(oldPath);
      } catch {
        // ignore missing/failed delete
      }
    }

    const updated = await transactionModel.setReceiptFilename({
      id: transactionId,
      user_id: userId,
      receipt_filename: newFilename,
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const transactionId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction id is required.' });
    }

    const transaction = await transactionModel.getTransactionByIdForUser({
      id: transactionId,
      user_id: userId,
    });

    if (!transaction || !transaction.receipt_filename) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const safeName = path.basename(transaction.receipt_filename);
    const filePath = path.join(RECEIPTS_UPLOAD_DIR, safeName);

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ success: false, message: 'Receipt file is missing.' });
    }

    return res.sendFile(filePath);
  } catch (err) {
    return next(err);
  }
}

async function deleteReceipt(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const transactionId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction id is required.' });
    }

    const transaction = await transactionModel.getTransactionByIdForUser({
      id: transactionId,
      user_id: userId,
    });

    if (!transaction || !transaction.receipt_filename) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const safeName = path.basename(transaction.receipt_filename);
    const filePath = path.join(RECEIPTS_UPLOAD_DIR, safeName);

    try {
      await fs.promises.unlink(filePath);
    } catch {
      // ignore missing/failed delete
    }

    await transactionModel.clearReceiptFilename({
      id: transactionId,
      user_id: userId,
    });

    return res.json({ success: true, message: 'Receipt deleted.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  uploadReceiptMiddleware,
  uploadReceipt,
  getReceipt,
  deleteReceipt,
};

