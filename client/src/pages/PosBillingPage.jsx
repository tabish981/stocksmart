import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import InvoiceModal from '../components/InvoiceModal';
import confetti from 'canvas-confetti';
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  Receipt,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PosBillingPage = () => {
  const { store } = useAuth();
  const symbol = store?.currency?.symbol || '₹';

  // Product search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [allProducts, setAllProducts] = useState([]);

  // Cart state
  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchInputRef = useRef(null);

  // Fetch initial products, categories, customers
  useEffect(() => {
    const initData = async () => {
      try {
        const [prodRes, catRes, custRes] = await Promise.all([
          api.get('/products?limit=50&isActive=true'),
          api.get('/categories?isActive=true'),
          api.get('/customers?isActive=true'),
        ]);

        if (prodRes.data.success) {
          setAllProducts(prodRes.data.products);
          setSearchResults(prodRes.data.products.slice(0, 12));
        }
        if (catRes.data.success) setCategories(catRes.data.categories);
        if (custRes.data.success) setCustomers(custRes.data.customers);
      } catch (err) {
        toast.error('Failed to initialize POS items');
      }
    };
    initData();
  }, []);

  // Filter products when typing or category changes
  useEffect(() => {
    let filtered = allProducts;

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category?._id === selectedCategory || p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    setSearchResults(filtered.slice(0, 16));
  }, [searchQuery, selectedCategory, allProducts]);

  // Handle hardware barcode scan or enter key on search input
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(searchQuery.trim())}`);
      if (res.data.success && res.data.product) {
        addToCart(res.data.product);
        setSearchQuery('');
        toast.success(`Added: ${res.data.product.name}`);
      }
    } catch (err) {
      // Fallback: check if exact match exists in loaded list
      const match = allProducts.find(
        (p) =>
          p.barcode === searchQuery.trim() || p.sku.toUpperCase() === searchQuery.trim().toUpperCase()
      );
      if (match) {
        addToCart(match);
        setSearchQuery('');
        toast.success(`Added: ${match.name}`);
      } else {
        toast.error(`No product found with barcode or SKU '${searchQuery}'`);
      }
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    if (product.currentStock <= 0 && !store?.settings?.allowNegativeStock) {
      toast.error(`'${product.name}' is currently out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        if (
          existing.quantity + 1 > product.currentStock &&
          !store?.settings?.allowNegativeStock
        ) {
          toast.error(`Only ${product.currentStock} units available in stock!`);
          return prev;
        }
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            _id: product._id,
            name: product.name,
            sku: product.sku,
            unitPrice: product.sellingPrice,
            purchaseCost: product.purchaseCost,
            currentStock: product.currentStock,
            unit: product.unit,
            taxRate: product.taxRate || 0,
            quantity: 1,
            discount: 0,
          },
        ];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.currentStock && !store?.settings?.allowNegativeStock) {
              toast.error(`Maximum available stock is ${item.currentStock}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Update item discount
  const updateItemDiscount = (productId, discountVal) => {
    const num = Math.max(0, Number(discountVal) || 0);
    setCart((prev) =>
      prev.map((item) => (item._id === productId ? { ...item, discount: num } : item))
    );
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  // Calculate Subtotal, Taxes, and Grand Total
  let subtotal = 0;
  let taxTotal = 0;

  cart.forEach((item) => {
    const lineBase = Math.max(0, item.unitPrice * item.quantity - item.discount);
    const lineTax = (lineBase * item.taxRate) / 100;
    subtotal += lineBase;
    taxTotal += lineTax;
  });

  const numBillDiscount = Math.max(0, Number(billDiscount) || 0);
  const grandTotal = Math.max(0, subtotal + taxTotal - numBillDiscount);
  const numAmountReceived = Number(amountReceived) || 0;
  const changeDue = Math.max(0, numAmountReceived - grandTotal);
  const balanceDue = Math.max(0, grandTotal - numAmountReceived);

  // Complete checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add products before checkout.');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Please select a registered customer for credit / on-account sale.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        customerId: selectedCustomer ? selectedCustomer._id : null,
        customerName: selectedCustomer ? selectedCustomer.name : walkinName || 'Walk-in Customer',
        customerPhone: selectedCustomer ? selectedCustomer.phone : walkinPhone || '',
        items: cart.map((i) => ({
          productId: i._id,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        billDiscount: numBillDiscount,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? numAmountReceived : grandTotal,
        paymentDetails: {
          cashAmount: paymentMethod === 'cash' ? numAmountReceived : 0,
          upiAmount: paymentMethod === 'upi' ? grandTotal : 0,
          cardAmount: paymentMethod === 'card' ? grandTotal : 0,
        },
        notes: paymentNotes,
      };

      const res = await api.post('/sales', payload);

      if (res.data.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success(`Sale completed! Invoice: ${res.data.sale.invoiceNumber}`);
        setCompletedSale(res.data.sale);
        setInvoiceModalOpen(true);

        // Reset Cart
        setCart([]);
        setBillDiscount(0);
        setAmountReceived('');
        setPaymentNotes('');
        setSelectedCustomer(null);
        setWalkinName('');
        setWalkinPhone('');

        // Refresh product stock list in background
        const prodRes = await api.get('/products?limit=50&isActive=true');
        if (prodRes.data.success) {
          setAllProducts(prodRes.data.products);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed. Please check product stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)] min-h-[600px]">
      {/* LEFT: Product Catalog & Search (60%) */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 flex flex-col min-w-0 overflow-hidden">
        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="flex gap-2 mb-4">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan Barcode or Search product by name / SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </form>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition border border-indigo-200/60"
            title="Open Camera Barcode Scanner"
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Camera Scan</span>
          </button>
        </div>

        {/* Category Pills Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              !selectedCategory
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat._id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {searchResults.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Package className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">No matching products found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword or barcode</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {searchResults.map((product) => {
                const isOutOfStock = product.currentStock <= 0;
                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock && !store?.settings?.allowNegativeStock}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition group relative ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200/80 hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">
                          {product.sku}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : product.currentStock <= product.lowStockThreshold
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {product.currentStock} {product.unit}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-2">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {formatCurrency(product.sellingPrice, symbol)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: POS Register Cart & Checkout (40%) */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between overflow-hidden">
        {/* Customer Selector / Walk-in Toggle */}
        <div className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Customer Details
            </span>
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[11px] text-rose-600 font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {selectedCustomer ? (
            <div className="p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-indigo-950">{selectedCustomer.name}</p>
                <p className="text-[11px] text-indigo-700">{selectedCustomer.phone || 'No phone'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Dues</span>
                <p className="font-bold text-rose-600">{formatCurrency(selectedCustomer.outstandingBalance, symbol)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                onChange={(e) => {
                  const cust = customers.find((c) => c._id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                defaultValue=""
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Select Existing Customer (or Walk-in) --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.phone || 'No phone'}) - Balance: {symbol}{c.outstandingBalance}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Walk-in Name (Optional)"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="text"
                  placeholder="Phone (Optional)"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[140px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-8">
              <ShoppingCart className="w-8 h-8 mb-1.5 opacity-40" />
              <p className="text-xs font-semibold text-slate-600">Cart is empty</p>
              <p className="text-[11px] text-slate-400">Scan or select items from catalog</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item._id}
                className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatCurrency(item.unitPrice, symbol)} each • Tax: {item.taxRate}%
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 px-1.5 py-0.5">
                  <button
                    onClick={() => updateQuantity(item._id, -1)}
                    className="p-1 text-slate-500 hover:text-slate-800 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-xs min-w-[18px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item._id, 1)}
                    className="p-1 text-slate-500 hover:text-slate-800 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="text-right flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {formatCurrency(item.unitPrice * item.quantity - item.discount, symbol)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Payment Options */}
        <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
          {/* Subtotal, Tax, Discount */}
          <div className="space-y-1 text-slate-500">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span>{formatCurrency(subtotal, symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tax (GST)</span>
              <span>{formatCurrency(taxTotal, symbol)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bill Discount ({symbol})</span>
              <input
                type="number"
                min="0"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
                className="w-20 px-2 py-0.5 text-right font-medium rounded-lg border border-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Grand Total Highlight */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider">Net Payable</span>
              <p className="text-xl font-extrabold text-indigo-900 leading-tight">
                {formatCurrency(grandTotal, symbol)}
              </p>
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold">{cart.length} item(s)</span>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-1.5 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'cash'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`p-1.5 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'upi'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              UPI
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-1.5 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'card'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit')}
              className={`p-1.5 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                paymentMethod === 'credit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Credit
            </button>
          </div>

          {/* Cash Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Cash Received:</span>
                <input
                  type="number"
                  placeholder={String(Math.ceil(grandTotal))}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-24 px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs"
                />
              </div>
              {numAmountReceived >= grandTotal && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Change:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(changeDue, symbol)}</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing Billing...' : `Confirm & Bill ${formatCurrency(grandTotal, symbol)}`}
            <Receipt className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={async (barcode) => {
          try {
            const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
            if (res.data.success && res.data.product) {
              addToCart(res.data.product);
            }
          } catch (err) {
            toast.error(`Unrecognized barcode: ${barcode}`);
          }
        }}
      />

      {/* Tax Invoice Modal for Printing & PDF */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        sale={completedSale}
        store={store}
      />
    </div>
  );
};

export default PosBillingPage;
