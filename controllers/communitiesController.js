const pool = require('../db');
const { toCamelCase } = require('../utils');

async function addCommunity(req, res) {
    const { userId, name, description } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: userId y name' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO communities (user_id, name, description)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, name, description || null]
        );

        res.status(201).json({ message: 'Comunidad creada', community: toCamelCase(result.rows[0]) });
    } catch (err) {
        console.error(err);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'El nombre de comunidad ya existe' });
        }

        res.status(500).json({ error: 'Error al crear comunidad' });
    }
}

async function getCommunities(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId en la query' });
    }

    try {
        const result = await pool.query(
            `SELECT c.*, u.username AS creator_username
             FROM community_subscriptions c
                      JOIN users u ON c.user_id = u.id
                      JOIN communities cc ON c.community_id = cc.id WHERE u.id = $1
             ORDER BY cc.name ASC;
            `,
            [userId]
        );

        res.json({ communities: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunidades del usuario' });
    }
}


async function getAllCommunities(req, res) {
    try {
        const result = await pool.query(
            `SELECT c.*, u.username AS creator_username
             FROM communities c
             JOIN users u ON c.user_id = u.id
             ORDER BY c.name ASC`
        );
        res.json({ communities: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunidades' });
    }
}

async function subscribeToCommunity(req, res) {
    const { userId, communityId } = req.body;

    if (!userId || !communityId) {
        return res.status(400).json({ error: 'Faltan userId o communityId' });
    }

    try {
        await pool.query(
            `INSERT INTO community_subscriptions (user_id, community_id)
             VALUES ($1, $2)`,
            [userId, communityId]
        );
        res.status(201).json({ message: 'Suscripción exitosa' });
    } catch (err) {
        console.error(err);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya estás suscripto a esta comunidad' });
        }

        res.status(500).json({ error: 'Error al suscribirse a la comunidad' });
    }
}


module.exports = {
    addCommunity,
    getCommunities,
    getAllCommunities,
    subscribeToCommunity
};