import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Package, Barcode, Tag, DollarSign, Layers, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const AddEditProductModal = ({ isOpen, onClose, product, onSaveSuccess, categories, suppliers }) => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    unit: 'pcs',
    purchaseCost: '',
    sellingPrice: '',
    currentStock: '',
    lowStockThreshold: '10',
    taxRate: '18',
    supplier: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category?._id || product.category || '',
        brand: product.brand || '',
        description: product.description || '',
        unit: product.unit || 'pcs',
        purchaseCost: product.purchaseCost !== undefined ? String(product.purchaseCost) : '',
        sellingPrice: product.sellingPrice !== undefined ? String(product.sellingPrice) : '',
        currentStock: product.currentStock !== undefined ? String(product.currentStock) : '',
        lowStockThreshold: product.lowStockThreshold !== undefined ? String(product.lowStockThreshold) : '10',
        taxRate: product.taxRate !== undefined ? String(product.taxRate) : '18',
        supplier: product.supplier?._id || product.supplier || '',
      });
    } else {
      setFormData({
        name: '',
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        barcode: '',
        category: categories.length > 0 ? categories[0]._id : '',
        brand: '',
        description: '',
        unit: 'pcs',
        purchaseCost: '',
        sellingPrice: '',
        currentStock: '0',
        lowStockThreshold: '10',
        taxRate: '18',
        supplier: '',
      });
    }
  }, [product, isOpen, categories]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.category || !formData.purchaseCost || !formData.sellingPrice) {
      toast.error('Please fill in product name, SKU, category, purchase cost, and selling price');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        purchaseCost: Number(formData.purchaseCost),
        sellingPrice: Number(formData.sellingPrice),
        currentStock: Number(formData.currentStock) || 0,
        lowStockThreshold: Number(formData.lowStockThreshold) || 10,
        taxRate: Number(formData.taxRate) || 0,
        supplier: formData.supplier || null,
      };

      if (product) {
        const res = await api.put(`/products/${product._id}`, payload);
        if (res.data.success) {
          toast.success('Product updated successfully!');
          onSaveSuccess(res.data.product);
          onClose();
        }
      } else {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          toast.success('Product created successfully!');
          onSaveSuccess(res.data.product);
          onClose();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {product ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-[11px] text-slate-400">Inventory item specification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. OnePlus Bullets Wireless Earphones"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. OnePlus"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Code *</label>
              <input
                type="text"
                required
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="PROD-001"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode (EAN / UPC)</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                placeholder="e.g. 890123456001"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                required
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measurement</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="ltr">Liter (ltr)</option>
                <option value="meter">Meter</option>
              </select>
            </div>
          </div>

          {/* Purchase Cost & Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Cost ({symbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                name="purchaseCost"
                value={formData.purchaseCost}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price ({symbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
              <select
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="0">0% (Exempted)</option>
                <option value="5">5% (Essential items)</option>
                <option value="12">12% (Standard)</option>
                <option value="18">18% (General goods)</option>
                <option value="28">28% (Luxury items)</option>
              </select>
            </div>
          </div>

          {/* Stock Quantities & Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {product ? 'Current Stock Qty' : 'Opening Stock Qty'}
              </label>
              <input
                type="number"
                disabled={!!product} // Stock adjustments should be used for existing products to preserve ledger!
                name="currentStock"
                value={formData.currentStock}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs disabled:bg-slate-100"
              />
              {product && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Use "Adjust Stock" to modify existing stock.
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Low Stock Alert Level</label>
              <input
                type="number"
                name="lowStockThreshold"
                value={formData.lowStockThreshold}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Association</label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows="2"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product specs or notes..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditProductModal;
