const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stocksmart_super_secret_jwt_key_2026_change_in_production');
    const user = await User.findById(decoded.id).populate('store');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is not found or has been deactivated.',
      });
    }

    req.user = user;
    req.storeId = user.store._id ? user.store._id : user.store;
    req.store = user.store;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired.',
      error: error.message,
    });
  }
};

module.exports = { protect };
