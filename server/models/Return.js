const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: [0.01, 'Quantity must be positive'] },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    reason: { type: String, default: 'Customer return' },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    returnNumber: {
      type: String,
      required: true,
      trim: true,
    },
    returnType: {
      type: String,
      enum: ['sale_return', 'purchase_return'],
      default: 'sale_return',
    },
    originalInvoiceNumber: {
      type: String,
      required: true,
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    items: [returnItemSchema],
    totalRefundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'upi', 'credit_note', 'original_method'],
      default: 'cash',
    },
    notes: {
      type: String,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

returnSchema.index({ store: 1, returnNumber: 1 });
returnSchema.index({ store: 1, createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
