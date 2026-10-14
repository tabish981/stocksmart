import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { RotateCcw, Plus, Search, RefreshCw, X, Receipt, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ReturnsPage = () => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [returns, setReturns] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Return Processing Modal
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [loadedSale, setLoadedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/returns?page=${page}&limit=15`);
      if (res.data.success) {
        setReturns(res.data.returns);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [page]);

  const handleLookupInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceLookup.trim()) return;

    try {
      // Find sale by invoiceNumber
      const res = await api.get(`/sales?search=${encodeURIComponent(invoiceLookup.trim())}`);
      if (res.data.success && res.data.sales.length > 0) {
        const found = res.data.sales.find(
          (s) => s.invoiceNumber.toLowerCase() === invoiceLookup.trim().toLowerCase()
        );
        if (found) {
          setLoadedSale(found);
          // Initialize return items map
          setReturnItems(
            (found.items || []).map((it) => ({
              product: it.product,
              name: it.name,
              sku: it.sku,
              unitPrice: it.unitPrice,
              originalQty: it.quantity,
              returnQty: 0,
              reason: 'Customer return',
            }))
          );
        } else {
          toast.error(`Invoice '${invoiceLookup}' not found`);
        }
      } else {
        toast.error(`Invoice '${invoiceLookup}' not found`);
      }
    } catch (err) {
      toast.error('Failed to lookup invoice');
    }
  };

  const updateItemReturnQty = (index, qty) => {
    const num = Math.max(0, Number(qty) || 0);
    const updated = [...returnItems];
    if (num > updated[index].originalQty) {
      toast.error(`Cannot return more than originally purchased (${updated[index].originalQty})`);
      return;
    }
    updated[index].returnQty = num;
    setReturnItems(updated);
  };

  const updateItemReason = (index, reason) => {
    const updated = [...returnItems];
    updated[index].reason = reason;
    setReturnItems(updated);
  };

  const totalRefund = returnItems.reduce((acc, it) => acc + (it.returnQty || 0) * (it.unitPrice || 0), 0);

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const itemsToReturn = returnItems.filter((it) => it.returnQty > 0);
    if (itemsToReturn.length === 0) {
      toast.error('Please specify return quantity for at least one item');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/returns/sale', {
        invoiceNumber: loadedSale.invoiceNumber,
        items: itemsToReturn.map((it) => ({
          productId: it.product,
          quantity: it.returnQty,
          reason: it.reason,
        })),
        refundMethod,
        notes,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setProcessModalOpen(false);
        setLoadedSale(null);
        setInvoiceLookup('');
        setReturnItems([]);
        fetchReturns();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Returns & Refunds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Process customer sale returns, issue refunds, and restore stock automatically
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReturns}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              setLoadedSale(null);
              setInvoiceLookup('');
              setProcessModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Process Return
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Original Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Returned Items</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4">Refund Method</th>
                <th className="py-3 px-4">Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading return records...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No returns processed yet.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-indigo-600">{ret.returnNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(ret.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{ret.originalInvoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{ret.customer?.name || 'Walk-in'}</td>
                    <td className="py-3 px-4 text-slate-600">{ret.items?.length || 0} item(s)</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      {formatCurrency(ret.totalRefundAmount, symbol)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ret.refundMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{ret.processedBy?.name || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({total} returns)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Process Return Modal */}
      {processModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Process Sale Return & Restock</h3>
                  <p className="text-[11px] text-slate-400">Lookup original invoice and pick items</p>
                </div>
              </div>
              <button onClick={() => setProcessModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Lookup Invoice Form */}
              {!loadedSale ? (
                <form onSubmit={handleLookupInvoice} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Enter Invoice Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-00001"
                      value={invoiceLookup}
                      onChange={(e) => setInvoiceLookup(e.target.value)}
                      required
                      autoFocus
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      Fetch Invoice
                    </button>
                  </div>
                </form>
              ) : (
                /* Return Items Selection Form */
                <form onSubmit={handleSubmitReturn} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{loadedSale.invoiceNumber}</p>
                      <p className="text-[11px] text-slate-500">Customer: {loadedSale.customerName || 'Walk-in'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoadedSale(null)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Change Invoice
                    </button>
                  </div>

                  {/* Items to return table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3">Sold Qty</th>
                          <th className="py-2.5 px-3 w-28">Return Qty</th>
                          <th className="py-2.5 px-3">Reason</th>
                          <th className="py-2.5 px-3 text-right">Refund Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {returnItems.map((itm, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {itm.name}
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {formatCurrency(itm.unitPrice, symbol)} each
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-medium">{itm.originalQty}</td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max={itm.originalQty}
                                value={itm.returnQty}
                                onChange={(e) => updateItemReturnQty(idx, e.target.value)}
                                className="w-20 px-2 py-1 rounded-lg border border-slate-200 font-bold"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={itm.reason}
                                onChange={(e) => updateItemReason(idx, e.target.value)}
                                placeholder="Defect/Wrong item..."
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {formatCurrency((itm.returnQty || 0) * itm.unitPrice, symbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Refund Method & Notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Refund Method</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                      >
                        <option value="cash">Cash Refund</option>
                        <option value="upi">UPI Refund</option>
                        <option value="credit_note">Credit Note / Balance Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Total Refund Amount</label>
                      <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-right">
                        <span className="text-base font-extrabold text-indigo-900">
                          {formatCurrency(totalRefund, symbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setProcessModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || totalRefund <= 0}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
                    >
                      {submitting ? 'Processing Return...' : `Confirm Return (${formatCurrency(totalRefund, symbol)})`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;
