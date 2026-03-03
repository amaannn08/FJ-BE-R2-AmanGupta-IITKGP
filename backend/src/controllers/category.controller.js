const { v4: uuidv4 } = require('uuid');

const categoryModel = require('../models/category.model');

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

    const normalizedName = name.trim().toLowerCase();

    const existing = await categoryModel.findCategoryByNameForUser({
      user_id: userId,
      type,
      normalized_name: normalizedName,
    });

    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }

    const id = uuidv4();
    const category = await categoryModel.createCategory({
      id,
      user_id: userId,
      name: normalizedName,
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

    const categories = await categoryModel.getCategoriesByUser(userId);
    return res.json({ success: true, data: categories });
  } catch (err) {
    return next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    const categoryId = req.params && req.params.id;
    const { name } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category id is required.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Category name is required.' });
    }

    const existing = await categoryModel.findCategoryByIdForUser({
      category_id: categoryId,
      user_id: userId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const normalizedName = name.trim().toLowerCase();

    const conflicting = await categoryModel.findConflictingCategoryName({
      user_id: userId,
      type: existing.type,
      normalized_name: normalizedName,
      exclude_category_id: categoryId,
    });

    if (conflicting) {
      return res
        .status(400)
        .json({ success: false, message: 'Category already exists.' });
    }

    const updated = await categoryModel.updateCategoryName({
      category_id: categoryId,
      user_id: userId,
      name: normalizedName,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, data: updated });
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

    try {
      const deleted = await categoryModel.deleteCategory({
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
  updateCategory,
  deleteCategory,
};

