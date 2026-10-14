const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const query = { store: req.storeId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const suppliers = await Supplier.find(query).sort({ companyName: 1 });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier details with history
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, store: req.storeId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const purchases = await Purchase.find({
      store: req.storeId,
      supplier: supplier._id,
    })
      .sort({ purchaseDate: -1 })
      .limit(20);

    const payments = await Payment.find({
      store: req.storeId,
      supplier: supplier._id,
    })
      .sort({ paymentDate: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      supplier,
      purchases,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (Admin, Manager)
const createSupplier = async (req, res, next) => {
  try {
    const { name, companyName, phone, email, address, gstin, paymentTerms, notes, openingBalance } = req.body;

    if (!name || !companyName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Contact name, company name, and phone number are required.',
      });
    }

    const supplier = await Supplier.create({
      store: req.storeId,
      name: name.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      address: address || {},
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      paymentTerms: paymentTerms || 'Net 30 Days',
      outstandingBalance: Number(openingBalance) || 0,
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Manager)
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, store: req.storeId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const { name, companyName, phone, email, address, gstin, paymentTerms, notes, isActive } = req.body;

    if (name) supplier.name = name.trim();
    if (companyName) supplier.companyName = companyName.trim();
    if (phone) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email.trim();
    if (address !== undefined) supplier.address = { ...supplier.address, ...address };
    if (gstin !== undefined) supplier.gstin = gstin.trim().toUpperCase();
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms;
    if (notes !== undefined) supplier.notes = notes;
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplier.save();

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully.',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin)
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, store: req.storeId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    // Check if supplier has purchases
    const purchaseCount = await Purchase.countDocuments({
      store: req.storeId,
      supplier: supplier._id,
    });

    if (purchaseCount > 0) {
      // Deactivate instead of hard delete to preserve financial history
      supplier.isActive = false;
      await supplier.save();
      return res.status(200).json({
        success: true,
        message: `Supplier has ${purchaseCount} purchase record(s). Supplier has been deactivated instead of permanently deleted to preserve transaction history.`,
      });
    }

    await Supplier.deleteOne({ _id: supplier._id });

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
