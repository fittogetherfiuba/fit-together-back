const pool = require('../db');
const { toCamelCase } = require('../utils');


// Agregar comida consumida
async function addConsumedFood(req, res) {
  const { userId, foodName, grams, consumedAt, period } = req.body;

  if (!userId) return res.status(400).json({ error: 'Falta userId' });
  if (!foodName || typeof foodName !== 'string') {
    return res.status(400).json({ error: 'foodName inválido o vacío' });
  }
  if (typeof grams !== 'number' || grams <= 0) {
    return res.status(400).json({ error: 'grams debe ser un número mayor a 0' });
  }

  const allowedPeriods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  let normalizedPeriod = null;

  if (period) {
    normalizedPeriod = period
      .toLowerCase();

    if (!allowedPeriods.includes(normalizedPeriod)) {
      return res.status(400).json({
        error: 'period inválido. Debe ser desayuno, almuerzo, merienda o cena'
      });
    }
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
      `INSERT INTO user_food_entries (user_id, food_id, grams, calories, consumed_at, period)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, foodId, grams, calories, consumedAt || new Date(), normalizedPeriod]
    );

    res.status(201).json({
      message: 'Comida registrada',
      entry: toCamelCase(insertResult.rows[0])
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la comida' });
  }
}

// Agregar comida
async function addFood(req, res) {
  const { name, userId, caloriesPer100g, nutrients } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name inválido o vacío' });
  }

  if (caloriesPer100g !== undefined && (typeof caloriesPer100g !== 'number' || caloriesPer100g < 0)) {
    return res.status(400).json({ error: 'caloriesPer100g debe ser un número mayor o igual a 0' });
  }

  if (
    nutrients &&
    (!Array.isArray(nutrients) ||
      nutrients.some(n => typeof n.nutrientId !== 'number' || typeof n.amountPer100g !== 'number'))
  ) {
    return res.status(400).json({ error: 'Formato de nutrientes inválido' });
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

    const food = result.rows[0];

    // Insertar nutrientes si vienen
    if (nutrients && nutrients.length > 0) {
      const insertNutrients = nutrients.map(n =>
        pool.query(
          `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g)
           VALUES ($1, $2, $3)
           ON CONFLICT (food_id, nutrient_id)
           DO UPDATE SET amount_per_100g = EXCLUDED.amount_per_100g`,
          [food.id, n.nutrientId, n.amountPer100g]
        )
      );
      await Promise.all(insertNutrients);
    }

    res.status(201).json({ message: 'Alimento creado', food: toCamelCase(food) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear alimento' });
  }
}

// Ver comidas consumidas por un usuario
async function getUsersConsumedFoods(req, res) {
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
          ufe.period,
          f.id AS food_id,
          f.name AS food_name
       FROM user_food_entries ufe
       JOIN foods f ON ufe.food_id = f.id
       WHERE ufe.user_id = $1
       ORDER BY ufe.consumed_at DESC`,
      [userId]
    );

    const entries = result.rows;
    const foodIds = [...new Set(entries.map(e => e.food_id))];

    let nutrientsMap = {};

    if (foodIds.length > 0) {
      const nutrientsResult = await pool.query(`
        SELECT fn.food_id,
               n.id AS nutrient_id,
               n.name,
               n.unit,
               fn.amount_per_100g
        FROM food_nutrients fn
        JOIN nutrients n ON fn.nutrient_id = n.id
        WHERE fn.food_id = ANY($1::int[])
      `, [foodIds]);

      for (const row of nutrientsResult.rows) {
        if (!nutrientsMap[row.food_id]) nutrientsMap[row.food_id] = [];
        nutrientsMap[row.food_id].push({
          nutrientId: row.nutrient_id,
          name: row.name,
          unit: row.unit,
          amount: null,
          per100g: Number(row.amount_per_100g)
        });
      }
    }

    const enriched = entries.map(entry => {
      const nutrients = (nutrientsMap[entry.food_id] || []).map(n => ({
        nutrientId: n.nutrientId,
        name: n.name,
        unit: n.unit,
        amount: Number((entry.grams * n.per100g) / 100)
      }));

      return {
        ...toCamelCase(entry),
        calories: Math.ceil(Number(entry.calories)),
        nutrients
      };
    });

    res.json({ entries: enriched });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comidas del usuario' });
  }
}

