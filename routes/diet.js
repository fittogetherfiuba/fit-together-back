const express = require('express');
const router = express.Router();
const { addUsersDietProfile, 
    getDietProfiles, 
    getUsersDietProfile, 
    getDietProfileOfFood, 
    getDietProfileOfListedFoods,
    createDietProfile,
    deleteUsersDietProfile
    } = require('../controllers/dietController');

router.post('/', addUsersDietProfile)
router.get('/', getDietProfiles)
router.get('/:userId', getUsersDietProfile)
router.get('/profile-of-food/:food', getDietProfileOfFood)
router.get('/profile-of-food', getDietProfileOfListedFoods)
router.post('/profiles/:userId', createDietProfile)
router.delete('/:userId', deleteUsersDietProfile)

module.exports = router;