const pool = require('../db');
const { toCamelCase } = require('../utils');

// Obtener notificaciones del día actual para un usuario y marcarlas como leídas
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
  
      // Marcar como leídas todas las notificaciones de hoy
      await pool.query(
        `
        UPDATE notifications
        SET read = true
        WHERE user_id = $1 AND created_at::date = CURRENT_DATE
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

// Verificar si el usuario tiene notificaciones no leídas del día actual
async function hasUnreadNotifiactions(req, res) {
    const { userId } = req.params;
  
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }
  
    try {
      const result = await pool.query(
        `
        SELECT 1 FROM notifications
        WHERE user_id = $1 AND read = false AND created_at::date = CURRENT_DATE
        LIMIT 1
        `,
        [userId]
      );
  
      const hasUnread = result.rowCount > 0;
      res.json({ hasUnread });
    } catch (err) {
      console.error('[hasUnreadNotificationsToday] Error:', err);
      res.status(500).json({ error: 'Error al verificar notificaciones no leídas' });
    }
  }
  
// Crear una nueva notificación usando user_id o username
async function createNotification(req, res) {
    let { user_id, username, message } = req.body;
  
    if (!message || (!user_id && !username)) {
      return res.status(400).json({ error: 'Faltan campos requeridos: message y user_id o username' });
    }
  
    try {
      // Si no viene user_id pero sí username, buscarlo
      if (!user_id && username) {
        const userResult = await pool.query(
          `SELECT id FROM users WHERE username = $1`,
          [username]
        );
  
        if (userResult.rowCount === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }
  
        user_id = userResult.rows[0].id;
      }
  
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
    getNotifications, 
    createNotification, 
    deleteNotification, 
    deleteAllNotifications,
    hasUnreadNotifiactions
};