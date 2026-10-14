const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const StockAdjustment = require('../models/StockAdjustment');
const Notification = require('../models/Notification');

// @desc    Get live inventory overview and summary stats
// @route   GET /api/inventory
// @access  Private
const getInventorySummary = async (req, res, next) => {
  try {
    const { search, category, stockStatus, page = 1, limit = 20 } = req.query;
    const query = { store: req.storeId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (stockStatus === 'out_of_stock') {
      query.currentStock = { $lte: 0 };
    } else if (stockStatus === 'low_stock') {
      query.$expr = {
        $and: [
          { $gt: ['$currentStock', 0] },
          { $lte: ['$currentStock', '$lowStockThreshold'] },
        ],
      };
    } else if (stockStatus === 'in_stock') {
      query.$expr = {
        $gt: ['$currentStock', '$lowStockThreshold'],
      };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total, allStoreProducts] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort({ currentStock: 1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
      Product.find({ store: req.storeId, isActive: true }),
    ]);

    // Calculate store inventory totals
    let totalStockQty = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allStoreProducts.forEach((p) => {
      const stock = p.currentStock || 0;
      totalStockQty += stock;
      totalCostValuation += stock * (p.purchaseCost || 0);
      totalRetailValuation += stock * (p.sellingPrice || 0);

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= p.lowStockThreshold) {
        lowStockCount++;
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalProducts: allStoreProducts.length,
        totalStockQty,
        totalCostValuation: Math.round(totalCostValuation * 100) / 100,
        totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
        potentialProfit: Math.round((totalRetailValuation - totalCostValuation) * 100) / 100,
        lowStockCount,
        outOfStockCount,
      },
      products,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inventory Ledger (Stock Movement History)
// @route   GET /api/inventory/ledger
// @access  Private
const getInventoryLedger = async (req, res, next) => {
  try {
    const { product, transactionType, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = { store: req.storeId };

    if (product) {
      query.product = product;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('product', 'name sku unit')
        .populate('user', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      InventoryTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Manual Stock Adjustment
// @route   POST /api/inventory/adjust
// @access  Private (Admin, Manager)
const adjustStock = async (req, res, next) => {
  try {
    const { productId, adjustmentType, quantity, reason, notes } = req.body;

    if (!productId || !adjustmentType || quantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Product, adjustment type (add/subtract/replace), quantity, and mandatory reason are required.',
      });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid non-negative number.',
      });
    }

    const product = await Product.findOne({ _id: productId, store: req.storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const previousStock = product.currentStock;
    let newStock = previousStock;
    let quantityChange = 0;
    let txnType = 'adjustment_add';

    if (adjustmentType === 'add') {
      quantityChange = numQty;
      newStock = previousStock + numQty;
      txnType = 'adjustment_add';
    } else if (adjustmentType === 'subtract') {
      if (previousStock - numQty < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot subtract ${numQty} units. Product current stock is only ${previousStock}.`,
        });
      }
      quantityChange = -numQty;
      newStock = previousStock - numQty;
      txnType = 'adjustment_sub';
    } else if (adjustmentType === 'replace') {
      quantityChange = numQty - previousStock;
      newStock = numQty;
      txnType = 'adjustment_replace';
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid adjustment type. Must be 'add', 'subtract', or 'replace'.",
      });
    }

    // 1. Update Product Current Stock atomically
    product.currentStock = newStock;
    await product.save();

    // 2. Create StockAdjustment record
    const adjustment = await StockAdjustment.create({
      store: req.storeId,
      product: product._id,
      adjustmentType,
      quantity: numQty,
      previousStock,
      newStock,
      reason,
      notes: notes || '',
      user: req.user._id,
    });

    // 3. Record in Inventory Transaction Ledger
    await InventoryTransaction.create({
      store: req.storeId,
      product: product._id,
      transactionType: txnType,
      quantityChange,
      previousStock,
      newStock,
      referenceType: 'StockAdjustment',
      referenceId: adjustment._id,
      referenceNumber: `ADJ-${adjustment._id.toString().slice(-6).toUpperCase()}`,
      reason: `Reason: ${reason}. Notes: ${notes || 'N/A'}`,
      user: req.user._id,
    });

    // 4. Check for low stock notification
    if (newStock <= product.lowStockThreshold) {
      await Notification.create({
        store: req.storeId,
        title: newStock <= 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
        message: `Product '${product.name}' stock is now ${newStock} ${product.unit} after adjustment (${reason}).`,
        type: newStock <= 0 ? 'out_of_stock' : 'low_stock',
        metadata: { productId: product._id, stock: newStock },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully and recorded in inventory ledger.',
      adjustment,
      updatedProduct: {
        _id: product._id,
        name: product.name,
        currentStock: product.currentStock,
        unit: product.unit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock and out of stock alerts
// @route   GET /api/inventory/alerts
// @access  Private
const getStockAlerts = async (req, res, next) => {
  try {
    const products = await Product.find({
      store: req.storeId,
      isActive: true,
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
    })
      .populate('category', 'name')
      .populate('supplier', 'companyName phone')
      .sort({ currentStock: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      alerts: products,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventorySummary,
  getInventoryLedger,
  adjustStock,
  getStockAlerts,
};
