const express = require('express');
const router = express.Router();
const {
  getPayments,
  recordCustomerPayment,
  recordSupplierPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getPayments);
router.post('/customer', recordCustomerPayment);
router.post('/supplier', authorize('admin', 'manager'), recordSupplierPayment);

module.exports = router;
