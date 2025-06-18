const express = require('express');
const router = express.Router();
const { getDoneActivities,
    addDoneActivity,
    getActivities, 
    getDoneActivitiesThisWeek,
    estimateCaloriesBurned,
    getActivitiesByType,
    getFrequentActivitiesLastMonth
} = require('../controllers/activitiesController');
const { route } = require('./users');

router.get('/entry/:userId', getDoneActivities)
router.post('/entry', addDoneActivity)
router.get('', getActivities)
router.get('/since-last-monday', getDoneActivitiesThisWeek)
router.post('/estimate-calories', estimateCaloriesBurned);
router.get('/entries/frequent', getFrequentActivitiesLastMonth);
router.get('/:type', getActivitiesByType);

module.exports = router;