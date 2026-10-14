import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { Building2, Plus, Search, Phone, Mail, DollarSign, RefreshCw, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const SuppliersPage = () => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutSupplier, setPayoutSupplier] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [payoutRef, setPayoutRef] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    gstin: '',
    paymentTerms: 'Net 30 Days',
    openingBalance: '0',
    notes: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/suppliers?${search ? `search=${encodeURIComponent(search)}` : ''}`);
      if (res.data.success) {
        setSuppliers(res.data.suppliers);
      }
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenModal = (sup = null) => {
    if (sup) {
      setEditingSupplier(sup);
      setFormData({
        name: sup.name,
        companyName: sup.companyName,
        phone: sup.phone || '',
        email: sup.email || '',
        gstin: sup.gstin || '',
        paymentTerms: sup.paymentTerms || 'Net 30 Days',
        openingBalance: '0',
        notes: sup.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        companyName: '',
        phone: '',
        email: '',
        gstin: '',
        paymentTerms: 'Net 30 Days',
        openingBalance: '0',
        notes: '',
      });
    }
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.companyName.trim() || !formData.phone.trim()) {
      toast.error('Contact name, company name, and phone are required');
      return;
    }

    try {
      if (editingSupplier) {
        const res = await api.put(`/suppliers/${editingSupplier._id}`, formData);
        if (res.data.success) {
          toast.success('Supplier updated successfully');
          setSupplierModalOpen(false);
          fetchSuppliers();
        }
      } else {
        const res = await api.post('/suppliers', formData);
        if (res.data.success) {
          toast.success('Supplier created successfully');
          setSupplierModalOpen(false);
          fetchSuppliers();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    const num = Number(payoutAmount);
    if (!num || num <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }

    try {
      const res = await api.post('/payments/supplier', {
        supplierId: payoutSupplier._id,
        amount: num,
        paymentMethod: payoutMethod,
        referenceNumber: payoutRef,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setPayoutModalOpen(false);
        setPayoutAmount('');
        setPayoutRef('');
        setPayoutSupplier(null);
        fetchSuppliers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payout failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Suppliers & Vendors</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your suppliers, vendor accounts, outstanding payables, and terms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuppliers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by company name, contact person, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone & Email</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{sup.companyName}</p>
                      {sup.gstin && <span className="text-[10px] text-slate-400 font-mono">GST: {sup.gstin}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{sup.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {sup.phone}
                      </p>
                      {sup.email && (
                        <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" /> {sup.email}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{sup.paymentTerms}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${sup.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                      >
                        {formatCurrency(sup.outstandingBalance, symbol)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {sup.outstandingBalance > 0 && (
                        <button
                          onClick={() => {
                            setPayoutSupplier(sup);
                            setPayoutAmount(String(sup.outstandingBalance));
                            setPayoutModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition"
                        >
                          Record Payout
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModal(sup)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[11px] transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingSupplier ? 'Edit Supplier Profile' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setSupplierModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Apex Electronics Dist."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vikas Aggarwal"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98234 56789"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@vendor.com"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="29AABCA1234D1ZP"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="15 Days">15 Days</option>
                    <option value="Immediate">Immediate / Advance</option>
                  </select>
                </div>
              </div>

              {!editingSupplier && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Payable Dues ({symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payout to Supplier Modal */}
      {payoutModalOpen && payoutSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Record Payout to Supplier</h3>
                <p className="text-[11px] text-slate-400">{payoutSupplier.companyName}</p>
              </div>
              <button onClick={() => setPayoutModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayout} className="space-y-3">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex justify-between text-xs">
                <span className="text-rose-700 font-semibold">Total Payable Due:</span>
                <span className="font-extrabold text-rose-900">
                  {formatCurrency(payoutSupplier.outstandingBalance, symbol)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payout Amount ({symbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Reference #</label>
                <input
                  type="text"
                  placeholder="UTR / Cheque Number"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
