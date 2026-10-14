const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier contact person name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    phone: {
      type: String,
      trim: true,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
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
      default: '',
    },
    paymentTerms: {
      type: String,
      default: 'Net 30 Days',
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

supplierSchema.index({ store: 1, companyName: 1 });
supplierSchema.index({ store: 1, phone: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
