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
             FROM communities c
                      JOIN users u ON c.user_id = u.id
             WHERE c.user_id = $1
             ORDER BY c.name ASC`,
            [userId]
        );

        res.json({ communities: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunidades del usuario' });
    }
}


module.exports = {
        addCommunity,
    getCommunities
};
