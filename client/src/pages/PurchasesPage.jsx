import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import CreatePurchaseModal from '../components/CreatePurchaseModal';
import { Truck, Plus, Search, Filter, RefreshCw, Eye, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PurchasesPage = () => {
  const { store, user } = useAuth();
  const symbol = store?.currency?.symbol || '₹';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [page, setPage] = useState(1);

  // Modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(selectedSupplier && { supplier: selectedSupplier }),
      });

      const res = await api.get(`/purchases?${params.toString()}`);
      if (res.data.success) {
        setPurchases(res.data.purchases);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers?isActive=true'),
          api.get('/products?limit=100&isActive=true'),
        ]);
        if (supRes.data.success) setSuppliers(supRes.data.suppliers);
        if (prodRes.data.success) setProducts(prodRes.data.products);
      } catch (err) {}
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [page, selectedSupplier]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPurchases();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Purchases & Supplier Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record incoming stock, manage supplier dues, and purchase history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPurchases}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              New Purchase Entry
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by PO # or invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Filter Purchases
            </button>
          </div>
        </form>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">PO / Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Items Received</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    No purchase records found.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-indigo-600">{po.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(po.purchaseDate)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {po.supplier?.companyName || 'Unknown Supplier'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{po.items?.length || 0} product(s)</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(po.grandTotal, symbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(po.amountPaid, symbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      {po.outstandingAmount > 0 ? formatCurrency(po.outstandingAmount, symbol) : 'Settled'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setViewPurchase(po)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="View PO Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
              Page {page} of {totalPages} ({total} purchases)
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

      {/* Create Purchase Entry Modal */}
      <CreatePurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        suppliers={suppliers}
        products={products}
        onPurchaseSuccess={() => fetchPurchases()}
      />

      {/* View Purchase Details Modal */}
      {viewPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Purchase Order: {viewPurchase.invoiceNumber}</h3>
                <p className="text-[11px] text-slate-400">Supplier: {viewPurchase.supplier?.companyName}</p>
              </div>
              <button onClick={() => setViewPurchase(null)} className="p-1 text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-slate-100">
              {(viewPurchase.items || []).map((itm, i) => (
                <div key={i} className="py-2 flex justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{itm.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {itm.quantity} units @ {formatCurrency(itm.purchasePrice, symbol)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(itm.lineTotal, symbol)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>Grand Total:</span>
                <span>{formatCurrency(viewPurchase.grandTotal, symbol)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Amount Paid:</span>
                <span>{formatCurrency(viewPurchase.amountPaid, symbol)}</span>
              </div>
              {viewPurchase.outstandingAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due to Supplier:</span>
                  <span>{formatCurrency(viewPurchase.outstandingAmount, symbol)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewPurchase(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
