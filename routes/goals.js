const express = require('express');
const router = express.Router();
const { setGoals, getGoals, markGoalNotified, deleteGoal } = require('../controllers/goalsController');

router.post('', setGoals)
router.get('/:userId', getGoals)
router.post('/mark-notified', markGoalNotified);
router.delete('', deleteGoal);

module.exports = router;