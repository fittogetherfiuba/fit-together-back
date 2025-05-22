const express = require('express');
const router = express.Router();
const { getAllUsers, getUserByUsername, updateUser } = require('../controllers/usersController');

router.get('', getAllUsers)
router.get('/:username', getUserByUsername)
router.put('/:username', updateUser)

module.exports = router;