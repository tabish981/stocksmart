import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Building, Receipt, Percent, ShieldCheck, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { store, updateStoreState } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstin: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
    currency: {
      code: 'INR',
      symbol: '₹',
    },
    settings: {
      invoicePrefix: 'INV-',
      purchasePrefix: 'PO-',
      defaultTaxRate: 18,
      lowStockDefaultThreshold: 10,
      invoiceFooterNotes: 'Thank you for your business! Please visit again.',
      termsAndConditions: '1. Goods once sold can be exchanged within 7 days.\n2. Warranty as per manufacturer terms.',
      allowNegativeStock: false,
    },
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        companyName: store.companyName || '',
        email: store.email || '',
        phone: store.phone || '',
        gstin: store.gstin || '',
        address: {
          street: store.address?.street || '',
          city: store.address?.city || '',
          state: store.address?.state || '',
          zipCode: store.address?.zipCode || '',
          country: store.address?.country || 'India',
        },
        currency: {
          code: store.currency?.code || 'INR',
          symbol: store.currency?.symbol || '₹',
        },
        settings: {
          invoicePrefix: store.settings?.invoicePrefix || 'INV-',
          purchasePrefix: store.settings?.purchasePrefix || 'PO-',
          defaultTaxRate: store.settings?.defaultTaxRate !== undefined ? store.settings.defaultTaxRate : 18,
          lowStockDefaultThreshold:
            store.settings?.lowStockDefaultThreshold !== undefined ? store.settings.lowStockDefaultThreshold : 10,
          invoiceFooterNotes:
            store.settings?.invoiceFooterNotes || 'Thank you for your business! Please visit again.',
          termsAndConditions:
            store.settings?.termsAndConditions ||
            '1. Goods once sold can be exchanged within 7 days.\n2. Warranty as per manufacturer terms.',
          allowNegativeStock: !!store.settings?.allowNegativeStock,
        },
      });
    }
  }, [store]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put('/stores/current', formData);
      if (res.data.success) {
        toast.success('Store settings saved successfully!');
        updateStoreState(res.data.store);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update store settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Store Configurations</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure business details, GSTIN, invoice prefixes, and POS defaults
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Profile Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">1. Business Profile & Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Shop Display Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Company / Firm Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (India)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Billing Settings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">2. Billing & Invoicing Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={formData.settings.invoicePrefix}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, invoicePrefix: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={formData.settings.defaultTaxRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, defaultTaxRate: Number(e.target.value) },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                value={formData.settings.lowStockDefaultThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, lowStockDefaultThreshold: Number(e.target.value) },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Footer Greeting</label>
            <input
              type="text"
              value={formData.settings.invoiceFooterNotes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: { ...formData.settings, invoiceFooterNotes: e.target.value },
                })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions</label>
            <textarea
              rows="3"
              value={formData.settings.termsAndConditions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: { ...formData.settings, termsAndConditions: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Saving Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
