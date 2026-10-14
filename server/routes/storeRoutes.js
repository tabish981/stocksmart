const express = require('express');
const router = express.Router();
const { getCurrentStore, updateStore } = require('../controllers/storeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/current', getCurrentStore);
router.put('/current', authorize('admin'), updateStore);

module.exports = router;
