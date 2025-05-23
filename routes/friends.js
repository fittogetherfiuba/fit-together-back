const express = require('express');
const router = express.Router();
const { acceptRequest, getFriends, getRequests, sendRequest, rejectRequest, removeFriend } = require('../controllers/friendsController');

router.get('/:username', getFriends)
router.get('/requests/:username', getRequests)
router.post('/requests', sendRequest)
router.post('/requests/remove', rejectRequest)
router.post('/accept', acceptRequest)
router.post('/remove', removeFriend)

module.exports = router;