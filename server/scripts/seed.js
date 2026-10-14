require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const InventoryTransaction = require('../models/InventoryTransaction');
const StockAdjustment = require('../models/StockAdjustment');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');

const seedData = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cannot run seed script in production!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stocksmart');
    console.log('[Seed] Connected to database');

    // Clear existing collections safely for clean seed
    await Promise.all([
      Store.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Supplier.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Purchase.deleteMany({}),
      Sale.deleteMany({}),
      Payment.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      StockAdjustment.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seed] Cleared existing records');

    // 1. Create Store
    const store = await Store.create({
      name: 'StockSmart SuperMart & Electronics',
      companyName: 'StockSmart Retail Solutions Pvt. Ltd.',
      email: 'contact@stocksmart.com',
      phone: '+91 98765 43210',
      address: {
        street: '42 MG Road, Commercial Complex',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
      },
      gstin: '29ABCDE1234F1Z5',
      currency: { code: 'INR', symbol: '₹' },
      timezone: 'Asia/Kolkata',
      settings: {
        invoicePrefix: 'INV-',
        purchasePrefix: 'PO-',
        defaultTaxRate: 18,
        lowStockDefaultThreshold: 10,
        invoiceFooterNotes: 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days.',
        termsAndConditions: '1. GST included in all prices.\n2. Warranty handled by manufacturer.',
      },
    });

    // 2. Create Users (Admin, Manager, Cashier)
    const admin = await User.create({
      name: 'Rajesh Sharma (Admin)',
      email: 'admin@stocksmart.com',
      password: 'password123',
      role: 'admin',
      phone: '+91 98765 11111',
      store: store._id,
    });

    const manager = await User.create({
      name: 'Priya Patel (Manager)',
      email: 'manager@stocksmart.com',
      password: 'password123',
      role: 'manager',
      phone: '+91 98765 22222',
      store: store._id,
    });

    const cashier = await User.create({
      name: 'Amit Kumar (Cashier)',
      email: 'cashier@stocksmart.com',
      password: 'password123',
      role: 'cashier',
      phone: '+91 98765 33333',
      store: store._id,
    });

    console.log('[Seed] Created store and users');

    // 3. Create Categories
    const categoriesData = [
      { name: 'Smartphones & Accessories', description: 'Mobiles, chargers, covers, and cables' },
      { name: 'Groceries & Staples', description: 'Grains, oils, pulses, and flour' },
      { name: 'Beverages & Snacks', description: 'Juices, sodas, chips, and biscuits' },
      { name: 'Personal Care', description: 'Soaps, shampoos, skincare, and oral care' },
      { name: 'Home & Kitchen', description: 'Cookware, cleaning agents, and kitchen tools' },
      { name: 'Packaged Foods', description: 'Noodles, breakfast cereals, sauces, and spices' },
    ];

    const categories = [];
    for (const cat of categoriesData) {
      const c = await Category.create({ ...cat, store: store._id });
      categories.push(c);
    }

    // 4. Create Suppliers
    const suppliersData = [
      {
        name: 'Vikas Aggarwal',
        companyName: 'Apex Electronics Wholesale Dist.',
        phone: '+91 98234 56789',
        email: 'sales@apexelectronics.com',
        gstin: '29AABCA1234D1ZP',
        address: { city: 'Bengaluru', state: 'Karnataka' },
        paymentTerms: 'Net 30 Days',
        outstandingBalance: 24500,
      },
      {
        name: 'Suresh Singhal',
        companyName: 'Evergreen FMCG Traders Ltd.',
        phone: '+91 98456 78901',
        email: 'orders@evergreenfmcg.com',
        gstin: '29XYZAB5678C1Z8',
        address: { city: 'Mysuru', state: 'Karnataka' },
        paymentTerms: '15 Days',
        outstandingBalance: 12800,
      },
      {
        name: 'Anand Mohan',
        companyName: 'Southern Agro Commodities',
        phone: '+91 97123 45678',
        email: 'supply@southernagro.in',
        gstin: '29KLMNO9012E1Z3',
        address: { city: 'Bengaluru', state: 'Karnataka' },
        paymentTerms: 'Immediate',
        outstandingBalance: 0,
      },
    ];

    const suppliers = [];
    for (const sup of suppliersData) {
      const s = await Supplier.create({ ...sup, store: store._id });
      suppliers.push(s);
    }

    // 5. Create Customers
    const customersData = [
      {
        name: 'Rahul Verma',
        phone: '+91 99887 76655',
        email: 'rahul.verma@example.com',
        customerType: 'retail',
        creditLimit: 15000,
        outstandingBalance: 3200,
      },
      {
        name: 'Meera Deshmukh',
        phone: '+91 98711 22334',
        email: 'meera.d@example.com',
        customerType: 'retail',
        creditLimit: 10000,
        outstandingBalance: 0,
      },
      {
        name: 'Kiran Kirana Store',
        phone: '+91 97654 32198',
        email: 'kirankirana@example.com',
        customerType: 'wholesale',
        gstin: '29QWERT9876H1Z2',
        creditLimit: 50000,
        outstandingBalance: 18450,
      },
      {
        name: 'Anjali Gupta',
        phone: '+91 98112 34567',
        email: 'anjali.g@example.com',
        customerType: 'retail',
        creditLimit: 5000,
        outstandingBalance: 650,
      },
    ];

    const customers = [];
    for (const cust of customersData) {
      const c = await Customer.create({ ...cust, store: store._id });
      customers.push(c);
    }

    // 6. Create Products with realistic Indian barcodes and SKUs
    const productsData = [
      {
        name: 'OnePlus Bullets Wireless Z2 Earphones',
        sku: 'ONEPLUS-Z2-BLK',
        barcode: '890123456001',
        category: categories[0]._id,
        brand: 'OnePlus',
        unit: 'pcs',
        purchaseCost: 1450,
        sellingPrice: 1999,
        currentStock: 24,
        lowStockThreshold: 8,
        taxRate: 18,
        supplier: suppliers[0]._id,
        description: 'Acoustic bass wireless Bluetooth neckband earphones',
      },
      {
        name: 'Fastrack 65W Fast Charger Type-C Adapter',
        sku: 'CHG-FAST-65W',
        barcode: '890123456002',
        category: categories[0]._id,
        brand: 'Fastrack',
        unit: 'pcs',
        purchaseCost: 850,
        sellingPrice: 1299,
        currentStock: 4, // low stock!
        lowStockThreshold: 10,
        taxRate: 18,
        supplier: suppliers[0]._id,
        description: 'GaN Dual Port Type C & USB 65W fast wall charger',
      },
      {
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        sku: 'AASH-ATTA-5KG',
        barcode: '890123456003',
        category: categories[1]._id,
        brand: 'Aashirvaad',
        unit: 'pack',
        purchaseCost: 220,
        sellingPrice: 265,
        currentStock: 48,
        lowStockThreshold: 15,
        taxRate: 5,
        supplier: suppliers[1]._id,
        description: '100% whole wheat chakki flour with natural dietary fiber',
      },
      {
        name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        sku: 'FORT-OIL-1L',
        barcode: '890123456004',
        category: categories[1]._id,
        brand: 'Fortune',
        unit: 'pack',
        purchaseCost: 118,
        sellingPrice: 142,
        currentStock: 35,
        lowStockThreshold: 12,
        taxRate: 5,
        supplier: suppliers[1]._id,
        description: 'Refined sunflower cooking oil enriched with vitamins A and D',
      },
      {
        name: 'Tata Tea Gold Leaf Tea 500g',
        sku: 'TATA-TEA-500G',
        barcode: '890123456005',
        category: categories[2]._id,
        brand: 'Tata',
        unit: 'pack',
        purchaseCost: 245,
        sellingPrice: 310,
        currentStock: 18,
        lowStockThreshold: 10,
        taxRate: 5,
        supplier: suppliers[1]._id,
        description: 'Assam orthodox long leaf tea blend with rich aroma',
      },
      {
        name: 'Cadbury Dairy Milk Silk Chocolate 150g',
        sku: 'CAD-SILK-150G',
        barcode: '890123456006',
        category: categories[2]._id,
        brand: 'Cadbury',
        unit: 'pcs',
        purchaseCost: 130,
        sellingPrice: 175,
        currentStock: 2, // low stock!
        lowStockThreshold: 10,
        taxRate: 18,
        supplier: suppliers[1]._id,
        description: 'Creamy smooth chocolate bar made from pure cocoa',
      },
      {
        name: 'Dettol Original Germ Protection Bathing Soap (Pack of 4)',
        sku: 'DETT-SOAP-4PK',
        barcode: '890123456007',
        category: categories[3]._id,
        brand: 'Dettol',
        unit: 'pack',
        purchaseCost: 160,
        sellingPrice: 210,
        currentStock: 28,
        lowStockThreshold: 10,
        taxRate: 18,
        supplier: suppliers[1]._id,
        description: 'Antibacterial soap bar for 99.9% germ protection',
      },
      {
        name: 'Colgate Strong Teeth Toothpaste 300g (Saver Pack)',
        sku: 'COLG-PASTE-300G',
        barcode: '890123456008',
        category: categories[3]._id,
        brand: 'Colgate',
        unit: 'pack',
        purchaseCost: 110,
        sellingPrice: 145,
        currentStock: 0, // out of stock!
        lowStockThreshold: 10,
        taxRate: 18,
        supplier: suppliers[1]._id,
        description: 'Amino Shakti formula for 2X stronger teeth',
      },
      {
        name: 'Pigeon Stainless Steel Pressure Cooker 3L',
        sku: 'PIGEON-CKR-3L',
        barcode: '890123456009',
        category: categories[4]._id,
        brand: 'Pigeon',
        unit: 'pcs',
        purchaseCost: 750,
        sellingPrice: 1199,
        currentStock: 15,
        lowStockThreshold: 5,
        taxRate: 12,
        supplier: suppliers[0]._id,
        description: 'Induction and gas compatible outer lid pressure cooker',
      },
      {
        name: 'Maggi 2-Minute Masala Instant Noodles (12-Pack)',
        sku: 'MAGGI-12PK',
        barcode: '890123456010',
        category: categories[5]._id,
        brand: 'Maggi',
        unit: 'pack',
        purchaseCost: 135,
        sellingPrice: 168,
        currentStock: 42,
        lowStockThreshold: 15,
        taxRate: 12,
        supplier: suppliers[1]._id,
        description: 'Classic instant noodles with authentic spices',
      },
    ];

    const products = [];
    for (const p of productsData) {
      const prod = await Product.create({ ...p, store: store._id });
      products.push(prod);

      // Create opening stock ledger transaction
      if (prod.currentStock > 0) {
        await InventoryTransaction.create({
          store: store._id,
          product: prod._id,
          transactionType: 'opening_stock',
          quantityChange: prod.currentStock,
          previousStock: 0,
          newStock: prod.currentStock,
          referenceType: 'InitialSetup',
          referenceNumber: 'INIT-SETUP',
          reason: 'Initial setup stock quantity',
          user: admin._id,
        });
      }
    }

    // 7. Create Sample Purchases
    const purchase1 = await Purchase.create({
      store: store._id,
      invoiceNumber: 'PO-2026-0001',
      supplier: suppliers[0]._id,
      purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 20,
          purchasePrice: 1450,
          taxRate: 18,
          lineTotal: 29000,
        },
        {
          product: products[1]._id,
          name: products[1].name,
          sku: products[1].sku,
          quantity: 15,
          purchasePrice: 850,
          taxRate: 18,
          lineTotal: 12750,
        },
      ],
      subtotal: 41750,
      taxAmount: 7515,
      discountAmount: 1000,
      additionalCharges: 500,
      grandTotal: 48765,
      amountPaid: 24265,
      outstandingAmount: 24500,
      paymentMethod: 'bank_transfer',
      status: 'received',
      notes: 'Initial electronics batch for October',
      createdBy: admin._id,
    });

    const purchase2 = await Purchase.create({
      store: store._id,
      invoiceNumber: 'PO-2026-0002',
      supplier: suppliers[1]._id,
      purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      items: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 50,
          purchasePrice: 220,
          taxRate: 5,
          lineTotal: 11000,
        },
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 40,
          purchasePrice: 118,
          taxRate: 5,
          lineTotal: 4720,
        },
      ],
      subtotal: 15720,
      taxAmount: 786,
      discountAmount: 500,
      additionalCharges: 200,
      grandTotal: 16206,
      amountPaid: 16206,
      outstandingAmount: 0,
      paymentMethod: 'bank_transfer',
      status: 'received',
      notes: 'Grocery supply from Evergreen',
      createdBy: manager._id,
    });

    // 8. Create Sample Sales
    // Sale 1: Today
    const sale1 = await Sale.create({
      store: store._id,
      invoiceNumber: 'INV-2026-00001',
      customer: customers[0]._id,
      customerName: customers[0].name,
      customerPhone: customers[0].phone,
      saleDate: new Date(),
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 1,
          unitPrice: 1999,
          purchaseCost: 1450,
          taxRate: 18,
          taxAmount: 305,
          discount: 0,
          lineTotal: 1999,
          lineProfit: 549,
        },
        {
          product: products[4]._id,
          name: products[4].name,
          sku: products[4].sku,
          quantity: 2,
          unitPrice: 310,
          purchaseCost: 245,
          taxRate: 5,
          taxAmount: 30,
          discount: 20,
          lineTotal: 600,
          lineProfit: 110,
        },
      ],
      subtotal: 2599,
      taxAmount: 335,
      discountAmount: 20,
      grandTotal: 2599,
      amountPaid: 2599,
      changeGiven: 401,
      outstandingAmount: 0,
      totalProfit: 659,
      paymentMethod: 'cash',
      paymentDetails: { cashAmount: 3000 },
      status: 'completed',
      cashier: cashier._id,
    });

    // Sale 2: Yesterday UPI sale
    const sale2 = await Sale.create({
      store: store._id,
      invoiceNumber: 'INV-2026-00002',
      customer: customers[1]._id,
      customerName: customers[1].name,
      customerPhone: customers[1].phone,
      saleDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[8]._id,
          name: products[8].name,
          sku: products[8].sku,
          quantity: 1,
          unitPrice: 1199,
          purchaseCost: 750,
          taxRate: 12,
          taxAmount: 128,
          discount: 50,
          lineTotal: 1149,
          lineProfit: 399,
        },
        {
          product: products[9]._id,
          name: products[9].name,
          sku: products[9].sku,
          quantity: 3,
          unitPrice: 168,
          purchaseCost: 135,
          taxRate: 12,
          taxAmount: 54,
          discount: 0,
          lineTotal: 504,
          lineProfit: 99,
        },
      ],
      subtotal: 1653,
      taxAmount: 182,
      discountAmount: 50,
      grandTotal: 1653,
      amountPaid: 1653,
      changeGiven: 0,
      outstandingAmount: 0,
      totalProfit: 498,
      paymentMethod: 'upi',
      paymentDetails: { upiAmount: 1653, upiRef: 'UPI-982147102938' },
      status: 'completed',
      cashier: cashier._id,
    });

    // Sale 3: Wholesale credit sale
    const sale3 = await Sale.create({
      store: store._id,
      invoiceNumber: 'INV-2026-00003',
      customer: customers[2]._id,
      customerName: customers[2].name,
      customerPhone: customers[2].phone,
      saleDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 10,
          unitPrice: 265,
          purchaseCost: 220,
          taxRate: 5,
          taxAmount: 126,
          discount: 150,
          lineTotal: 2500,
          lineProfit: 300,
        },
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 12,
          unitPrice: 142,
          purchaseCost: 118,
          taxRate: 5,
          taxAmount: 81,
          discount: 104,
          lineTotal: 1600,
          lineProfit: 184,
        },
      ],
      subtotal: 4100,
      taxAmount: 207,
      discountAmount: 254,
      grandTotal: 4100,
      amountPaid: 0,
      changeGiven: 0,
      outstandingAmount: 4100,
      totalProfit: 484,
      paymentMethod: 'credit',
      status: 'completed',
      cashier: manager._id,
    });

    // 9. Create Sample Operating Expenses
    await Expense.create([
      {
        store: store._id,
        title: 'October Shop Space Rent',
        category: 'Rent',
        amount: 35000,
        paymentMethod: 'bank_transfer',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        user: admin._id,
      },
      {
        store: store._id,
        title: 'Electricity & High-Speed Internet Bill',
        category: 'Utilities',
        amount: 4850,
        paymentMethod: 'upi',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        user: admin._id,
      },
      {
        store: store._id,
        title: 'Shopping Bags & Thermal Paper Rolls',
        category: 'Packaging',
        amount: 2200,
        paymentMethod: 'cash',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        user: manager._id,
      },
    ]);

    // 10. Create Stock Notifications
    await Notification.create([
      {
        store: store._id,
        title: 'Out of Stock Alert',
        message: 'Product "Colgate Strong Teeth Toothpaste 300g" is currently completely out of stock.',
        type: 'out_of_stock',
        metadata: { productId: products[7]._id, sku: products[7].sku },
      },
      {
        store: store._id,
        title: 'Low Stock Alert',
        message: 'Product "Fastrack 65W Fast Charger" has only 4 units remaining (Threshold: 10).',
        type: 'low_stock',
        metadata: { productId: products[1]._id, sku: products[1].sku },
      },
      {
        store: store._id,
        title: 'Payment Reminder',
        message: 'Outstanding supplier balance of ₹24,500 due to Apex Electronics Wholesale Dist.',
        type: 'payment_due',
      },
    ]);

    console.log('------------------------------------------------------------');
    console.log('[Seed] Database successfully seeded with realistic demo data!');
    console.log('Store: StockSmart SuperMart & Electronics');
    console.log('Login credentials:');
    console.log('1. Admin:   admin@stocksmart.com   / password123');
    console.log('2. Manager: manager@stocksmart.com / password123');
    console.log('3. Cashier: cashier@stocksmart.com / password123');
    console.log('------------------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedData();
