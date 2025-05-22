const pool = require('../db');
const { toCamelCase } = require('../utils');


// Establecer objetivos
 async function setGoals(req, res){
    const { userId, type, goal } = req.body;

    const allowedTypes = ['calories', 'water'];
    const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : null;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId' });
    }

    if (!normalizedType || !allowedTypes.includes(normalizedType)) {
        return res.status(400).json({ error: 'type inválido. Debe ser "calories" o "water"' });
    }

    if (goal === undefined) {
        return res.status(400).json({ error: 'Falta goal' });
    }

    if (typeof goal !== 'number' || goal <= 0) {
        return res.status(400).json({ error: 'goal debe ser un número mayor a 0' });
    }

    try {
        const result = await pool.query(
            `
              INSERT INTO user_goals (user_id, type, goal_value)
              VALUES ($1, $2, $3)
              ON CONFLICT (user_id, type)
              DO UPDATE SET goal_value = EXCLUDED.goal_value
              RETURNING *;
            `,
            [userId, normalizedType, goal]
        );

        res.status(201).json({ message: 'Objetivo guardado', goal: toCamelCase(result.rows[0]) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar objetivo en la base de datos' });
    }
}

// Obtener objetivos
async function getGoals (req, res) {
    const { userId } = req.params;
    const type = req.query.type?.toLowerCase(); // <- esto solo

    const allowedTypes = ['calories', 'water'];

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId' });
    }

    if (type && !allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'type inválido. Debe ser "calories" o "water"' });
    }

    try {
        const result = await pool.query(
            `
            SELECT type, goal_value
            FROM user_goals
            WHERE user_id = $1
            ${type ? 'AND type = $2' : ''}
            `,
            type ? [userId, type] : [userId]
        );

        if (type) {
            const goal = result.rows[0] ? Number(result.rows[0].goal_value) : null;
            return res.json(toCamelCase({ type, goal }));
        }

        const goals = {};
        result.rows.forEach(row => {
            goals[row.type] = Number(row.goal_value);
        });

        res.json({ goals });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener objetivos del usuario' });
    }
}


module.exports = { setGoals, getGoals };