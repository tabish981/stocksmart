const Expense = require('../models/Expense');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { store: req.storeId };

    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('user', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private (Admin, Manager)
const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, paymentMethod = 'cash', date, notes = '' } = req.body;

    const numAmount = Number(amount);
    if (!title || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense title and a positive amount are required.',
      });
    }

    const expense = await Expense.create({
      store: req.storeId,
      title: title.trim(),
      category: category || 'Other',
      amount: Math.round(numAmount * 100) / 100,
      paymentMethod,
      date: date ? new Date(date) : new Date(),
      notes: notes.trim(),
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, store: req.storeId });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found.',
      });
    }

    await Expense.deleteOne({ _id: expense._id });

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
};
