const pool = require('../db');
const { toCamelCase } = require('../utils');


// Establecer objetivos
async function setGoals(req, res){
  const { userId, type, goal } = req.body;

  const allowedTypes = ['calories', 'water'];
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : null;

  if (!userId) return res.status(400).json({ error: 'Falta userId' });
  if (!normalizedType || !allowedTypes.includes(normalizedType)) {
    return res.status(400).json({ error: 'type inválido' });
  }
  if (goal === undefined || typeof goal !== 'number' || goal <= 0) {
    return res.status(400).json({ error: 'goal debe ser un número mayor a 0' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO user_goals (user_id, type, goal_value, notified)
      VALUES ($1, $2, $3, false)
      ON CONFLICT (user_id, type)
      DO UPDATE SET goal_value = EXCLUDED.goal_value, notified = false
      RETURNING *;
      `,
      [userId, normalizedType, goal]
    );

    res.status(201).json({ message: 'Objetivo guardado', goal: toCamelCase(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar objetivo' });
  }
}

// Obtener objetivos
async function getGoals(req, res) {
  const { userId } = req.params;
  const type = req.query.type?.toLowerCase();
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
        SELECT type, goal_value, notified
        FROM user_goals
        WHERE user_id = $1
        ${type ? 'AND type = $2' : ''}
      `,
      type ? [userId, type] : [userId]
    );

    if (type) {
      const row = result.rows[0];
      if (!row) {
        return res.json({});
      }
      return res.json({
        type: row.type,
        goal: {
          value: Number(row.goal_value),
          notified: row.notified
        }
      });
    }

    const goals = {};
    result.rows.forEach(row => {
      goals[row.type] = {
        value: Number(row.goal_value),
        notified: row.notified
      };
    });

    res.json({ goals });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener objetivos del usuario' });
  }
}


async function markGoalNotified(req, res) {
  const { userId, type } = req.body;
  const allowedTypes = ['calories', 'water'];

  if (!userId || !type || !allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  try {
    await pool.query(
      `
      UPDATE user_goals
      SET notified = true
      WHERE user_id = $1 AND type = $2
      `,
      [userId, type]
    );

    res.status(200).json({ message: 'Estado de notificación actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar notified' });
  }
}



module.exports = { setGoals, getGoals, markGoalNotified };