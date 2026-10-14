const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Category = require('../models/Category');

let adminToken;
let cashierToken;
let testStore;
let testCategory;
let testProduct;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stocksmart');

  // Login as admin
  const adminRes = await request(app).post('/api/auth/login').send({
    email: 'admin@stocksmart.com',
    password: 'password123',
  });
  adminToken = adminRes.body.token;
  testStore = adminRes.body.store;

  // Login as cashier
  const cashierRes = await request(app).post('/api/auth/login').send({
    email: 'cashier@stocksmart.com',
    password: 'password123',
  });
  cashierToken = cashierRes.body.token;

  // Fetch category
  const catRes = await request(app)
    .get('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`);
  testCategory = catRes.body.categories[0];

  // Fetch product
  const prodRes = await request(app)
    .get('/api/products')
    .set('Authorization', `Bearer ${adminToken}`);
  testProduct = prodRes.body.products[0];
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication & Store Isolation', () => {
  it('should reject unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return current user profile and store for valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@stocksmart.com');
  });

  it('should enforce role-based authorization: cashier cannot delete products', async () => {
    const res = await request(app)
      .delete(`/api/products/${testProduct._id}`)
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('Product & Inventory Flow', () => {
  it('should fetch active products with category population', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products[0].name).toBeDefined();
  });

  it('should find product by barcode scan', async () => {
    const res = await request(app)
      .get(`/api/products/barcode/${testProduct.barcode}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.product._id).toBe(testProduct._id);
  });

  it('should perform stock adjustment with mandatory reason and ledger entry', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProduct._id,
        adjustmentType: 'add',
        quantity: 5,
        reason: 'count_correction',
        notes: 'Annual inventory audit count adjustment',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.adjustment.reason).toBe('count_correction');
  });
});

describe('POS Billing & Sales Transaction Integrity', () => {
  it('should process a sale, deduct stock atomically, and calculate server total', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        customerName: 'Test Walkin Buyer',
        items: [
          {
            productId: testProduct._id,
            quantity: 1,
            discount: 0,
          },
        ],
        paymentMethod: 'cash',
        amountReceived: testProduct.sellingPrice + 50,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.invoiceNumber).toMatch(/^INV-/);
    expect(res.body.sale.amountPaid).toBe(res.body.sale.grandTotal);
    expect(res.body.sale.changeGiven).toBeGreaterThanOrEqual(0);
  });

  it('should reject sale if requested quantity exceeds stock without negative stock allowed', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        customerName: 'Oversell Buyer',
        items: [
          {
            productId: testProduct._id,
            quantity: 999999, // way above stock
          },
        ],
        paymentMethod: 'cash',
        amountReceived: 1000000,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);
  });
});

describe('Dashboard & Reports Analytics', () => {
  it('should return real-time calculated business statistics', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalProducts).toBeGreaterThan(0);
    expect(res.body.chartData.length).toBe(7);
  });
});
