const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res, next) => {
  try {
    const { search, customerType, hasBalance, isActive } = req.query;
    const query = { store: req.storeId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (customerType) {
      query.customerType = customerType;
    }

    if (hasBalance === 'true') {
      query.outstandingBalance = { $gt: 0 };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const customers = await Customer.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID with ledger
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, store: req.storeId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const sales = await Sale.find({
      store: req.storeId,
      customer: customer._id,
    })
      .sort({ saleDate: -1 })
      .limit(20);

    const payments = await Payment.find({
      store: req.storeId,
      customer: customer._id,
    })
      .sort({ paymentDate: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      customer,
      sales,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, gstin, customerType, creditLimit, openingBalance, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      });
    }

    const customer = await Customer.create({
      store: req.storeId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address || {},
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      customerType: customerType || 'retail',
      creditLimit: Number(creditLimit) || 0,
      outstandingBalance: Number(openingBalance) || 0,
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, store: req.storeId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const { name, phone, email, address, gstin, customerType, creditLimit, notes, isActive } = req.body;

    if (name) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (email !== undefined) customer.email = email.trim();
    if (address !== undefined) customer.address = { ...customer.address, ...address };
    if (gstin !== undefined) customer.gstin = gstin.trim().toUpperCase();
    if (customerType) customer.customerType = customerType;
    if (creditLimit !== undefined) customer.creditLimit = Number(creditLimit) || 0;
    if (notes !== undefined) customer.notes = notes;
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully.',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin, Manager)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, store: req.storeId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const saleCount = await Sale.countDocuments({
      store: req.storeId,
      customer: customer._id,
    });

    if (saleCount > 0 || customer.outstandingBalance > 0) {
      customer.isActive = false;
      await customer.save();
      return res.status(200).json({
        success: true,
        message: `Customer has transaction history or outstanding balance. Customer has been deactivated instead of deleted to protect financial records.`,
      });
    }

    await Customer.deleteOne({ _id: customer._id });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
