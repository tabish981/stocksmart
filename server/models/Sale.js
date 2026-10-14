const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: [0.01, 'Quantity must be positive'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
    purchaseCost: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    lineProfit: { type: Number, default: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
    },
    customerPhone: {
      type: String,
      default: '',
    },
    customerGstin: {
      type: String,
      default: '',
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    changeGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'credit', 'mixed'],
      default: 'cash',
    },
    paymentDetails: {
      cashAmount: { type: Number, default: 0 },
      upiAmount: { type: Number, default: 0 },
      cardAmount: { type: Number, default: 0 },
      upiRef: { type: String, default: '' },
      cardRef: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'refunded'],
      default: 'completed',
    },
    notes: {
      type: String,
      default: '',
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ store: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ store: 1, saleDate: -1 });
saleSchema.index({ store: 1, customer: 1 });
saleSchema.index({ store: 1, status: 1 });

module.exports = mongoose.model('Sale', saleSchema);
