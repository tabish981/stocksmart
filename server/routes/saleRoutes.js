const express = require('express');
const router = express.Router();
const {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
} = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.post('/:id/cancel', authorize('admin', 'manager'), cancelSale);

module.exports = router;
