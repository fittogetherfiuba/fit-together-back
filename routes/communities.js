const express = require('express');
const router = express.Router();
const { addCommunity , getCommunities, getAllCommunities, subscribeToCommunity, createPost, updatePost, getCommunityPosts, getPostById} = require('../controllers/communitiesController');
const { route } = require('./communities');

router.post('/create', addCommunity)
router.get('', getCommunities)
router.get('/all', getAllCommunities);
router.post('/subscribe', subscribeToCommunity);
router.post('/posts', createPost);
router.put('/posts/:postId', updatePost);
router.get('/:communityId/posts', getCommunityPosts);
router.get('/posts/:postId', getPostById);

module.exports = router;

