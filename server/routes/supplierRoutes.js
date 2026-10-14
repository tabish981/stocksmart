const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', authorize('admin', 'manager'), createSupplier);
router.put('/:id', authorize('admin', 'manager'), updateSupplier);
router.delete('/:id', authorize('admin'), deleteSupplier);

module.exports = router;
