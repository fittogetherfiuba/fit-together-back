const express = require('express');
const router = express.Router();
const { acceptRequest, getFriends, getRequests, sendRequest, rejectRequest, removeFriend } = require('../controllers/friendsController');

router.post('/:username', getFriends)
router.get('/requests/:username', getRequests)
router.post('/requests', sendRequest)
router.delete('/requests', rejectRequest)
router.post('/accept', acceptRequest)
router.delete('/remove', removeFriend)

module.exports = router;