const pool = require('../db');
const { toCamelCase } = require('../utils');


// Ver actividades realizadas por un usuario
async function getDoneActivities (req,res) {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT uae.*, a.name AS activity_name
             FROM user_activity_entries uae
             JOIN activities a ON uae.activity_id = a.id
             WHERE uae.user_id = $1
             ORDER BY uae.performed_at DESC`,
            [userId]
        );
        res.json({ entries: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener actividades del usuario' });
    }
}

// Registrar actividad realizada por un usuario
async function addDoneActivity (req,res) {
    const { userId, activityName, durationMinutes, distanceKm, series, repetitions, performedAt, caloriesBurned } = req.body;

    if (!userId || !activityName) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: userId y activityName' });
    }
   
    try {
        // Buscar ID de la actividad
        const activityRes = await pool.query(
            'SELECT id FROM activities WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [activityName]
        );

        if (activityRes.rows.length === 0) {
            return res.status(404).json({ error: 'La actividad no existe' });
        }

        const activityId = activityRes.rows[0].id;
        const insertRes = await pool.query(
            `INSERT INTO user_activity_entries 
            (user_id, activity_id, duration_minutes, distance_km, series, repetitions, performed_at, calories_burned)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                userId,
                activityId,
                durationMinutes || null,
                distanceKm || null,
                series || null,
                repetitions || null,
                performedAt,
                caloriesBurned || null
            ]
        );

        res.status(201).json({ message: 'Actividad registrada', entry: toCamelCase(insertRes.rows[0]) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar actividad' });
    }
}

// Ver actividades disponibels
async function getActivities (req,res){
    try {
        const result = await pool.query('SELECT * FROM activities ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener actividades' });
    }
}

// Actividades realizadas por el usuario desde ultimo dia hata dia acual
async function getDoneActivitiesThisWeek (req,res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  // Calcular fecha del último lunes a medianoche
  const now = new Date();
  const todayDay = now.getDay();               // 0=domingo…6=sábado
  const daysSinceMonday = (todayDay + 6) % 7;   // lunes→0, martes→1, …
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);
  const mondayISO = lastMonday.toISOString();  // timestamp ISO

  try {
    const { rows } = await pool.query(
      `SELECT uae.id,
              a.name        AS activity_name,
              a.type        AS activity_type,
              uae.duration_minutes,
              uae.distance_km,
              uae.series,
              uae.repetitions,
              uae.calories_burned,
              uae.performed_at
         FROM user_activity_entries uae
         JOIN activities a
           ON uae.activity_id = a.id
        WHERE uae.user_id = $1
          AND uae.performed_at >= $2
        ORDER BY uae.performed_at DESC`,
      [userId, mondayISO]
    );

    // Convertir columnas a camelCase si existe toCamelCase, o manualmente:
    const entries = rows.map(r => ({
      id:               r.id,
      activityName:     r.activity_name,
      activityType:     r.activity_type,
      durationMinutes:  r.duration_minutes,
      distanceKm:       r.distance_km,
      series:           r.series,
      repetitions:      r.repetitions,
      caloriesBurned:   r.calories_burned,
      performedAt:      r.performed_at
    }));

    return res.json({
      since:  lastMonday.toISOString().slice(0,10),
      until:  now.toISOString(),
      entries
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: 'Error al obtener actividades desde el último lunes' });
  }
}

async function estimateCaloriesBurned(req, res) {
    const { activityName, durationMinutes, repetitions } = req.body;
    if (!activityName) {
        return res.status(400).json({ error: 'Falta el nombre de la actividad' });
    }

    try {
        const result = await pool.query(
            `SELECT type, calories_burn_rate
         FROM activities
        WHERE name = $1
        LIMIT 1`,
            [activityName]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actividad no encontrada' });
        }

        const { type: type, calories_burn_rate: rate } = result.rows[0];

        let calories = null;

        if (type === 'cardio') {
            if (!durationMinutes) {
                return res.status(400).json({ error: 'Falta durationMinutes para actividad cardio' });
            }
            calories = rate * durationMinutes;
        } else if (type === 'musculacion') {
            if (!repetitions) {
                return res.status(400).json({ error: 'Faltan repetitions para actividad de musculación' });
            }
            calories = rate * repetitions;
        } else {
            return res.status(400).json({ error: 'Categoría de actividad no reconocida' });
        }

        res.json({ activityName, type: type, estimatedCalories: calories });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al estimar calorías' });
    }
}


// Ver actividades disponibels
async function getActivitiesByType (req,res){
    const { type } = req.params;
    console.log('query: ' + type)
    try {
        const result = await pool.query(
            'SELECT * FROM activities WHERE LOWER(type) = LOWER($1) ORDER BY name ASC',
            [type]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener actividades' });
    }
}

module.exports = { getDoneActivities , addDoneActivity , getActivities, getDoneActivitiesThisWeek,
    estimateCaloriesBurned, getActivitiesByType};