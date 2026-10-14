const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryTransaction = require('../models/InventoryTransaction');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Store = require('../models/Store');

// @desc    Get sales history with filters
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res, next) => {
  try {
    const {
      search,
      customer,
      paymentMethod,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { store: req.storeId };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    if (customer) {
      query.customer = customer;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate('customer', 'name phone email outstandingBalance')
        .populate('cashier', 'name')
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Sale.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sale by ID (For Invoice viewing, printing & reprinting)
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, store: req.storeId })
      .populate('customer')
      .populate('cashier', 'name email');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found.',
      });
    }

    const store = await Store.findById(req.storeId);

    res.status(200).json({
      success: true,
      sale,
      store,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process POS checkout / Create Sale (Server-validated & atomic)
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res, next) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      billDiscount = 0,
      paymentMethod = 'cash',
      amountReceived = 0,
      paymentDetails = {},
      notes = '',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add at least one product.',
      });
    }

    const store = await Store.findById(req.storeId);
    const allowNegativeStock = store?.settings?.allowNegativeStock || false;

    // 1. Resolve Customer if provided
    let customerDoc = null;
    let finalCustomerName = (customerName || 'Walk-in Customer').trim();
    let finalCustomerPhone = (customerPhone || '').trim();
    let finalCustomerGstin = '';

    if (customerId) {
      customerDoc = await Customer.findOne({ _id: customerId, store: req.storeId });
      if (customerDoc) {
        finalCustomerName = customerDoc.name;
        finalCustomerPhone = customerDoc.phone;
        finalCustomerGstin = customerDoc.gstin || '';
      }
    }

    // 2. Validate all products, verify stock, and calculate server-side pricing
    let calculatedSubtotal = 0;
    let calculatedTaxAmount = 0;
    let validatedItems = [];
    let totalItemsCost = 0;

    for (const item of items) {
      const prodId = item.productId || item.product;
      const product = await Product.findOne({ _id: prodId, store: req.storeId });

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product '${item.name || prodId}' is not found or is no longer active.`,
        });
      }

      const requestedQty = Number(item.quantity);
      if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product '${product.name}'.`,
        });
      }

      // Check stock availability
      if (!allowNegativeStock && product.currentStock < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${product.name}'. Available: ${product.currentStock} ${product.unit}, Requested: ${requestedQty} ${product.unit}.`,
        });
      }

      // Use trusted server price and cost
      const unitPrice = Number(product.sellingPrice);
      const purchaseCost = Number(product.purchaseCost);
      const itemDiscount = Math.max(0, Number(item.discount || 0));
      const taxRate = Number(product.taxRate || 0);

      const baseLineTotal = Math.max(0, unitPrice * requestedQty - itemDiscount);
      const itemTax = (baseLineTotal * taxRate) / 100;
      const finalLineTotal = baseLineTotal + itemTax;

      const itemCostTotal = purchaseCost * requestedQty;
      const lineProfit = baseLineTotal - itemCostTotal;

      calculatedSubtotal += baseLineTotal;
      calculatedTaxAmount += itemTax;
      totalItemsCost += itemCostTotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: requestedQty,
        unitPrice,
        purchaseCost,
        taxRate,
        taxAmount: Math.round(itemTax * 100) / 100,
        discount: itemDiscount,
        lineTotal: Math.round(finalLineTotal * 100) / 100,
        lineProfit: Math.round(lineProfit * 100) / 100,
        currentStockBefore: product.currentStock,
      });
    }

    const numBillDiscount = Math.max(0, Number(billDiscount) || 0);
    const grandTotal = Math.max(0, calculatedSubtotal + calculatedTaxAmount - numBillDiscount);
    const totalProfit = Math.max(0, calculatedSubtotal - totalItemsCost - numBillDiscount);

    // 3. Payment and change calculations
    const numAmountReceived = Number(amountReceived) || 0;
    let changeGiven = 0;
    let amountPaid = 0;
    let outstandingAmount = 0;

    if (paymentMethod === 'credit') {
      amountPaid = 0;
      outstandingAmount = grandTotal;

      // Validate credit limits
      if (!customerDoc) {
        return res.status(400).json({
          success: false,
          message: 'A registered customer is required for credit / on-account sales.',
        });
      }

      if (customerDoc.creditLimit > 0 && customerDoc.outstandingBalance + outstandingAmount > customerDoc.creditLimit) {
        return res.status(400).json({
          success: false,
          message: `Sale exceeds customer's credit limit of ₹${customerDoc.creditLimit}. Current outstanding: ₹${customerDoc.outstandingBalance}.`,
        });
      }
    } else {
      if (numAmountReceived >= grandTotal) {
        amountPaid = grandTotal;
        changeGiven = Math.round((numAmountReceived - grandTotal) * 100) / 100;
        outstandingAmount = 0;
      } else {
        amountPaid = Math.max(0, numAmountReceived);
        outstandingAmount = Math.round((grandTotal - amountPaid) * 100) / 100;

        if (outstandingAmount > 0 && !customerDoc) {
          return res.status(400).json({
            success: false,
            message: 'Partial payments are only permitted for registered customers.',
          });
        }
      }
    }

    // 4. Generate unique invoice number
    const invoicePrefix = store?.settings?.invoicePrefix || 'INV-';
    const totalSalesCount = await Sale.countDocuments({ store: req.storeId });
    const invoiceNumber = `${invoicePrefix}${new Date().getFullYear()}-${String(totalSalesCount + 1).padStart(5, '0')}`;

    // 5. Save Sale Record
    const sale = await Sale.create({
      store: req.storeId,
      invoiceNumber,
      customer: customerDoc ? customerDoc._id : null,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerGstin: finalCustomerGstin,
      saleDate: new Date(),
      items: validatedItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      taxAmount: Math.round(calculatedTaxAmount * 100) / 100,
      discountAmount: Math.round(numBillDiscount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      amountPaid: Math.round(amountPaid * 100) / 100,
      changeGiven,
      outstandingAmount,
      totalProfit: Math.round(totalProfit * 100) / 100,
      paymentMethod,
      paymentDetails: {
        cashAmount: paymentDetails.cashAmount || (paymentMethod === 'cash' ? amountPaid : 0),
        upiAmount: paymentDetails.upiAmount || (paymentMethod === 'upi' ? amountPaid : 0),
        cardAmount: paymentDetails.cardAmount || (paymentMethod === 'card' ? amountPaid : 0),
        upiRef: paymentDetails.upiRef || '',
        cardRef: paymentDetails.cardRef || '',
      },
      status: 'completed',
      notes,
      cashier: req.user._id,
    });

    // 6. Deduct stock atomically and write to Inventory Transaction Ledger
    for (const item of validatedItems) {
      const prod = await Product.findById(item.product);
      const prevStock = prod.currentStock;
      const newStock = prevStock - item.quantity;

      prod.currentStock = newStock;
      await prod.save();

      // Ledger entry
      await InventoryTransaction.create({
        store: req.storeId,
        product: prod._id,
        transactionType: 'sale',
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock,
        referenceType: 'Sale',
        referenceId: sale._id,
        referenceNumber: sale.invoiceNumber,
        reason: `Sold to ${finalCustomerName} via Invoice ${sale.invoiceNumber}`,
        user: req.user._id,
      });

      // Notification if stock reaches or dips below threshold
      if (newStock <= prod.lowStockThreshold) {
        await Notification.create({
          store: req.storeId,
          title: newStock <= 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
          message: `Product '${prod.name}' is low on stock (${newStock} ${prod.unit} left). Please restock soon.`,
          type: newStock <= 0 ? 'out_of_stock' : 'low_stock',
          metadata: { productId: prod._id, sku: prod.sku, stock: newStock },
        });
      }
    }

    // 7. Update Customer outstanding balance if credit was taken
    if (customerDoc && outstandingAmount > 0) {
      customerDoc.outstandingBalance += outstandingAmount;
      await customerDoc.save();
    }

    // 8. Record Payment if paid amount > 0
    if (amountPaid > 0) {
      await Payment.create({
        store: req.storeId,
        type: 'customer_payment',
        customer: customerDoc ? customerDoc._id : null,
        sale: sale._id,
        amount: amountPaid,
        paymentMethod,
        referenceNumber: invoiceNumber,
        notes: `Payment received for invoice ${invoiceNumber}`,
        createdBy: req.user._id,
      });
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate('customer')
      .populate('cashier', 'name');

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      sale: populatedSale,
      store,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a sale with controlled inventory reversal
// @route   POST /api/sales/:id/cancel
// @access  Private (Admin, Manager)
const cancelSale = async (req, res, next) => {
  try {
    const { reason = 'Cancelled by manager' } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, store: req.storeId });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found.',
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This sale has already been cancelled.',
      });
    }

    // Revert inventory stock
    for (const item of sale.items) {
      const prod = await Product.findById(item.product);
      if (prod) {
        const prevStock = prod.currentStock;
        const newStock = prevStock + item.quantity;
        prod.currentStock = newStock;
        await prod.save();

        await InventoryTransaction.create({
          store: req.storeId,
          product: prod._id,
          transactionType: 'return_in',
          quantityChange: item.quantity,
          previousStock: prevStock,
          newStock,
          referenceType: 'Sale',
          referenceId: sale._id,
          referenceNumber: `CANCEL-${sale.invoiceNumber}`,
          reason: `Reversal from cancelled invoice ${sale.invoiceNumber}: ${reason}`,
          user: req.user._id,
        });
      }
    }

    // Revert customer outstanding balance if credit was pending
    if (sale.customer && sale.outstandingAmount > 0) {
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        customer.outstandingBalance = Math.max(0, customer.outstandingBalance - sale.outstandingAmount);
        await customer.save();
      }
    }

    sale.status = 'cancelled';
    sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}CANCELLED: ${reason}`;
    await sale.save();

    res.status(200).json({
      success: true,
      message: `Sale ${sale.invoiceNumber} has been safely cancelled and stock reversed.`,
      sale,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
};
