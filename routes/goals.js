const express = require('express');
const router = express.Router();
const { setGoals, getGoals, markGoalNotified } = require('../controllers/goalsController');

router.post('', setGoals)
router.get('/:userId', getGoals)
router.post('/mark-notified', markGoalNotified);

module.exports = router;