// Cantidad de calorías de usuario consumidas en un día dado (sin dia dado -> dia acutal)
async function getUsersCaloriesConsumedDaily(req, res) {
  const { userId, date } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Faltan userId' });
  }

  try {
    const baseDate = date || new Date();
    
    // Calorías
    const caloriesResult = await pool.query(
      `SELECT COALESCE(SUM(calories), 0) AS total_calories
       FROM user_food_entries
       WHERE user_id = $1
         AND consumed_at >= $2::date
         AND consumed_at < ($2::date + INTERVAL '1 day')`,
      [userId, baseDate]
    );

    // Nutrientes
    const nutrientsResult = await pool.query(`
      SELECT n.id AS nutrient_id, n.name, n.unit,
             SUM((ufe.grams * fn.amount_per_100g) / 100) AS total_amount
      FROM user_food_entries ufe
      JOIN food_nutrients fn ON ufe.food_id = fn.food_id
      JOIN nutrients n ON fn.nutrient_id = n.id
      WHERE ufe.user_id = $1
        AND ufe.consumed_at >= $2::date
        AND ufe.consumed_at < ($2::date + INTERVAL '1 day')
      GROUP BY n.id, n.name, n.unit
      ORDER BY n.name
    `, [userId, baseDate]);

    res.json({
      date: baseDate,
      totalCalories: Number(caloriesResult.rows[0].total_calories),
      totalNutrients: nutrientsResult.rows.map(n => ({
        nutrientId: n.nutrient_id,
        name: n.name,
        unit: n.unit,
        amount: Number(n.total_amount)
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular calorías y nutrientes diarios' });
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
async function getFoods(req, res) {
  const { userId } = req.body || {};

  try {
    let foodsResult;

    if (userId) {
      // Solo propias o globales
      foodsResult = await pool.query(
        `SELECT * FROM foods
         WHERE created_by_user_id = $1 OR created_by_user_id IS NULL
         ORDER BY name ASC`,
        [userId]
      );
    } else {
      // Todas las comidas
      foodsResult = await pool.query(
        `SELECT * FROM foods
         ORDER BY name ASC`
      );
    }

    const foods = foodsResult.rows;
    const foodIds = foods.map(f => f.id);

    let nutrientsMap = {};

    if (foodIds.length > 0) {
      const nutrientsResult = await pool.query(`
        SELECT fn.food_id,
               n.id AS nutrient_id,
               n.name,
               n.unit,
               fn.amount_per_100g
        FROM food_nutrients fn
        JOIN nutrients n ON fn.nutrient_id = n.id
        WHERE fn.food_id = ANY($1::int[])
      `, [foodIds]);

      for (const row of nutrientsResult.rows) {
        if (!nutrientsMap[row.food_id]) nutrientsMap[row.food_id] = [];
        nutrientsMap[row.food_id].push({
          nutrientId: row.nutrient_id,
          name: row.name,
          unit: row.unit,
          amountPer100g: Number(row.amount_per_100g)
        });
      }
    }

    const enrichedFoods = foods.map(f => ({
      ...toCamelCase(f),
      nutrients: nutrientsMap[f.id] || []
    }));

    res.json(enrichedFoods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alimentos' });
  }
}


//  Lista de comidas consumidas desde el último lunes
async function getUsersConsumedFoodsThisWeek(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  const todayDay   = now.getDay();
  const daysMonday = (todayDay + 6) % 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysMonday);
  lastMonday.setHours(0, 0, 0, 0);
  const mondayStr = lastMonday.toISOString().slice(0, 10);

  try {
    const result = await pool.query(
      `SELECT 
        e.id, 
        e.grams, 
        e.calories, 
        e.consumed_at, 
        e.period,
        f.id AS food_id,
        f.name AS food_name
       FROM user_food_entries e
       INNER JOIN foods f ON e.food_id = f.id
       WHERE e.user_id = $1
         AND e.consumed_at >= $2::date`,
      [userId, mondayStr]
    );

    const entries = result.rows;
    const foodIds = [...new Set(entries.map(e => e.food_id))];

    let nutrientsMap = {};

    if (foodIds.length > 0) {
      const nutrientsResult = await pool.query(`
        SELECT fn.food_id,
               n.id AS nutrient_id,
               n.name,
               n.unit,
               fn.amount_per_100g
        FROM food_nutrients fn
        JOIN nutrients n ON fn.nutrient_id = n.id
        WHERE fn.food_id = ANY($1::int[])
      `, [foodIds]);
      for (const row of nutrientsResult.rows) {
        if (!nutrientsMap[row.food_id]) nutrientsMap[row.food_id] = [];
        nutrientsMap[row.food_id].push({
          nutrientId: row.nutrient_id,
          name: row.name,
          unit: row.unit,
          amount: null,
          per100g: Number(row.amount_per_100g)
        });
      }
    }

    const enriched = entries.map(entry => {
      const nutrients = (nutrientsMap[entry.food_id] || []).map(n => ({
        nutrientId: n.nutrientId,
        name: n.name,
        unit: n.unit,
        amount: Number((entry.grams * n.per100g) / 100)
      }));

      return {
        ...toCamelCase(entry),
        nutrients
      };
    });

  res.json({ entries: enriched });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener comidas desde el último lunes' });
  }
}


// Nutrientes

async function getAllNutrients(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, unit FROM nutrients ORDER BY name ASC`
    );
    res.json({ nutrients: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la lista de nutrientes' });
  }
}

//  Lista de comidas más frecuentes en los últimos 30 días para un período dado
async function getTopFoodsByPeriodLastMonth(req, res) {
  const { userId, period } = req.query;

  if (!userId || !period) {
    return res.status(400).json({ error: 'Faltan userId o period en la query' });
  }

  const allowedPeriods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  if (!allowedPeriods.includes(period)) {
    return res.status(400).json({ error: 'Periodo inválido' });
  }

  const now           = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);

  try {
    const result = await pool.query(`
      SELECT 
        f.name AS food_name,
        COUNT(*) AS occurrences
      FROM user_food_entries e
      JOIN foods f ON e.food_id = f.id
      WHERE e.user_id      = $1
        AND e.period       = $2
        AND e.consumed_at >= $3::date
      GROUP BY f.name
      HAVING COUNT(*) >= 5          -- mínimo 5 veces en el mes
      ORDER BY occurrences DESC     -- de mayor a menor
      LIMIT 4                       -- máximo 4 resultados
    `, [userId, period, dateStr]);

    const foods = result.rows.map(r => r.food_name); 

    return res.json({ foods });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener comidas frecuentes' });
  }
}

module.exports = { getTopFoodsByPeriodLastMonth };

module.exports = {  
        addConsumedFood, 
        addFood, 
        getUsersConsumedFoods, 
        getUsersCaloriesConsumedDaily,
        getCaloriesConsumedThisWeek, 
        getFoods, 
        getUsersConsumedFoodsThisWeek, 
        getAllNutrients,
        getTopFoodsByPeriodLastMonth
};
