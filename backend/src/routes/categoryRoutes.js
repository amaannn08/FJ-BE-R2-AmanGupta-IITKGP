const express = require('express');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');

const router = express.Router();

router.use(authenticateToken);

router.post('/categories', createCategory);

router.get('/categories', getCategories);

router.put('/categories/:id', updateCategory);

router.delete('/categories/:id', deleteCategory);

module.exports = router;

