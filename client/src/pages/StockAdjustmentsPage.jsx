import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { History, Filter, ArrowUp, ArrowDown, RefreshCw, User, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const StockAdjustmentsPage = () => {
  const [ledger, setLedger] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(transactionType && { transactionType }),
      });

      const res = await api.get(`/inventory/ledger?${params.toString()}`);
      if (res.data.success) {
        setLedger(res.data.transactions);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load stock ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [page, transactionType]);

  const getTxnTypeBadge = (type) => {
    switch (type) {
      case 'purchase':
        return { label: 'Purchase Receipt', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'sale':
        return { label: 'Customer Sale', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'adjustment_add':
        return { label: 'Manual Addition', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'adjustment_sub':
        return { label: 'Manual Deduction', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'adjustment_replace':
        return { label: 'Count Replacement', class: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'return_in':
        return { label: 'Sale Return Restock', class: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'return_out':
        return { label: 'Supplier Return', class: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'opening_stock':
        return { label: 'Opening Stock', class: 'bg-slate-100 text-slate-700 border-slate-300' };
      default:
        return { label: type, class: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Movement Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit trail of every stock change, transaction reference, user, and reason
          </p>
        </div>

        <button
          onClick={fetchLedger}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Transaction Type:</span>
        </div>
        <select
          value={transactionType}
          onChange={(e) => {
            setTransactionType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
        >
          <option value="">All Movement Types</option>
          <option value="purchase">Purchase Receipts</option>
          <option value="sale">Sales Deductions</option>
          <option value="adjustment_add">Manual Additions</option>
          <option value="adjustment_sub">Manual Deductions</option>
          <option value="adjustment_replace">Count Adjustments</option>
          <option value="return_in">Returns Restocked</option>
          <option value="opening_stock">Opening Stock</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Prev Stock</th>
                <th className="py-3 px-4 text-center">Change</th>
                <th className="py-3 px-4 text-center">New Stock</th>
                <th className="py-3 px-4">Reference / Reason</th>
                <th className="py-3 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading inventory ledger records...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No movement records found.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => {
                  const badge = getTxnTypeBadge(entry.transactionType);
                  const isPositive = entry.quantityChange > 0;
                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[180px] truncate">
                        {entry.product?.name || 'Unknown Product'}
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {entry.product?.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {entry.previousStock}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {isPositive ? `+${entry.quantityChange}` : entry.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {entry.newStock}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px]">
                        <p className="font-semibold text-slate-800">{entry.referenceNumber || '-'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{entry.reason || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          {entry.user?.name || 'System'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({total} ledger records)
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
    </div>
  );
};

export default StockAdjustmentsPage;
