const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      maxlength: [100, 'Store name cannot exceed 100 characters'],
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    currency: {
      code: { type: String, default: 'INR' },
      symbol: { type: String, default: '₹' },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    settings: {
      invoicePrefix: { type: String, default: 'INV-' },
      purchasePrefix: { type: String, default: 'PO-' },
      defaultTaxRate: { type: Number, default: 18 },
      lowStockDefaultThreshold: { type: Number, default: 10 },
      invoiceFooterNotes: { type: String, default: 'Thank you for your business! Please visit again.' },
      allowNegativeStock: { type: Boolean, default: false },
      enableGst: { type: Boolean, default: true },
      termsAndConditions: { type: String, default: '1. Goods once sold cannot be taken back after 7 days.\n2. Warranty as per manufacturer terms.' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

storeSchema.index({ name: 1 });

module.exports = mongoose.model('Store', storeSchema);
