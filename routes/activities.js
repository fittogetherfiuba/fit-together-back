const express = require('express');
const router = express.Router();
const { getDoneActivities , addDoneActivity, getActivities, getDoneActivitiesThisWeek} = require('../controllers/activitiesController');
const { route } = require('./users');

router.get('/entry/:userId', getDoneActivities)
router.post('/entry', addDoneActivity)
router.get('', getActivities)
router.get('/since-last-monday', getDoneActivitiesThisWeek)


module.exports = router;