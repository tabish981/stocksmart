const User = require('../models/User');

// @desc    Get all users in current store
// @route   GET /api/users
// @access  Private (Admin, Manager)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ store: req.storeId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user for store (Cashier / Manager)
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'cashier',
      phone: phone || '',
      store: req.storeId,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { name, role, phone, isActive, password } = req.body;
    const user = await User.findOne({ _id: req.params.id, store: req.storeId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in this store.',
      });
    }

    if (name) user.name = name.trim();
    if (role && ['admin', 'manager', 'cashier'].includes(role)) user.role = role;
    if (phone !== undefined) user.phone = phone.trim();
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.length >= 6) user.password = password;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own administrative account.',
      });
    }

    const user = await User.findOne({ _id: req.params.id, store: req.storeId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
