const express = require('express');
const router = express.Router();
const { addUsersDietProfile, getDietProfiles, getUsersDietProfile} = require('../controllers/dietController');

router.post('/', addUsersDietProfile)
router.get('/', getDietProfiles)
router.get('/:userId', getUsersDietProfile)

module.exports = router;