const express = require('express');
const router = express.Router();
const { getReturns, processSaleReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getReturns);
router.post('/sale', authorize('admin', 'manager'), processSaleReturn);

module.exports = router;
