import React, { useState } from 'react';
import api from '../services/api';
import { X, ArrowLeftRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const StockAdjustmentModal = ({ isOpen, onClose, product, products = [], onAdjustmentSuccess }) => {
  const [selectedProductId, setSelectedProductId] = useState(product?._id || '');
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('count_correction');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (product) {
      setSelectedProductId(product._id);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0]._id);
    }
  }, [product, products]);

  const activeProduct = product || products.find((p) => p._id === selectedProductId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !reason) {
      toast.error('Please select product, quantity, and reason');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/inventory/adjust', {
        productId: selectedProductId,
        adjustmentType,
        quantity: Number(quantity),
        reason,
        notes,
      });

      if (res.data.success) {
        toast.success('Stock adjusted and recorded in inventory ledger!');
        onAdjustmentSuccess(res.data);
        onClose();
        setQuantity('');
        setNotes('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Manual Stock Adjustment</h3>
              <p className="text-[11px] text-slate-400">Ledger audit record will be generated</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product selector if not preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product *</label>
            {product ? (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="font-semibold text-slate-900">{product.name}</p>
                <p className="text-[10px] text-slate-500">
                  Current Stock: {product.currentStock} {product.unit} • SKU: {product.sku}
                </p>
              </div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Stock: {p.currentStock} {p.unit}) - SKU: {p.sku}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adjustment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  adjustmentType === 'add'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                + Add Units
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  adjustmentType === 'subtract'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                - Deduct Units
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('replace')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  adjustmentType === 'replace'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                = Replace Total
              </button>
            </div>
          </div>

          {/* Quantity & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity {adjustmentType === 'replace' ? '(New Total)' : '(Delta)'} *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mandatory Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="count_correction">Count Correction / Audit</option>
                <option value="damaged">Damaged Goods</option>
                <option value="expired">Expired Stock</option>
                <option value="theft">Pilferage / Theft</option>
                <option value="returned_goods">Returned Goods</option>
                <option value="other">Other / Special Reason</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes / Explanation</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context for this stock adjustment..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? 'Recording Adjustment...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;
