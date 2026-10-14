const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { type, customerId, supplierId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { store: req.storeId };

    if (type) query.type = type;
    if (customerId) query.customer = customerId;
    if (supplierId) query.supplier = supplierId;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('customer', 'name phone')
        .populate('supplier', 'companyName name')
        .populate('createdBy', 'name')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Customer Payment (Reduce customer outstanding balance)
// @route   POST /api/payments/customer
// @access  Private
const recordCustomerPayment = async (req, res, next) => {
  try {
    const { customerId, amount, paymentMethod = 'cash', referenceNumber = '', notes = '' } = req.body;

    const numAmount = Number(amount);
    if (!customerId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and a valid payment amount greater than zero are required.',
      });
    }

    const customer = await Customer.findOne({ _id: customerId, store: req.storeId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // 1. Create Payment record
    const payment = await Payment.create({
      store: req.storeId,
      type: 'customer_payment',
      customer: customer._id,
      amount: Math.round(numAmount * 100) / 100,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
      createdBy: req.user._id,
    });

    // 2. Reduce Customer Outstanding Balance
    customer.outstandingBalance = Math.max(0, customer.outstandingBalance - numAmount);
    await customer.save();

    res.status(201).json({
      success: true,
      message: `Payment of ₹${numAmount} successfully recorded. Updated outstanding balance: ₹${customer.outstandingBalance}.`,
      payment,
      updatedBalance: customer.outstandingBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Supplier Payment (Reduce supplier outstanding balance)
// @route   POST /api/payments/supplier
// @access  Private (Admin, Manager)
const recordSupplierPayment = async (req, res, next) => {
  try {
    const { supplierId, amount, paymentMethod = 'bank_transfer', referenceNumber = '', notes = '' } = req.body;

    const numAmount = Number(amount);
    if (!supplierId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID and a valid payment amount greater than zero are required.',
      });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, store: req.storeId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    // 1. Create Payment record
    const payment = await Payment.create({
      store: req.storeId,
      type: 'supplier_payment',
      supplier: supplier._id,
      amount: Math.round(numAmount * 100) / 100,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
      createdBy: req.user._id,
    });

    // 2. Reduce Supplier Outstanding Balance
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - numAmount);
    await supplier.save();

    res.status(201).json({
      success: true,
      message: `Payment of ₹${numAmount} paid to supplier recorded. Updated outstanding balance: ₹${supplier.outstandingBalance}.`,
      payment,
      updatedBalance: supplier.outstandingBalance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  recordCustomerPayment,
  recordSupplierPayment,
};
