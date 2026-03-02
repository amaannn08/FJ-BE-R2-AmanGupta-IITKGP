const { v4: uuidv4 } = require('uuid');

async function getCategoryModel() {
  return import('../models/category.model.js');
}

async function createCategory(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const { name, type } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Category name is required.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res
        .status(400)
        .json({ success: false, message: "Category type must be 'income' or 'expense'." });
    }

    const { createCategory: createCategoryModel } = await getCategoryModel();

    const id = uuidv4();
    const category = await createCategoryModel({
      id,
      user_id: userId,
      name: name.trim(),
      type,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    return next(err);
  }
}

async function getCategories(req, res, next) {
  try {
    const userId = req.user && req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { getCategoriesByUser } = await getCategoryModel();

    const categories = await getCategoriesByUser(userId);
    return res.json({ success: true, data: categories });
  } catch (err) {
    return next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const categoryId = req.params && req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category id is required.' });
    }

    const { deleteCategory: deleteCategoryModel } = await getCategoryModel();

    try {
      const deleted = await deleteCategoryModel({
        category_id: categoryId,
        user_id: userId,
      });

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }

      return res.json({ success: true, message: 'Category deleted successfully.' });
    } catch (err) {
      if (err.message === 'Cannot delete category with existing transactions.') {
        return res.status(400).json({ success: false, message: err.message });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createCategory,
  getCategories,
  deleteCategory,
};

