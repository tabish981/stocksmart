const express = require('express');
const router = express.Router();
const {
  getInventorySummary,
  getInventoryLedger,
  adjustStock,
  getStockAlerts,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getInventorySummary);
router.get('/ledger', getInventoryLedger);
router.get('/alerts', getStockAlerts);
router.post('/adjust', authorize('admin', 'manager'), adjustStock);

module.exports = router;
