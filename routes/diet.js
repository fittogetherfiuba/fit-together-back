const express = require('express');
const router = express.Router();
const { addUsersDietProfile } = require('../controllers/dietController');

router.post('/', addUsersDietProfile)

module.exports = router;