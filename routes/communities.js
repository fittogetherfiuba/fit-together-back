const express = require('express');
const router = express.Router();
const { addCommunity , getCommunities, getAllCommunities, subscribeToCommunity, createPost, updatePost, getCommunityPosts, getPostById, addComment, getComments, getTopics, getCommunityMembers} = require('../controllers/communitiesController');
const { route } = require('./communities');

router.post('/create', addCommunity)
router.get('', getCommunities)
router.get('/all', getAllCommunities);
router.post('/subscribe', subscribeToCommunity);
router.post('/posts', createPost);
router.put('/posts/:postId', updatePost);
router.post('/:communityId/posts', getCommunityPosts);
router.get('/posts/:postId', getPostById);
router.post('/posts/:postId/comments', addComment);
router.get('/posts/:postId/comments', getComments);
router.get('/topics', getTopics);
router.get('/:communityId/members', getCommunityMembers);

module.exports = router;

