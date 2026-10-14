import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { X, Truck, Plus, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CreatePurchaseModal = ({ isOpen, onClose, suppliers, products, onPurchaseSuccess }) => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p._id === selectedProductId);
    if (!prod) return;

    const existing = items.find((it) => it.productId === prod._id);
    if (existing) {
      setItems(items.map((it) => (it.productId === prod._id ? { ...it, quantity: it.quantity + 1 } : it)));
    } else {
      setItems([
        ...items,
        {
          productId: prod._id,
          name: prod.name,
          sku: prod.sku,
          purchasePrice: prod.purchaseCost,
          quantity: 1,
        },
      ]);
    }
    setSelectedProductId('');
  };

  const updateItem = (productId, field, value) => {
    setItems(
      items.map((it) => (it.productId === productId ? { ...it, [field]: Number(value) || 0 } : it))
    );
  };

  const removeItem = (productId) => {
    setItems(items.filter((it) => it.productId !== productId));
  };

  const subtotal = items.reduce((acc, it) => acc + (it.quantity || 0) * (it.purchasePrice || 0), 0);
  const grandTotal = Math.max(
    0,
    subtotal + (Number(taxAmount) || 0) + (Number(additionalCharges) || 0) - (Number(discountAmount) || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      toast.error('Please select supplier and add at least one product');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/purchases', {
        supplierId,
        invoiceNumber,
        purchaseDate,
        items,
        subtotal,
        taxAmount: Number(taxAmount) || 0,
        discountAmount: Number(discountAmount) || 0,
        additionalCharges: Number(additionalCharges) || 0,
        grandTotal,
        amountPaid: Number(amountPaid) || 0,
        paymentMethod,
        notes,
      });

      if (res.data.success) {
        toast.success('Purchase recorded and stock added to inventory!');
        onPurchaseSuccess(res.data.purchase);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Record New Purchase Entry</h3>
              <p className="text-[11px] text-slate-400">Stock will be received and added to inventory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.companyName} ({s.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Invoice / PO #
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto PO #"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Add Item Row */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex gap-2 items-center">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="">Select product to add to purchase order...</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (SKU: {p.sku}) - Cost: {symbol}{p.purchaseCost}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedProductId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              Add Item
            </button>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 w-24">Qty</th>
                  <th className="py-2.5 px-3 w-32">Unit Cost ({symbol})</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-400">
                      No items added yet. Select a product above.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.productId}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {it.name}
                        <span className="block text-[10px] text-slate-400 font-mono">{it.sku}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(it.productId, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 font-medium"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.purchasePrice}
                          onChange={(e) => updateItem(it.productId, 'purchasePrice', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 font-medium"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency((it.quantity || 0) * (it.purchasePrice || 0), symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(it.productId)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Additional Charges & Amounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Taxes (GST)</label>
              <input
                type="number"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount</label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping / Freight</label>
              <input
                type="number"
                min="0"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid Now</label>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-emerald-600"
              />
            </div>
          </div>

          {/* Payment Method & Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/60">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-indigo-900">Payment Mode:</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-medium"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="text-right">
              <span className="text-xs text-indigo-600 font-medium">Grand Total Payable:</span>
              <p className="text-xl font-extrabold text-indigo-950">{formatCurrency(grandTotal, symbol)}</p>
            </div>
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
              disabled={loading || items.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? 'Posting Purchase...' : 'Post Purchase & Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseModal;
