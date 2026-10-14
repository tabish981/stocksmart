import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getStockBadge } from '../utils/formatters';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import {
  Layers,
  ArrowLeftRight,
  Search,
  Filter,
  AlertTriangle,
  Package,
  TrendingUp,
  RefreshCw,
  Coins,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const InventoryPage = () => {
  const { store, user } = useAuth();
  const symbol = store?.currency?.symbol || '₹';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(category && { category }),
        ...(stockStatus && { stockStatus }),
      });

      const res = await api.get(`/inventory?${params.toString()}`);
      if (res.data.success) {
        setSummary(res.data.summary);
        setProducts(res.data.products);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load inventory summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories?isActive=true');
        if (res.data.success) setCategories(res.data.categories);
      } catch (err) {}
    };
    fetchCats();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [page, category, stockStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Inventory & Stock Valuation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time stock ledger, valuation at cost and retail, and reorder levels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/inventory/adjustments"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <History className="w-3.5 h-3.5" />
            Movement Ledger
          </Link>
          {isAdminOrManager && (
            <button
              onClick={() => {
                setSelectedProduct(null);
                setAdjustModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Adjust Stock
            </button>
          )}
        </div>
      </div>

      {/* Valuation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Stock Qty</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary?.totalStockQty || 0} units</p>
          <span className="text-[10px] text-slate-400">{summary?.totalProducts || 0} unique SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Cost Valuation (COGS)</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">
            {formatCurrency(summary?.totalCostValuation, symbol)}
          </p>
          <span className="text-[10px] text-slate-400">Total investment value</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Retail Valuation</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(summary?.totalRetailValuation, symbol)}
          </p>
          <span className="text-[10px] text-slate-400">Potential sales revenue</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Alerted Items</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-rose-600">{summary?.outOfStockCount || 0} Out</span>
            <span className="text-slate-300">•</span>
            <span className="text-sm font-bold text-amber-600">{summary?.lowStockCount || 0} Low</span>
          </div>
          <span className="text-[10px] text-slate-400">Needs reorder soon</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Stock Statuses</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
              <option value="in_stock">In Stock (&gt; Threshold)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Filter Inventory
            </button>
          </div>
        </form>
      </div>

      {/* Stock Levels Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Total Cost Value</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Alert Threshold</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading stock levels...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const badge = getStockBadge(p.currentStock, p.lowStockThreshold);
                  const totalCostVal = (p.currentStock || 0) * (p.purchaseCost || 0);
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.sku}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category?.name || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(p.purchaseCost, symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(totalCostVal, symbol)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {p.lowStockThreshold} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdminOrManager && (
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-semibold text-[11px] transition"
                          >
                            Adjust Stock
                          </button>
                        )}
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
              Page {page} of {totalPages} ({total} products)
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

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        product={selectedProduct}
        products={products}
        onAdjustmentSuccess={() => fetchInventory()}
      />
    </div>
  );
};

export default InventoryPage;
