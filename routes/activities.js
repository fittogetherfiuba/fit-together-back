const express = require('express');
const router = express.Router();
const { getDoneActivities , addDoneActivity, getActivities, getDoneActivitiesThisWeek, getTypeCativities} = require('../controllers/activitiesController');
const { route } = require('./users');

router.get('/entry/:userId', getDoneActivities)
router.post('/entry', addDoneActivity)
router.get('', getActivities)
router.get('/since-last-monday', getDoneActivitiesThisWeek)
router.get('/type', getTypeCativities)


module.exports = router;