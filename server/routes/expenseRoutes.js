const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getExpenses);
router.post('/', authorize('admin', 'manager'), createExpense);
router.delete('/:id', authorize('admin'), deleteExpense);

module.exports = router;
