const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const Payment = require('../models/Payment');
const Store = require('../models/Store');

// @desc    Get all purchases with filters
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res, next) => {
  try {
    const { search, supplier, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { store: req.storeId };

    if (search) {
      query.invoiceNumber = { $regex: search, $options: 'i' };
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('supplier', 'companyName name phone')
        .populate('createdBy', 'name')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Purchase.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      purchases,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase details
// @route   GET /api/purchases/:id
// @access  Private
const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, store: req.storeId })
      .populate('supplier')
      .populate('createdBy', 'name email');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found.',
      });
    }

    res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create and post purchase receipt
// @route   POST /api/purchases
// @access  Private (Admin, Manager)
const createPurchase = async (req, res, next) => {
  try {
    const {
      invoiceNumber,
      supplierId,
      purchaseDate,
      items,
      discountAmount = 0,
      taxAmount = 0,
      additionalCharges = 0,
      amountPaid = 0,
      paymentMethod = 'bank_transfer',
      notes = '',
    } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one purchase item are required.',
      });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, store: req.storeId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    // Auto-generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : '';
    if (!finalInvoiceNumber) {
      const store = await Store.findById(req.storeId);
      const prefix = store?.settings?.purchasePrefix || 'PO-';
      const count = await Purchase.countDocuments({ store: req.storeId });
      finalInvoiceNumber = `${prefix}${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }

    // Check duplicate invoice number
    const existing = await Purchase.findOne({ store: req.storeId, invoiceNumber: finalInvoiceNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Purchase invoice number '${finalInvoiceNumber}' already exists.`,
      });
    }

    // Validate items and calculate subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const itm of items) {
      const product = await Product.findOne({ _id: itm.productId || itm.product, store: req.storeId });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found for item ID: ${itm.productId || itm.product}`,
        });
      }

      const qty = Number(itm.quantity);
      const price = Number(itm.purchasePrice !== undefined ? itm.purchasePrice : product.purchaseCost);

      if (qty <= 0 || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity or price for product '${product.name}'.`,
        });
      }

      const lineTotal = qty * price;
      subtotal += lineTotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        purchasePrice: price,
        taxRate: Number(itm.taxRate || 0),
        lineTotal,
      });
    }

    const numDiscount = Number(discountAmount) || 0;
    const numTax = Number(taxAmount) || 0;
    const numCharges = Number(additionalCharges) || 0;
    const grandTotal = Math.max(0, subtotal - numDiscount + numTax + numCharges);
    const numAmountPaid = Math.min(grandTotal, Math.max(0, Number(amountPaid) || 0));
    const outstandingAmount = Math.max(0, grandTotal - numAmountPaid);

    // 1. Create Purchase record
    const purchase = await Purchase.create({
      store: req.storeId,
      invoiceNumber: finalInvoiceNumber,
      supplier: supplier._id,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: validatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(numTax * 100) / 100,
      discountAmount: Math.round(numDiscount * 100) / 100,
      additionalCharges: Math.round(numCharges * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      amountPaid: Math.round(numAmountPaid * 100) / 100,
      outstandingAmount: Math.round(outstandingAmount * 100) / 100,
      paymentMethod,
      status: 'received',
      notes,
      createdBy: req.user._id,
    });

    // 2. Increase stock & ledger for each item
    for (const item of validatedItems) {
      const prod = await Product.findById(item.product);
      const previousStock = prod.currentStock;
      const newStock = previousStock + item.quantity;

      // Update product current stock and update purchaseCost
      prod.currentStock = newStock;
      prod.purchaseCost = item.purchasePrice;
      await prod.save();

      // Write to Inventory Transaction Ledger
      await InventoryTransaction.create({
        store: req.storeId,
        product: prod._id,
        transactionType: 'purchase',
        quantityChange: item.quantity,
        previousStock,
        newStock,
        referenceType: 'Purchase',
        referenceId: purchase._id,
        referenceNumber: purchase.invoiceNumber,
        reason: `Goods receipt from supplier ${supplier.companyName}`,
        user: req.user._id,
      });
    }

    // 3. Update Supplier outstanding balance
    if (outstandingAmount > 0) {
      supplier.outstandingBalance += outstandingAmount;
      await supplier.save();
    }

    // 4. Record Payment if amountPaid > 0
    if (numAmountPaid > 0) {
      await Payment.create({
        store: req.storeId,
        type: 'supplier_payment',
        supplier: supplier._id,
        purchase: purchase._id,
        amount: numAmountPaid,
        paymentMethod,
        referenceNumber: purchase.invoiceNumber,
        notes: `Payment for purchase order ${purchase.invoiceNumber}`,
        createdBy: req.user._id,
      });
    }

    const populated = await Purchase.findById(purchase._id)
      .populate('supplier')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock added to inventory successfully.',
      purchase: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
};
