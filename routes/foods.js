const express = require('express');
const router = express.Router();
const { addConsumedFood, addFood, getUsersConsumedFoods, getUsersCaloriesConsumedDaily, getFoods , getCaloriesConsumedThisWeek, getUsersConsumedFoodsThisWeek } = require('../controllers/foodsController');

router.post('/entry', addConsumedFood)
router.post('', addFood)
router.get('/entry/:userId', getUsersConsumedFoods)
router.get('/calories/daily', getUsersCaloriesConsumedDaily)
router.get('', getFoods)
router.get('/calories/since-last-monday', getCaloriesConsumedThisWeek)
router.get('/entries/since-last-monday', getUsersConsumedFoodsThisWeek)

module.exports = router;