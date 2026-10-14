import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  Users,
  Building2,
  Receipt,
  Truck,
  ArrowUpRight,
  ShoppingCart,
  Layers,
  RefreshCw,
  Coins,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { store } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data?.stats || {};
  const chartData = data?.chartData || [];
  const symbol = store?.currency?.symbol || '₹';

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading live business analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Store Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview & Performance</h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1">
            Real-time sales, inventory valuation, and stock alerts for {store?.name}.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            to="/pos"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/40 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            Open POS Register
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-slate-900">{formatCurrency(stats.todaySalesRevenue, symbol)}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.todaySalesCount || 0} order(s) today</p>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gross Profit</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-indigo-600">{formatCurrency(stats.todayGrossProfit, symbol)}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">COGS calculated</p>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stock Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-slate-900">{formatCurrency(stats.stockCostValuation, symbol)}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Retail: {formatCurrency(stats.stockRetailValuation, symbol)}</p>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Products</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-slate-900">{stats.totalProducts || 0}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalStockQuantity || 0} units total</p>
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Customer Dues</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-amber-600">{formatCurrency(stats.customerReceivables, symbol)}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Receivables balance</p>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Supplier Dues</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-bold text-rose-600">{formatCurrency(stats.supplierPayables, symbol)}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Payables balance</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales & Gross Profit (Last 7 Days)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily trend of revenue vs estimated gross profit</p>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`₹${val}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales Revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Gross Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock & Out of Stock Alerts Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Low Stock Alerts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Items needing immediate restocking</p>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-72">
            {(data?.lowStockAlerts || []).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                All products are comfortably above thresholds.
              </div>
            ) : (
              data.lowStockAlerts.map((item) => (
                <div key={item._id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      item.stock <= 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {item.stock <= 0 ? 'Out of Stock' : `${item.stock} left`}
                  </span>
                </div>
              ))
            )}
          </div>

          <Link
            to="/purchases"
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs text-center border border-slate-200 transition"
          >
            Create Purchase Order
          </Link>
        </div>
      </div>

      {/* Tables: Recent Sales & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Sales</h3>
              <p className="text-xs text-slate-400">Latest completed customer invoices</p>
            </div>
            <Link to="/sales" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              All Sales <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Method</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentSales || []).map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 font-semibold text-indigo-600">{sale.invoiceNumber}</td>
                    <td className="py-2.5 text-slate-700 truncate max-w-[120px]">{sale.customerName || 'Walk-in'}</td>
                    <td className="py-2.5">
                      <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(sale.grandTotal, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Best Selling Products</h3>
              <p className="text-xs text-slate-400">Ranked by overall sold units</p>
            </div>
            <Link to="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Products <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {(data?.topProducts || []).map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-800 truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</p>
                  </div>
                </div>
                <div className="text-right pl-3">
                  <p className="text-xs font-bold text-slate-900">{prod.totalQuantity} units</p>
                  <p className="text-[10px] text-slate-400">{formatCurrency(prod.totalRevenue, symbol)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
