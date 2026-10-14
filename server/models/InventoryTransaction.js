const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
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
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'purchase',
        'sale',
        'adjustment_add',
        'adjustment_sub',
        'adjustment_replace',
        'return_in',
        'return_out',
        'opening_stock',
      ],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ['Purchase', 'Sale', 'StockAdjustment', 'Return', 'InitialSetup', 'Manual'],
      default: 'Manual',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceNumber: {
      type: String,
      default: '',
    },
    reason: {
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

inventoryTransactionSchema.index({ store: 1, product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ store: 1, transactionType: 1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
