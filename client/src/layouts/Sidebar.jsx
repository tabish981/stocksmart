import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Layers,
  ArrowLeftRight,
  Truck,
  RotateCcw,
  Users,
  Building2,
  FolderTree,
  CreditCard,
  BarChart3,
  DollarSign,
  UserCog,
  Settings,
  X,
  Store,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, store } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS Billing', path: '/pos', icon: ShoppingCart, highlight: true },
    { name: 'Sales Invoices', path: '/sales', icon: Receipt },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Inventory & Stock', path: '/inventory', icon: Layers },
    { name: 'Stock Adjustments', path: '/inventory/adjustments', icon: ArrowLeftRight },
    { name: 'Purchases', path: '/purchases', icon: Truck },
    { name: 'Returns & Refunds', path: '/returns', icon: RotateCcw },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Building2 },
    { name: 'Categories', path: '/categories', icon: FolderTree },
    { name: 'Payments Ledger', path: '/payments', icon: CreditCard },
    { name: 'Reports & P&L', path: '/reports', icon: BarChart3 },
    { name: 'Expenses', path: '/expenses', icon: DollarSign },
    ...(isManager ? [{ name: 'User Management', path: '/users', icon: UserCog }] : []),
    ...(isAdmin ? [{ name: 'Store Settings', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">StockSmart</span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wider block uppercase">Retail & POS</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Name Badge */}
        <div className="px-4 py-3 mx-3 my-2 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{store?.name || 'StockSmart Store'}</p>
            <p className="text-[11px] text-slate-400">{store?.currency?.symbol || '₹'} INR Active</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? item.highlight
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                        : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : item.highlight
                      ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-indigo-400' : ''}`} />
                <span>{item.name}</span>
                {item.highlight && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    POS
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card Bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
