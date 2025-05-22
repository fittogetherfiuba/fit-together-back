const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();
const bcrypt = require('bcrypt');
const { toCamelCase } = require('./utils');

function getFormattedDate() {
    const date = new Date()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  }

const app = express();
app.use(cors());
app.use(express.json()); // para parsear JSON

app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/users/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
         id,
         username,
         fullname,
         email,
         birthday,
         weight,
         height,
         description, 
         registrationDay
       FROM users
       WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

app.put('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    const { fullname, birthday, weight, height, description } = req.body;

    try {
        const result = await pool.query(
            `
                UPDATE users
                SET
                    fullname = $1,
                    birthday = $2,
                    weight = $3,
                    height = $4,
                    description = $5
                WHERE username = $6
                    RETURNING 
        id, username, fullname, email, birthday, weight, height, description;
            `,
            [fullname, birthday, weight, height, description, username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado', user: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});




// REGISTRO
app.post('/api/register', async (req, res) => {
    const { email, password, username, fullname } = req.body;
    if (!email || !password || !username || !fullname) return res.status(400).json({ error: 'Faltan campos' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password, username, fullname, registrationDay) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, hashedPassword, username, fullname, getFormattedDate()]
        );

        const user = result.rows[0];
        res.status(201).json({ username: user.username, userId: user.id });
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'El email ya está registrado' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        res.json({ username: user.username, userId: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});


// Establecer objetivos
app.post('/api/goals', async (req, res) => {
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
});

// Obtener objetivos
app.get('/api/goals/:userId', async (req, res) => {
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
});

// Agregar comida consumida
app.post('/api/foods/entry', async (req, res) => {
    const { userId, foodName, grams, consumedAt } = req.body;
  
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    if (!foodName || typeof foodName !== 'string') {
      return res.status(400).json({ error: 'foodName inválido o vacío' });
    }
    if (typeof grams !== 'number' || grams <= 0) {
      return res.status(400).json({ error: 'grams debe ser un número mayor a 0' });
    }
  
    try {
      const foodResult = await pool.query(
        'SELECT id, calories_per_100g FROM foods WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [foodName.trim()]
      );
  
      if (foodResult.rows.length === 0) {
        return res.status(404).json({ error: 'El alimento no existe' });
      }
  
      const { id: foodId, calories_per_100g } = foodResult.rows[0];
      const calories = calories_per_100g ? (grams * calories_per_100g) / 100 : null;
  
      const insertResult = await pool.query(
        `INSERT INTO user_food_entries (user_id, food_id, grams, calories, consumed_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, foodId, grams, calories, consumedAt || new Date()]
      );
  
      res.status(201).json({ message: 'Comida registrada', entry: toCamelCase(insertResult.rows[0]) });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar la comida' });
    }
  });

// Agregar comida
app.post('/api/foods', async (req, res) => {
    const { name, userId, caloriesPer100g } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name inválido o vacío' });
    }

    if (caloriesPer100g !== undefined && (typeof caloriesPer100g !== 'number' || caloriesPer100g < 0)) {
        return res.status(400).json({ error: 'caloriesPer100g debe ser un número mayor o igual a 0' });
    }

    const normalizedName = name.trim().toLowerCase();

    try {
        const existing = await pool.query(
            'SELECT * FROM foods WHERE LOWER(name) = $1 LIMIT 1',
            [normalizedName]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El alimento ya existe' });
        }

        const result = await pool.query(
            `INSERT INTO foods (name, created_by_user_id, calories_per_100g)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name.trim(), userId || null, caloriesPer100g ?? null]
        );

        res.status(201).json({ message: 'Alimento creado', food: toCamelCase(result.rows[0]) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear alimento' });
    }
});

// Ver comidas consumidas por un usuario
app.get('/api/foods/entry/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId' });
    }

    try {
        const result = await pool.query(
            `SELECT 
                ufe.id, 
                ufe.grams, 
                ufe.calories, 
                ufe.consumed_at, 
                f.name AS food_name
             FROM user_food_entries ufe
             JOIN foods f ON ufe.food_id = f.id
             WHERE ufe.user_id = $1
             ORDER BY ufe.consumed_at DESC`,
            [userId]
        );

        res.json({ entries: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comidas del usuario' });
    }
});

// Cantidad de calorías de usuario consumidas en un día dado (sin dia dado -> dia acutal)
app.get('/api/foods/calories/daily', async (req, res) => {
  const { userId, date } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Faltan userId' });
  }
  try {
    const { rows } = await pool.query(
        `SELECT COALESCE(SUM(calories), 0) AS total_calories
        FROM user_food_entries
        WHERE user_id = $1
            AND consumed_at >= $2::date
            AND consumed_at < ($2::date + INTERVAL '1 day')`,
      [userId, date || new Date()]
    );
    res.json({ date, totalCalories: Number(rows[0].total_calories) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular calorías diarias' });
  }
});

// Cantidad de agua consumida por el usuario en un día dado (sin dia dado -> dia acutal)
app.get('/api/water/daily', async (req, res) => {
  const { userId, date } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Faltan userId' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters
       FROM water_entries
       WHERE user_id = $1
         AND consumed_at = $2::date`,
      [userId, date || new Date()]
    );

    res.json({ date, totalLiters: Number(rows[0].total_liters) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular agua diaria' });
  }
});

// Cantidad de calorias consumida por el usuario desde ultimo dia hata dia acual
app.get('/api/foods/calories/since-last-monday', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  // 0 = domingo … 1 = lunes … 6 = sábado
  const todayDay = now.getDay(); 
  // Cuántos días restar para llegar al lunes
  const daysSinceMonday = (todayDay + 6) % 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);  // corte a medianoche
  const mondayStr = lastMonday.toISOString().slice(0, 10);

  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS total_calories
         FROM user_food_entries
        WHERE user_id = $1
          AND consumed_at >= $2::date`,
      [userId, mondayStr]
    );
    return res.json({since: mondayStr, until: now.toISOString(), totalCalories: Number(rows[0].total_calories)});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al calcular calorías desde el último lunes' });
  }
});


// Cantidad de agua consumida por el usuario desde ultimo dia hata dia acual
app.get('/api/water/since-last-monday', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  // 0 = domingo … 1 = lunes … 6 = sábado
  const todayDay = now.getDay();  // :contentReference[oaicite:0]{index=0}
  // Cuántos días restar para llegar al lunes
  const daysSinceMonday = (todayDay + 6) % 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);  // corte a medianoche
  const mondayStr = lastMonday.toISOString().slice(0, 10);

  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters
         FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= $2::date`,
      [userId, mondayStr]
    );

    return res.json({since: mondayStr, until: now.toISOString(), totalLiters: Number(rows[0].total_liters)});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al calcular agua desde el último lunes' });
  }
});


// Ver comidas disponibles
app.get('/api/foods', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM foods ORDER BY name ASC`
        );
        res.json(toCamelCase(result.rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener alimentos' });
    }
});

// Ver actividades realizadas por un usuario
app.get('/api/activities/entry/:userId', async (req, res) => {
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
});

// Registrar actividad realizada por un usuario
app.post('/api/activities/entry', async (req, res) => {
    const { userId, activityName, durationMinutes, distanceKm, series, repetitions, performedAt } = req.body;

    if (!userId || !activityName) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: userId y activityName' });
    }
   
    try {
        // Buscar ID de la actividad
        const activityRes = await pool.query(
            'SELECT id FROM activities WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [activityName.trim()]
        );

        if (activityRes.rows.length === 0) {
            return res.status(404).json({ error: 'La actividad no existe' });
        }

        const activityId = activityRes.rows[0].id;

        const insertRes = await pool.query(
            `INSERT INTO user_activity_entries 
            (user_id, activity_id, duration_minutes, distance_km, series, repetitions, performed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                userId,
                activityId,
                durationMinutes || null,
                distanceKm || null,
                series || null,
                repetitions || null,
                performedAt || new Date()
            ]
        );

        res.status(201).json({ message: 'Actividad registrada', entry: toCamelCase(insertRes.rows[0]) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar actividad' });
    }
});


// Ver actividades disponibels
app.get('/api/activities', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM activities ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener actividades' });
    }
});

// Cargar agua consumida
app.post('/api/water/entry', async (req, res) => {
    const { userId, liters } = req.body;
  
    if (!userId || typeof liters !== 'number' || liters <= 0) {
      return res.status(400).json({ error: 'Datos inválidos: se requiere userId y liters > 0' });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO water_entries (user_id, liters)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, liters]
      );
  
      res.status(201).json({ message: 'Registro de agua guardado', entry: toCamelCase(result.rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar el consumo de agua' });
    }
  });

// Obtener agua consumida
app.get('/api/water/entries', async (req, res) => {
    const { userId, from, to } = req.query;
  
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }
  
    try {
      const result = await pool.query(
        `
        SELECT * FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= COALESCE($2::date, '1970-01-01')
          AND consumed_at <= COALESCE($3::date, CURRENT_DATE)
        ORDER BY consumed_at DESC
        `,
        [userId, from || null, to || null]
      );
  
      res.json({ entries: toCamelCase(result.rows) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener registros de agua' });
    }
  });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


// Actividades realizadas por el usuario desde ultimo dia hata dia acual
app.get('/api/activities/since-last-monday', async (req, res) => {
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
              uae.duration_minutes,
              uae.distance_km,
              uae.series,
              uae.repetitions,
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
      durationMinutes:  r.duration_minutes,
      distanceKm:       r.distance_km,
      series:           r.series,
      repetitions:      r.repetitions,
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
});


//  Lista de comidas consumidas desde el último lunes
app.get('/api/foods/entries/since-last-monday', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  const todayDay      = now.getDay();                  // 0 = domingo … 1 = lunes … 6 = sábado
  const daysMonday    = (todayDay + 6) % 7;            // desplazamiento para llegar al lunes
  const lastMonday    = new Date(now);
  lastMonday.setDate(now.getDate() - daysMonday);
  lastMonday.setHours(0,0,0,0);
  const mondayStr     = lastMonday.toISOString().slice(0,10);

  try {
    const { rows } = await pool.query(
      `SELECT f.name    AS foodName,
              e.calories AS calories,
              e.consumed_at
         FROM user_food_entries e
    INNER JOIN foods               f ON e.food_id = f.id
        WHERE e.user_id   = $1
          AND e.consumed_at >= $2::date`,
      [userId, mondayStr]
    );

    return res.json({
      since:   mondayStr,
      until:   now.toISOString(),
      entries: rows
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: 'Error al obtener comidas desde el último lunes' });
  }
});

//  Lista de agua consumida desde el último lunes
app.get('/api/water/entries/since-last-monday', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  const todayDay      = now.getDay();
  const daysMonday    = (todayDay + 6) % 7;
  const lastMonday    = new Date(now);
  lastMonday.setDate(now.getDate() - daysMonday);
  lastMonday.setHours(0,0,0,0);
  const mondayStr     = lastMonday.toISOString().slice(0,10);

  try {
    const { rows } = await pool.query(
      `SELECT liters,
              consumed_at
         FROM water_entries
        WHERE user_id      = $1
          AND consumed_at >= $2::date`,
      [userId, mondayStr]
    );

    return res.json({
      since:   mondayStr,
      until:   now.toISOString(),
      entries: rows
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: 'Error al obtener agua desde el último lunes' });
  }
});