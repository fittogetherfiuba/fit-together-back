const pool = require('../db');
const { toCamelCase } = require('../utils');

async function getUserIdByUsername(username) {
    const result = await pool.query(
        'SELECT id FROM users WHERE username = $1 LIMIT 1',
        [username]
    );
    if (result.rows.length === 0) {
        throw new Error(`Usuario "${username}" no encontrado`);
    }
    return result.rows[0].id;
}

async function getFriends (req, res) {
    const { username } = req.params;

    try {
        const userId = await getUserIdByUsername(username);

        const { rows } = await pool.query(
            `SELECT u.username, u.fullname, u.email
       FROM user_friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1`,
            [userId]
        );

        res.json({ friends: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Error al obtener amigos' });
    }
}

async function acceptRequest (req, res) {
    const { senderUsername, receiverUsername } = req.body;

    try {
        const senderId = await getUserIdByUsername(senderUsername);
        const receiverId = await getUserIdByUsername(receiverUsername);

        await pool.query(
            `DELETE FROM friend_requests
             WHERE sender_id = $1 AND receiver_id = $2`,
            [senderId, receiverId]
        );

        await pool.query(
            `INSERT INTO user_friends (user_id, friend_id)
             VALUES ($1, $2), ($2, $1)
                 ON CONFLICT DO NOTHING`,
            [senderId, receiverId]
        );

        res.status(201).json({ message: 'Amistad confirmada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Error al confirmar amistad' });
    }
}


async function getRequests (req, res) {
    try {
        const userId = await getUserIdByUsername(req.params.username);
        const { rows } = await pool.query(
            `SELECT u.username, u.fullname
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1`,
            [userId]
        );
        res.json({ requests: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}


async function sendRequest (req, res) {
    const { senderUsername, receiverUsername } = req.body;
    if (!senderUsername || !receiverUsername || senderUsername === receiverUsername) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }
    try {
        const senderId = await getUserIdByUsername(senderUsername);
        const receiverId = await getUserIdByUsername(receiverUsername);
        await pool.query(
            `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
            [senderId, receiverId]
        );
        res.status(201).json({ message: 'Solicitud enviada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}


async function rejectRequest (req, res) {
    const { senderUsername, receiverUsername } = req.body;
    try {
        const senderId = await getUserIdByUsername(senderUsername);
        const receiverId = await getUserIdByUsername(receiverUsername);
        await pool.query(
            `DELETE FROM friend_requests
       WHERE sender_id = $1 AND receiver_id = $2`,
            [senderId, receiverId]
        );
        res.json({ message: 'Solicitud eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function removeFriend (req, res) {
    const { firstUsername, secondUsername } = req.body;
    try {
        const userIdA = await getUserIdByUsername(firstUsername);
        const userIdB = await getUserIdByUsername(secondUsername);
        await pool.query(
            `DELETE FROM user_friends
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)`,
            [userIdA, userIdB]
        );
        res.json({ message: 'Amistad eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}



sendRequest
module.exports = { getFriends, acceptRequest, getRequests, sendRequest, rejectRequest, removeFriend };