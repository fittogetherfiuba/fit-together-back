const pool = require('../db');
const { toCamelCase } = require('../utils');

// Obtener notificaciones del día actual para un usuario
async function getNotifications(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Falta userId' });
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM notifications
      WHERE user_id = $1
      AND created_at::date = CURRENT_DATE
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const notifications = result.rows.map(toCamelCase);
    res.json({ notifications });
  } catch (err) {
    console.error('[getNotifications] Error al obtener notificaciones:', err);
    res.status(500).json({ error: 'Error al obtener notificaciones del usuario' });
  }
}

// Crear una nueva notificación
async function createNotification(req, res) {
  const { user_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'Faltan campos requeridos: user_id o message' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO notifications (user_id, message)
      VALUES ($1, $2)
      RETURNING *
      `,
      [user_id, message]
    );

    res.status(201).json({ notification: toCamelCase(result.rows[0]) });
  } catch (err) {
    console.error('[createNotification] Error al crear notificación:', err);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
}

// Borrar una notificación por ID
async function deleteNotification(req, res) {
  const { notificationId } = req.params;

  if (!notificationId) {
    return res.status(400).json({ error: 'Falta notificationId en los parámetros' });
  }

  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [notificationId]
    );

    res.status(204).send();
  } catch (err) {
    console.error('[deleteNotification] Error al borrar notificación:', err);
    res.status(500).json({ error: 'Error al borrar notificación' });
  }
}

// Borrar todas las notificaciones de un usuario
async function deleteAllNotifications(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en los parámetros' });
  }

  try {
    await pool.query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [userId]
    );

    res.status(204).send();
  } catch (err) {
    console.error('[deleteAllNotifications] Error al borrar notificaciones:', err);
    res.status(500).json({ error: 'Error al borrar todas las notificaciones' });
  }
}

module.exports = {
  getNotifications,
  createNotification,
  deleteNotification,
  deleteAllNotifications
};

module.exports = {
    getNotifications, createNotification, deleteNotification, deleteAllNotifications
};