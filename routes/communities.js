const express = require('express');
const router = express.Router();
const { addCommunity , getCommunities} = require('../controllers/communitiesController');
const { route } = require('./communities');

router.post('/create', addCommunity)
router.get('', getCommunities)

module.exports = router;

