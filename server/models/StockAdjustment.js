const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ['add', 'subtract', 'replace'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ['damaged', 'expired', 'count_correction', 'theft', 'returned_goods', 'opening_stock', 'other'],
      required: [true, 'Adjustment reason is mandatory'],
    },
    notes: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ store: 1, createdAt: -1 });
stockAdjustmentSchema.index({ store: 1, product: 1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
