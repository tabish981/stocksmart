import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Filter, RefreshCw, User } from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentsLedgerPage = () => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [payments, setPayments] = useState([]);
  const [type, setType] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(type && { type }),
      });

      const res = await api.get(`/payments?${params.toString()}`);
      if (res.data.success) {
        setPayments(res.data.payments);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, type]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Financial Payments Ledger</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit history of customer balance receipts and vendor payouts
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Transaction Flow:</span>
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
        >
          <option value="">All Payments (Inflow & Outflow)</option>
          <option value="customer_payment">Customer Inflow (Receipts)</option>
          <option value="supplier_payment">Supplier Outflow (Payouts)</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Flow Type</th>
                <th className="py-3 px-4">Party (Customer / Supplier)</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference / Notes</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isInflow = p.type === 'customer_payment';
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(p.paymentDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isInflow
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isInflow ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" /> Customer Receipt
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" /> Supplier Payout
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {isInflow
                          ? p.customer?.name || 'Walk-in Customer'
                          : p.supplier?.companyName || 'Vendor'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px]">
                        <p className="font-mono text-slate-700">{p.referenceNumber || '-'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.notes || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold text-sm ${
                            isInflow ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(p.amount, symbol)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          {p.createdBy?.name || 'System'}
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
              Page {page} of {totalPages} ({total} payment records)
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

export default PaymentsLedgerPage;
