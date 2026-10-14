const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getCategories);
router.post('/', authorize('admin', 'manager'), createCategory);
router.put('/:id', authorize('admin', 'manager'), updateCategory);
router.delete('/:id', authorize('admin'), deleteCategory);

module.exports = router;
