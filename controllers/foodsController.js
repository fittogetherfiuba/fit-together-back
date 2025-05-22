const pool = require('../db');
const { toCamelCase } = require('../utils');


// Agregar comida consumida
async function addConsumedFood (req,res) {
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
}

// Agregar comida
async function addFood(req,res) {
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
}

// Ver comidas consumidas por un usuario
async function getUsersConsumedFoods(req,res) {
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
}

// Cantidad de calorías de usuario consumidas en un día dado (sin dia dado -> dia acutal)
async function getUsersCaloriesConsumedDaily(req,res) {
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
}

// Cantidad de calorias consumida por el usuario desde ultimo dia hata dia acual
async function getCaloriesConsumedThisWeek(req,res) {
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
}

// Ver comidas disponibles
async function getFoods(req,res){
    try {
        const result = await pool.query(
            `SELECT * FROM foods ORDER BY name ASC`
        );
        res.json(toCamelCase(result.rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener alimentos' });
    }
}

//  Lista de comidas consumidas desde el último lunes
async function getUsersConsumedFoodsThisWeek(req,res) {
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
}




module.exports = { addConsumedFood, addFood, getUsersConsumedFoods, getUsersCaloriesConsumedDaily ,getCaloriesConsumedThisWeek , getFoods, getUsersConsumedFoodsThisWeek };