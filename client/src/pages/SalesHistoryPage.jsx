import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import InvoiceModal from '../components/InvoiceModal';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Ban,
  Calendar,
  CreditCard,
  TrendingUp,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SalesHistoryPage = () => {
  const { store, user } = useAuth();
  const symbol = store?.currency?.symbol || '₹';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedSale, setSelectedSale] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(paymentMethod && { paymentMethod }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data.success) {
        setSales(res.data.sales);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, paymentMethod, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  const handleViewInvoice = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.data.success) {
        setSelectedSale(res.data.sale);
        setInvoiceModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to fetch invoice details');
    }
  };

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    try {
      const res = await api.post(`/sales/${cancelSaleId}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        toast.success(res.data.message);
        setCancelModalOpen(false);
        setCancelReason('');
        setCancelSaleId(null);
        fetchSales();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sales & Invoices</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, search, reprint, or reverse historical customer invoices
          </p>
        </div>
        <button
          onClick={fetchSales}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit">Credit / On Account</option>
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-indigo-600">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(sale.saleDate)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {sale.customerName || 'Walk-in'}
                      {sale.customerPhone && (
                        <span className="block text-[10px] text-slate-400">{sale.customerPhone}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{sale.items?.length || 0} items</td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(sale.grandTotal, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sale.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : sale.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 line-through'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewInvoice(sale._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="View / Print Tax Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isAdminOrManager && sale.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setCancelSaleId(sale._id);
                            setCancelModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Cancel and Revert Stock"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </td>
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
              Showing page {page} of {totalPages} ({total} invoices)
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

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        sale={selectedSale}
        store={store}
      />

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">Cancel Invoice & Reverse Stock</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this invoice will automatically put sold items back into inventory and write a reversal
              entry to the stock movement ledger.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation *
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Customer changed mind, accidental duplicate punch"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={handleCancelSale}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistoryPage;
