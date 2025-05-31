const express = require('express');
const router = express.Router();
const { getAllUsers, getUserByUsername, updateUser, verifyUser } = require('../controllers/usersController');

router.get('', getAllUsers)
router.get('/:username', getUserByUsername)
router.put('/:username', updateUser)
router.put('/:username', updateUser)
router.post('/verify', verifyUser)

module.exports = router;