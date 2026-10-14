import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getStockBadge } from '../utils/formatters';
import AddEditProductModal from '../components/AddEditProductModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Barcode,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProductsPage = () => {
  const { store, user } = useAuth();
  const symbol = store?.currency?.symbol || '₹';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        ...(search && { search }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(stockStatus && { stockStatus }),
      });

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.products);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, supRes] = await Promise.all([
          api.get('/categories?isActive=true'),
          api.get('/suppliers?isActive=true'),
        ]);
        if (catRes.data.success) setCategories(catRes.data.categories);
        if (supRes.data.success) setSuppliers(supRes.data.suppliers);
      } catch (err) {
        // silent
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, stockStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate '${name}'?`)) return;

    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('stocksmart_token');
      const response = await fetch('/api/products/export-csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stocksmart_products_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Products exported to CSV!');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      toast.error('Please paste or upload CSV text');
      return;
    }

    try {
      setImporting(true);
      // Parse CSV text into objects
      const lines = importCsvText.trim().split(/\r?\n/);
      if (lines.length < 2) {
        toast.error('CSV must contain a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        parsedRows.push(rowObj);
      }

      const res = await api.post('/products/import-csv', { products: parsedRows });
      if (res.data.success) {
        toast.success(res.data.message);
        setImportModalOpen(false);
        setImportCsvText('');
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your inventory items, pricing, barcodes, and stock levels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
          )}
          {isAdminOrManager && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
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
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; Threshold)</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Search Products
            </button>
          </div>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Tax</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading inventory items...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const badge = getStockBadge(product.currentStock, product.lowStockThreshold);
                  return (
                    <tr key={product._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                        {product.brand && <span className="text-[10px] text-slate-400">{product.brand}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <p className="font-semibold">{product.sku}</p>
                        {product.barcode && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Barcode className="w-3 h-3" /> {product.barcode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {product.category?.name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(product.purchaseCost, symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(product.sellingPrice, symbol)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">{product.taxRate}%</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                            {product.currentStock} {product.unit}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{badge.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {isAdminOrManager && (
                          <>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id, product.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete or Deactivate Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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
              Showing page {page} of {totalPages} ({total} products)
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

      {/* Add / Edit Product Modal */}
      <AddEditProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        onSaveSuccess={() => fetchProducts()}
        categories={categories}
        suppliers={suppliers}
      />

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Bulk Import Products (CSV)</h3>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste CSV text with column headers: <code>Product Name,SKU,Barcode,Category,Unit,Purchase Cost,Selling Price,Current Stock</code>
            </p>

            <textarea
              rows="6"
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder={`Product Name,SKU,Barcode,Category,Unit,Purchase Cost,Selling Price,Current Stock\nSony WH-1000XM5,SONY-XM5,890123456999,Smartphones & Accessories,pcs,18000,24990,10`}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={importing || !importCsvText.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {importing ? 'Importing Products...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
