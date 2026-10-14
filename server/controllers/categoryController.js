const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories for store
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const query = { store: req.storeId };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const categories = await Category.find(query).sort({ name: 1 });

    // Attach product count to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          store: req.storeId,
          category: cat._id,
        });
        return {
          ...cat.toObject(),
          productCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      categories: categoriesWithCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin, Manager)
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const existing = await Category.findOne({
      store: req.storeId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists in your store.`,
      });
    }

    const category = await Category.create({
      store: req.storeId,
      name: name.trim(),
      description: description ? description.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: { ...category.toObject(), productCount: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Manager)
const updateCategory = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({
        store: req.storeId,
        _id: { $ne: category._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Category '${name}' already exists.`,
        });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    const productCount = await Product.countDocuments({
      store: req.storeId,
      category: category._id,
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category: { ...category.toObject(), productCount },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category (Safe delete check)
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    // Check if any products reference this category
    const productCount = await Product.countDocuments({
      store: req.storeId,
      category: category._id,
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}' because it contains ${productCount} active product(s). Please reassign or remove those products first.`,
      });
    }

    await Category.deleteOne({ _id: category._id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
