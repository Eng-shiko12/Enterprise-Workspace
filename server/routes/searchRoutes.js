const express = require('express');
const { globalSearch } = require('../controllers/searchController');
const Auth = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(Auth);
router.get('/', globalSearch);

module.exports = router;
