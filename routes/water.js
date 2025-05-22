const express = require('express');
const router = express.Router();
const { getWaterConsumedDaily, getWaterConsumedThisWeek , addConsumedWater, getWaterConsumed } = require('../controllers/waterController');

router.get('/daily', getWaterConsumedDaily)
router.get('/since-last-monday', getWaterConsumedThisWeek)
router.post('/entry', addConsumedWater)
router.get('/entries', getWaterConsumed)


module.exports = router;