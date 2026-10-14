const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Expense = require('../models/Expense');

// Helper to get start and end of day
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @desc    Get real-time Dashboard overview statistics
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const storeId = req.storeId;
    const { start: todayStart, end: todayEnd } = getTodayRange();

    // 1. Parallel queries for maximum speed
    const [
      products,
      todaySales,
      todayPurchases,
      customersWithDues,
      suppliersWithDues,
      recentSales,
      recentPurchases,
    ] = await Promise.all([
      Product.find({ store: storeId, isActive: true }),
      Sale.find({
        store: storeId,
        status: { $ne: 'cancelled' },
        saleDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Purchase.find({
        store: storeId,
        status: { $ne: 'cancelled' },
        purchaseDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Customer.aggregate([
        { $match: { store: storeId, outstandingBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
      ]),
      Supplier.aggregate([
        { $match: { store: storeId, outstandingBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
      ]),
      Sale.find({ store: storeId })
        .populate('customer', 'name phone')
        .sort({ saleDate: -1 })
        .limit(5),
      Purchase.find({ store: storeId })
        .populate('supplier', 'companyName')
        .sort({ purchaseDate: -1 })
        .limit(5),
    ]);

    // Product & Inventory metrics
    let totalProducts = products.length;
    let totalStockQuantity = 0;
    let stockCostValuation = 0;
    let stockRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockAlerts = [];

    products.forEach((p) => {
      const stock = p.currentStock || 0;
      totalStockQuantity += stock;
      stockCostValuation += stock * (p.purchaseCost || 0);
      stockRetailValuation += stock * (p.sellingPrice || 0);

      if (stock <= 0) {
        outOfStockCount++;
        lowStockAlerts.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          stock,
          threshold: p.lowStockThreshold,
          status: 'out_of_stock',
        });
      } else if (stock <= p.lowStockThreshold) {
        lowStockCount++;
        lowStockAlerts.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          stock,
          threshold: p.lowStockThreshold,
          status: 'low_stock',
        });
      }
    });

    // Today's Sales metrics
    let todaySalesRevenue = 0;
    let todayGrossProfit = 0;
    let todaySalesCount = todaySales.length;

    todaySales.forEach((s) => {
      todaySalesRevenue += s.grandTotal || 0;
      todayGrossProfit += s.totalProfit || 0;
    });

    // Today's Purchases metrics
    let todayPurchaseValue = 0;
    todayPurchases.forEach((p) => {
      todayPurchaseValue += p.grandTotal || 0;
    });

    // Outstanding customer & supplier dues
    const customerReceivables = customersWithDues[0]?.total || 0;
    const supplierPayables = suppliersWithDues[0]?.total || 0;

    // 7-day Sales & Profit chart data
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const daySales = await Sale.find({
        store: storeId,
        status: { $ne: 'cancelled' },
        saleDate: { $gte: dayStart, $lte: dayEnd },
      });

      const dayPurchases = await Purchase.find({
        store: storeId,
        status: { $ne: 'cancelled' },
        purchaseDate: { $gte: dayStart, $lte: dayEnd },
      });

      let dayRevenue = 0;
      let dayProfit = 0;
      let dayPurchaseTotal = 0;

      daySales.forEach((s) => {
        dayRevenue += s.grandTotal || 0;
        dayProfit += s.totalProfit || 0;
      });

      dayPurchases.forEach((p) => {
        dayPurchaseTotal += p.grandTotal || 0;
      });

      const dayLabel = dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      chartData.push({
        date: dayLabel,
        sales: Math.round(dayRevenue),
        profit: Math.round(dayProfit),
        purchases: Math.round(dayPurchaseTotal),
      });
    }

    // Top selling products (all time or last 30 days)
    const topProducts = await Sale.aggregate([
      { $match: { store: storeId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        totalStockQuantity,
        stockCostValuation: Math.round(stockCostValuation * 100) / 100,
        stockRetailValuation: Math.round(stockRetailValuation * 100) / 100,
        todaySalesRevenue: Math.round(todaySalesRevenue * 100) / 100,
        todayGrossProfit: Math.round(todayGrossProfit * 100) / 100,
        todaySalesCount,
        todayPurchaseValue: Math.round(todayPurchaseValue * 100) / 100,
        todayPurchasesCount: todayPurchases.length,
        customerReceivables: Math.round(customerReceivables * 100) / 100,
        supplierPayables: Math.round(supplierPayables * 100) / 100,
        lowStockCount,
        outOfStockCount,
      },
      chartData,
      topProducts,
      recentSales,
      recentPurchases,
      lowStockAlerts: lowStockAlerts.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Sales Report
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const query = { store: req.storeId, status: { $ne: 'cancelled' } };

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    const sales = await Sale.find(query).sort({ saleDate: -1 });

    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    const paymentBreakdown = { cash: 0, upi: 0, card: 0, credit: 0, mixed: 0 };

    sales.forEach((s) => {
      totalRevenue += s.grandTotal || 0;
      totalTax += s.taxAmount || 0;
      totalDiscount += s.discountAmount || 0;
      totalProfit += s.totalProfit || 0;

      if (paymentBreakdown[s.paymentMethod] !== undefined) {
        paymentBreakdown[s.paymentMethod] += s.grandTotal || 0;
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalSalesCount: sales.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        paymentBreakdown,
      },
      sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Profit & Loss Report (COGS based)
// @route   GET /api/reports/profit-loss
// @access  Private
const getProfitLossReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const saleQuery = { store: req.storeId, status: { $ne: 'cancelled' } };
    const expenseQuery = { store: req.storeId };

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      saleQuery.saleDate = dateFilter;
      expenseQuery.date = dateFilter;
    }

    const [sales, expenses] = await Promise.all([
      Sale.find(saleQuery),
      Expense.find(expenseQuery),
    ]);

    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalGrossProfit = 0;

    sales.forEach((s) => {
      totalSalesRevenue += s.grandTotal || 0;
      s.items.forEach((itm) => {
        totalCostOfGoodsSold += (itm.purchaseCost || 0) * (itm.quantity || 0);
      });
      totalGrossProfit += s.totalProfit || 0;
    });

    let totalOperatingExpenses = 0;
    const expensesByCategory = {};

    expenses.forEach((e) => {
      totalOperatingExpenses += e.amount || 0;
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
    });

    const netProfit = totalGrossProfit - totalOperatingExpenses;

    res.status(200).json({
      success: true,
      report: {
        totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
        totalCostOfGoodsSold: Math.round(totalCostOfGoodsSold * 100) / 100,
        totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
        grossMarginPercentage: totalSalesRevenue > 0 ? Math.round((totalGrossProfit / totalSalesRevenue) * 10000) / 100 : 0,
        totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        netMarginPercentage: totalSalesRevenue > 0 ? Math.round((netProfit / totalSalesRevenue) * 10000) / 100 : 0,
        expensesByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getSalesReport,
  getProfitLossReport,
};
