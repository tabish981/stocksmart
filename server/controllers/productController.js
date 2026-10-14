const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Notification = require('../models/Notification');

// @desc    Get all products with pagination, search, category filter, stock status
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      brand,
      stockStatus,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    const query = { store: req.storeId };

    // Search by name, SKU, or barcode
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Stock status filters
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

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('supplier', 'companyName name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, store: req.storeId })
      .populate('category', 'name')
      .populate('supplier', 'companyName name phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find product by barcode (Quick POS scan endpoint)
// @route   GET /api/products/barcode/:barcode
// @access  Private
const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const cleanBarcode = barcode.trim();

    const product = await Product.findOne({
      store: req.storeId,
      $or: [{ barcode: cleanBarcode }, { sku: cleanBarcode.toUpperCase() }],
      isActive: true,
    })
      .populate('category', 'name')
      .populate('supplier', 'companyName name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No active product found with barcode or SKU '${barcode}'.`,
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin, Manager)
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      unit,
      purchaseCost,
      sellingPrice,
      currentStock,
      lowStockThreshold,
      taxRate,
      supplier,
      imageUrl,
    } = req.body;

    if (!name || !sku || !category || purchaseCost === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, category, purchase cost, and selling price are required.',
      });
    }

    const cleanSku = sku.trim().toUpperCase();

    // Check SKU duplicate
    const existingSku = await Product.findOne({ store: req.storeId, sku: cleanSku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `A product with SKU '${cleanSku}' already exists.`,
      });
    }

    // Check Barcode duplicate if provided
    if (barcode && barcode.trim()) {
      const existingBarcode = await Product.findOne({
        store: req.storeId,
        barcode: barcode.trim(),
      });
      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: `A product with barcode '${barcode.trim()}' already exists.`,
        });
      }
    }

    const initialStock = Number(currentStock) || 0;

    const product = await Product.create({
      store: req.storeId,
      name: name.trim(),
      sku: cleanSku,
      barcode: barcode ? barcode.trim() : '',
      category,
      brand: brand ? brand.trim() : '',
      description: description ? description.trim() : '',
      unit: unit || 'pcs',
      purchaseCost: Number(purchaseCost),
      sellingPrice: Number(sellingPrice),
      currentStock: initialStock,
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10,
      taxRate: taxRate !== undefined ? Number(taxRate) : 18,
      supplier: supplier || null,
      imageUrl: imageUrl || '',
    });

    // Record Opening Stock in Inventory Ledger if stock was provided
    if (initialStock > 0) {
      await InventoryTransaction.create({
        store: req.storeId,
        product: product._id,
        transactionType: 'opening_stock',
        quantityChange: initialStock,
        previousStock: 0,
        newStock: initialStock,
        referenceType: 'InitialSetup',
        referenceNumber: 'INITIAL-STOCK',
        reason: 'Initial stock recorded upon product creation',
        user: req.user._id,
      });
    }

    // Check low stock alert
    if (initialStock <= product.lowStockThreshold) {
      await Notification.create({
        store: req.storeId,
        title: initialStock === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
        message: `Product '${product.name}' has stock of ${initialStock} ${product.unit}. (Threshold: ${product.lowStockThreshold})`,
        type: initialStock === 0 ? 'out_of_stock' : 'low_stock',
        metadata: { productId: product._id, sku: product.sku },
      });
    }

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('supplier', 'companyName name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: populatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, store: req.storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const {
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      unit,
      purchaseCost,
      sellingPrice,
      lowStockThreshold,
      taxRate,
      supplier,
      imageUrl,
      isActive,
    } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const cleanSku = sku.trim().toUpperCase();
      const duplicateSku = await Product.findOne({
        store: req.storeId,
        _id: { $ne: product._id },
        sku: cleanSku,
      });
      if (duplicateSku) {
        return res.status(400).json({
          success: false,
          message: `Another product with SKU '${cleanSku}' already exists.`,
        });
      }
      product.sku = cleanSku;
    }

    if (barcode !== undefined && barcode.trim() !== product.barcode) {
      const cleanBarcode = barcode.trim();
      if (cleanBarcode) {
        const duplicateBarcode = await Product.findOne({
          store: req.storeId,
          _id: { $ne: product._id },
          barcode: cleanBarcode,
        });
        if (duplicateBarcode) {
          return res.status(400).json({
            success: false,
            message: `Another product with barcode '${cleanBarcode}' already exists.`,
          });
        }
      }
      product.barcode = cleanBarcode;
    }

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (brand !== undefined) product.brand = brand.trim();
    if (description !== undefined) product.description = description.trim();
    if (unit) product.unit = unit;
    if (purchaseCost !== undefined) product.purchaseCost = Number(purchaseCost);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);
    if (taxRate !== undefined) product.taxRate = Number(taxRate);
    if (supplier !== undefined) product.supplier = supplier || null;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    const updated = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('supplier', 'companyName name');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, store: req.storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Check historical transaction references
    const [salesCount, purchasesCount, ledgerCount] = await Promise.all([
      Sale.countDocuments({ store: req.storeId, 'items.product': product._id }),
      Purchase.countDocuments({ store: req.storeId, 'items.product': product._id }),
      InventoryTransaction.countDocuments({ store: req.storeId, product: product._id }),
    ]);

    if (salesCount > 0 || purchasesCount > 0 || ledgerCount > 0) {
      // Historical references exist -> Deactivate instead of hard delete
      product.isActive = false;
      await product.save();

      return res.status(200).json({
        success: true,
        message: `Product is referenced in ${salesCount} sales, ${purchasesCount} purchases, and ${ledgerCount} ledger transactions. It has been deactivated to preserve transaction integrity.`,
      });
    }

    await Product.deleteOne({ _id: product._id });

    res.status(200).json({
      success: true,
      message: 'Product permanently deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export products as CSV
// @route   GET /api/products/export-csv
// @access  Private
const exportProductsCsv = async (req, res, next) => {
  try {
    const products = await Product.find({ store: req.storeId })
      .populate('category', 'name')
      .populate('supplier', 'companyName')
      .sort({ name: 1 });

    const header = [
      'Product Name',
      'SKU',
      'Barcode',
      'Category',
      'Brand',
      'Unit',
      'Purchase Cost',
      'Selling Price',
      'Current Stock',
      'Low Stock Threshold',
      'Tax Rate (%)',
      'Supplier',
      'Status',
    ];

    const rows = products.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${(p.category?.name || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.unit,
      p.purchaseCost,
      p.sellingPrice,
      p.currentStock,
      p.lowStockThreshold,
      p.taxRate,
      `"${(p.supplier?.companyName || '').replace(/"/g, '""')}"`,
      p.isActive ? 'Active' : 'Inactive',
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stocksmart_products.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Import products from CSV payload
// @route   POST /api/products/import-csv
// @access  Private (Admin, Manager)
const importProductsCsv = async (req, res, next) => {
  try {
    const { products } = req.body; // array of rows parsed on client or server

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No product rows provided for import.',
      });
    }

    const imported = [];
    const errors = [];

    // Cache categories to resolve or create
    const categories = await Category.find({ store: req.storeId });
    const categoryMap = new Map();
    categories.forEach((cat) => categoryMap.set(cat.name.toLowerCase(), cat._id));

    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      try {
        const name = row.name || row['Product Name'];
        const sku = (row.sku || row['SKU'] || '').toUpperCase().trim();
        const barcode = row.barcode || row['Barcode'] || '';
        const categoryName = row.category || row['Category'] || 'General';
        const brand = row.brand || row['Brand'] || '';
        const unit = row.unit || row['Unit'] || 'pcs';
        const purchaseCost = Number(row.purchaseCost || row['Purchase Cost'] || 0);
        const sellingPrice = Number(row.sellingPrice || row['Selling Price'] || 0);
        const currentStock = Number(row.currentStock || row['Current Stock'] || 0);
        const lowStockThreshold = Number(row.lowStockThreshold || row['Low Stock Threshold'] || 10);
        const taxRate = Number(row.taxRate || row['Tax Rate'] || 18);

        if (!name || !sku) {
          errors.push(`Row ${i + 1}: Name and SKU are required.`);
          continue;
        }

        // Check if SKU exists
        const exists = await Product.findOne({ store: req.storeId, sku });
        if (exists) {
          errors.push(`Row ${i + 1}: SKU '${sku}' already exists.`);
          continue;
        }

        // Resolve Category
        let catId = categoryMap.get(categoryName.toLowerCase());
        if (!catId) {
          const newCat = await Category.create({
            store: req.storeId,
            name: categoryName.trim(),
          });
          catId = newCat._id;
          categoryMap.set(categoryName.toLowerCase(), catId);
        }

        const newProduct = await Product.create({
          store: req.storeId,
          name: name.trim(),
          sku,
          barcode: barcode.trim(),
          category: catId,
          brand: brand.trim(),
          unit,
          purchaseCost,
          sellingPrice,
          currentStock,
          lowStockThreshold,
          taxRate,
        });

        if (currentStock > 0) {
          await InventoryTransaction.create({
            store: req.storeId,
            product: newProduct._id,
            transactionType: 'opening_stock',
            quantityChange: currentStock,
            previousStock: 0,
            newStock: currentStock,
            referenceType: 'InitialSetup',
            referenceNumber: 'CSV-IMPORT',
            reason: 'Imported via CSV',
            user: req.user._id,
          });
        }

        imported.push(newProduct);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${imported.length} products.`,
      importedCount: imported.length,
      errorsCount: errors.length,
      errors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsCsv,
  importProductsCsv,
};
