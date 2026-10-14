import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DollarSign, Plus, Search, Filter, Trash2, RefreshCw, X, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const ExpensesPage = () => {
  const { store, user } = useAuth();
  const symbol = store?.currency?.symbol || '₹';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Rent',
    amount: '',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(category && { category }),
      });
      const res = await api.get(`/expenses?${params.toString()}`);
      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [category]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) {
      toast.error('Title and amount are required');
      return;
    }

    try {
      const res = await api.post('/expenses', formData);
      if (res.data.success) {
        toast.success('Expense recorded successfully');
        setModalOpen(false);
        setFormData({
          title: '',
          category: 'Rent',
          amount: '',
          paymentMethod: 'cash',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchExpenses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      const res = await api.delete(`/expenses/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchExpenses();
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Operating Expenses</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track business overhead costs, rent, utilities, and payroll for accurate Net Profit calculation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExpenses}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-5 rounded-3xl bg-indigo-900 text-white shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Total Operational Outflow
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold mt-1">{formatCurrency(totalExpense, symbol)}</p>
          <span className="text-xs text-indigo-200">{expenses.length} expense entry(ies)</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-700">Filter Category:</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
        >
          <option value="">All Categories</option>
          <option value="Rent">Rent</option>
          <option value="Utilities">Utilities & Electricity</option>
          <option value="Salaries">Salaries & Wages</option>
          <option value="Packaging">Packaging Material</option>
          <option value="Transport">Transport & Logistics</option>
          <option value="Maintenance">Maintenance & Repairs</option>
          <option value="Marketing">Marketing & Ads</option>
          <option value="Office Supplies">Office Supplies</option>
          <option value="Other">Other Expenses</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No operating expenses recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-slate-500">{formatDate(exp.date)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{exp.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] text-slate-600 font-semibold">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                      {formatCurrency(exp.amount, symbol)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{exp.user?.name || 'Admin'}</td>
                    <td className="py-3 px-4 text-right">
                      {isAdminOrManager && (
                        <button
                          onClick={() => handleDelete(exp._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Record Operating Expense</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Shop Space Rent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities & Electricity</option>
                    <option value="Salaries">Salaries & Wages</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Transport">Transport & Logistics</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ({symbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
