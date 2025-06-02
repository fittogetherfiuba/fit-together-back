const express = require('express');
const router = express.Router();
const { setGoals, getGoals } = require('../controllers/goalsController');

router.post('', setGoals)
router.get('/:userId', getGoals)

module.exports = router;