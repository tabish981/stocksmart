const Store = require('../models/Store');

// @desc    Get current store info
// @route   GET /api/stores/current
// @access  Private
const getCurrentStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found.',
      });
    }

    res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store settings and details
// @route   PUT /api/stores/current
// @access  Private (Admin)
const updateStore = async (req, res, next) => {
  try {
    const { name, companyName, email, phone, address, gstin, currency, timezone, settings } = req.body;

    const store = await Store.findById(req.storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found.',
      });
    }

    if (name) store.name = name.trim();
    if (companyName !== undefined) store.companyName = companyName.trim();
    if (email !== undefined) store.email = email.trim();
    if (phone !== undefined) store.phone = phone.trim();
    if (address !== undefined) store.address = { ...store.address, ...address };
    if (gstin !== undefined) store.gstin = gstin.trim().toUpperCase();
    if (currency !== undefined) store.currency = { ...store.currency, ...currency };
    if (timezone !== undefined) store.timezone = timezone;
    if (settings !== undefined) store.settings = { ...store.settings, ...settings };

    await store.save();

    res.status(200).json({
      success: true,
      message: 'Store details and settings updated successfully.',
      store,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentStore,
  updateStore,
};
