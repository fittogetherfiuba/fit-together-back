const express = require('express');
const router = express.Router();
const { addCommunity , getCommunities, getAllCommunities, subscribeToCommunity} = require('../controllers/communitiesController');
const { route } = require('./communities');

router.post('/create', addCommunity)
router.get('', getCommunities)
router.get('/all', getAllCommunities);
router.post('/subscribe', subscribeToCommunity);
module.exports = router;

