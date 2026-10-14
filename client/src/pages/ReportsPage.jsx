import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Printer,
  ShoppingBag,
  CreditCard,
  Building,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const ReportsPage = () => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [activeTab, setActiveTab] = useState('profit-loss'); // 'profit-loss' or 'sales'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plData, setPlData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const [plRes, salesRes] = await Promise.all([
        api.get(`/reports/profit-loss?${params.toString()}`),
        api.get(`/reports/sales?${params.toString()}`),
      ]);

      if (plRes.data.success) setPlData(plRes.data.report);
      if (salesRes.data.success) setSalesData(salesRes.data);
    } catch (err) {
      toast.error('Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const paymentChartData = salesData?.summary?.paymentBreakdown
    ? Object.entries(salesData.summary.paymentBreakdown)
        .filter(([_, val]) => val > 0)
        .map(([key, val]) => ({
          name: key.toUpperCase(),
          value: Math.round(val),
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Reports & P&L Statement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Documented COGS costing, Gross Profit, Operating Expenses, and Net Margins
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Filters & Tab Navigation */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('profit-loss')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'profit-loss'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profit & Loss (P&L) Statement
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'sales' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Breakdown & Payment Channels
          </button>
        </div>

        {/* Date Filter Inputs */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Range:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 font-semibold hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PROFIT AND LOSS STATEMENT */}
      {activeTab === 'profit-loss' && (
        <div className="space-y-6">
          {/* Top 4 Financial Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gross Sales Revenue
              </span>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {formatCurrency(plData?.totalSalesRevenue, symbol)}
              </p>
              <span className="text-[11px] text-slate-400">Top-line turnover</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cost of Goods Sold (COGS)
              </span>
              <p className="text-2xl font-black text-indigo-700 mt-2">
                {formatCurrency(plData?.totalCostOfGoodsSold, symbol)}
              </p>
              <span className="text-[11px] text-slate-400">Product procurement costs</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gross Profit (Margin: {plData?.grossMarginPercentage || 0}%)
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {formatCurrency(plData?.totalGrossProfit, symbol)}
              </p>
              <span className="text-[11px] text-emerald-700 font-medium">Revenue minus COGS</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Net Profit (Margin: {plData?.netMarginPercentage || 0}%)
              </span>
              <p
                className={`text-2xl font-black mt-2 ${
                  (plData?.netProfit || 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(plData?.netProfit, symbol)}
              </p>
              <span className="text-[11px] text-slate-400">After operating expenses</span>
            </div>
          </div>

          {/* Formal P&L Statement Card */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">
                Income Statement (Profit & Loss Breakdown)
              </h2>
              <p className="text-xs text-slate-500">
                Calculated using actual cost of goods sold deducted at time of sale
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Revenue */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 font-semibold text-slate-900 text-sm">
                <span>1. Total Sales Revenue (A)</span>
                <span>{formatCurrency(plData?.totalSalesRevenue, symbol)}</span>
              </div>

              {/* COGS */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600 pl-4">
                <span>Less: Cost of Goods Sold (Purchase Cost Basis)</span>
                <span className="text-rose-600 font-semibold">
                  -{formatCurrency(plData?.totalCostOfGoodsSold, symbol)}
                </span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50 text-emerald-950 font-bold text-sm">
                <span>2. Gross Profit = (Revenue - COGS)</span>
                <span>{formatCurrency(plData?.totalGrossProfit, symbol)}</span>
              </div>

              {/* Operating Expenses Breakdown */}
              <div className="pt-2">
                <div className="flex justify-between items-center py-2 font-semibold text-slate-800">
                  <span>3. Operating & Administrative Expenses</span>
                  <span className="text-rose-600 font-bold">
                    -{formatCurrency(plData?.totalOperatingExpenses, symbol)}
                  </span>
                </div>
                <div className="pl-6 space-y-2 text-slate-500">
                  {plData?.expensesByCategory && Object.keys(plData.expensesByCategory).length > 0 ? (
                    Object.entries(plData.expensesByCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between">
                        <span>• {cat} Expense</span>
                        <span>{formatCurrency(amt, symbol)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400">No operational expenses recorded for this period.</p>
                  )}
                </div>
              </div>

              {/* Net Profit Final Row */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-indigo-900 text-white font-extrabold text-base shadow-md">
                <span>NET PROFIT (BOTTOM LINE)</span>
                <span>{formatCurrency(plData?.netProfit, symbol)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES & PAYMENT METHODS */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Breakdown Pie Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center">
            <h3 className="font-bold text-sm text-slate-900 mb-1 w-full text-left">
              Payment Method Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-4 w-full text-left">
              Revenue collection share across Cash, UPI, Card, and Credit
            </p>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={paymentChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`₹${val}`, 'Revenue']} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Performance Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Sales Summary Overview</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="text-slate-500 font-medium">Completed Transactions</span>
                <span className="font-bold text-slate-900">{salesData?.summary?.totalSalesCount || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="text-slate-500 font-medium">Total Taxes Collected (GST)</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(salesData?.summary?.totalTax, symbol)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="text-slate-500 font-medium">Total Discounts Given</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(salesData?.summary?.totalDiscount, symbol)}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-2xl flex justify-between">
                <span className="text-indigo-900 font-bold">Total Sales Turnover</span>
                <span className="font-extrabold text-indigo-950">
                  {formatCurrency(salesData?.summary?.totalRevenue, symbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
