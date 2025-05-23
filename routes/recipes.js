
const express = require('express');
const router = express.Router();
const { 
  createRecipe,
  getRecipes
} = require('../controllers/recipesController');

router.post('/create', createRecipe);
router.get('/get', getRecipes);

module.exports = router;
