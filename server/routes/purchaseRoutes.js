const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchaseById,
  createPurchase,
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', authorize('admin', 'manager'), createPurchase);

module.exports = router;
