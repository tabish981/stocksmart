const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// @desc    Get all returns
// @route   GET /api/returns
// @access  Private
const getReturns = async (req, res, next) => {
  try {
    const { returnType, page = 1, limit = 20 } = req.query;
    const query = { store: req.storeId };

    if (returnType) {
      query.returnType = returnType;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [returns, total] = await Promise.all([
      Return.find(query)
        .populate('customer', 'name phone')
        .populate('supplier', 'companyName name')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Return.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: returns.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      returns,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process a Sales Return
// @route   POST /api/returns/sale
// @access  Private
const processSaleReturn = async (req, res, next) => {
  try {
    const { invoiceNumber, items, refundMethod = 'cash', notes = '' } = req.body;

    if (!invoiceNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Original invoice number and returned items are required.',
      });
    }

    const sale = await Sale.findOne({ store: req.storeId, invoiceNumber: invoiceNumber.trim() });
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: `Sale with invoice number '${invoiceNumber}' not found.`,
      });
    }

    let totalRefundAmount = 0;
    const validatedItems = [];

    for (const retItem of items) {
      const originalSaleItem = sale.items.find(
        (it) => it.product.toString() === (retItem.productId || retItem.product).toString()
      );

      if (!originalSaleItem) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${retItem.productId || retItem.product} was not part of invoice ${invoiceNumber}.`,
        });
      }

      const returnQty = Number(retItem.quantity);
      if (returnQty <= 0 || returnQty > originalSaleItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity (${returnQty}) cannot exceed originally purchased quantity (${originalSaleItem.quantity}) for '${originalSaleItem.name}'.`,
        });
      }

      const itemRefund = returnQty * originalSaleItem.unitPrice;
      totalRefundAmount += itemRefund;

      validatedItems.push({
        product: originalSaleItem.product,
        name: originalSaleItem.name,
        sku: originalSaleItem.sku,
        quantity: returnQty,
        unitPrice: originalSaleItem.unitPrice,
        lineTotal: itemRefund,
        reason: retItem.reason || 'Customer returned',
      });
    }

    const count = await Return.countDocuments({ store: req.storeId });
    const returnNumber = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // 1. Create Return document
    const returnDoc = await Return.create({
      store: req.storeId,
      returnNumber,
      returnType: 'sale_return',
      originalInvoiceNumber: sale.invoiceNumber,
      sale: sale._id,
      customer: sale.customer || null,
      items: validatedItems,
      totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
      refundMethod,
      notes,
      processedBy: req.user._id,
    });

    // 2. Put returned items back into product inventory & update ledger
    for (const itm of validatedItems) {
      const prod = await Product.findById(itm.product);
      if (prod) {
        const prevStock = prod.currentStock;
        const newStock = prevStock + itm.quantity;
        prod.currentStock = newStock;
        await prod.save();

        await InventoryTransaction.create({
          store: req.storeId,
          product: prod._id,
          transactionType: 'return_in',
          quantityChange: itm.quantity,
          previousStock: prevStock,
          newStock,
          referenceType: 'Return',
          referenceId: returnDoc._id,
          referenceNumber: returnDoc.returnNumber,
          reason: `Sale Return against invoice ${sale.invoiceNumber}: ${itm.reason}`,
          user: req.user._id,
        });
      }
    }

    // 3. Adjust customer balance if credit_note or customer had outstanding dues
    if (sale.customer && refundMethod === 'credit_note') {
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        customer.outstandingBalance = Math.max(0, customer.outstandingBalance - totalRefundAmount);
        await customer.save();
      }
    }

    res.status(201).json({
      success: true,
      message: `Return ${returnNumber} processed successfully and inventory restored.`,
      returnDoc,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReturns,
  processSaleReturn,
};
