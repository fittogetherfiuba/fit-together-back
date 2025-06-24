// userCreation.js
const pool = require('../db');
const { toCamelCase } = require('../utils');

// ---------- utilidades de fecha ----------
function getFormattedDate() {
  const date = new Date();
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- agregar comida consumida ----------
async function addConsumedFood({ userId, foodName, grams, consumedAt = new Date(), period }) {
  if (!userId) throw new Error('Falta userId');
  if (!foodName || typeof foodName !== 'string') throw new Error('foodName inválido o vacío');
  if (typeof grams !== 'number' || grams <= 0) throw new Error('grams debe ser un número mayor a 0');

  const allowedPeriods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  let normalizedPeriod = null;
  if (period) {
    normalizedPeriod = period.toLowerCase();
    if (!allowedPeriods.includes(normalizedPeriod)) {
      throw new Error('period inválido. Debe ser desayuno, almuerzo, merienda o cena');
    }
  }
  const foodRes = await pool.query(
    'SELECT id, calories_per_100g FROM foods WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [foodName.trim()]
  );
  if (foodRes.rows.length === 0) throw new Error('El alimento no existe');
  const { id: foodId, calories_per_100g } = foodRes.rows[0];
  const calories = calories_per_100g ? (grams * calories_per_100g) / 100 : null;

  const result = await pool.query(
    `INSERT INTO user_food_entries
       (user_id, food_id, grams, calories, consumed_at, period)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, foodId, grams, calories, consumedAt, normalizedPeriod]
  );
  return toCamelCase(result.rows[0]);
}

// ---------- registrar consumo de agua ----------
async function addConsumedWater({ userId, liters, consumedAt = new Date() }) {
  if (!userId) throw new Error('Falta userId');
  if (typeof liters !== 'number' || liters <= 0) throw new Error('liters debe ser un número mayor a 0');

  const result = await pool.query(
    `INSERT INTO water_entries
       (user_id, liters, consumed_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, liters, consumedAt]
  );
  return toCamelCase(result.rows[0]);
}

// ---------- agregar actividad realizada ----------
async function addDoneActivity({ userId, activityName, durationMinutes, distanceKm, series, repetitions, performedAt = new Date(), caloriesBurned }) {
  if (!userId || !activityName) throw new Error('Faltan campos obligatorios: userId y activityName');

  const actRes = await pool.query(
    'SELECT id FROM activities WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [activityName.trim()]
  );
  if (actRes.rows.length === 0) {
    console.log(`Actividad "${activityName}" no encontrada`);
    throw new Error('La actividad no existe');
  }
  const activityId = actRes.rows[0].id;

  const result = await pool.query(
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
  return toCamelCase(result.rows[0]);
}

async function getRecipeNutrientsFromItems(items) {
  const foodIds = items.map(i => i.foodId);

  const { rows: nutrientRows } = await pool.query(`
    SELECT fn.food_id,
           fn.nutrient_id,
           n.name,
           n.unit,
           fn.amount_per_100g
      FROM food_nutrients fn
 LEFT JOIN nutrients n ON n.id = fn.nutrient_id
     WHERE fn.food_id = ANY($1::int[])`,
    [foodIds]
  );

  const nutrientMap = {};

  for (const item of items) {
    const grams = item.grams;
    const foodId = item.foodId;

    for (const row of nutrientRows.filter(n => n.food_id === foodId)) {
      const key = row.nutrient_id;
      const scaledAmount = (grams * row.amount_per_100g) / 100;

      if (!nutrientMap[key]) {
        nutrientMap[key] = {
          nutrientId: key,
          name: row.name,
          unit: row.unit,
          amount: 0
        };
      }

      nutrientMap[key].amount += scaledAmount;
    }
  }

  return Object.values(nutrientMap).map(n => ({
    ...n,
    amount: Number(n.amount.toFixed(2))
  }));
}

// ---------- crear receta ----------
async function createRecipe({ userId, username, name, items, calories, steps, pic }) {
  if (!userId || !username || !name || !Array.isArray(items) || items.length === 0) {
    throw new Error('Faltan campos obligatorios: userId, username, name o items');
  }

  const foodIds = items.map(i => i.foodId);
  const { rows: foodsData } = await pool.query(
    'SELECT id, calories_per_100g FROM foods WHERE id = ANY($1::int[])',
    [foodIds]
  );
  const foodMap = {};
  foodsData.forEach(f => { foodMap[f.id] = f; });

  let totalCalories = typeof calories === 'number' ? calories : 0;
  for (const item of items) {
    const food = foodMap[item.foodId];
    if (!food) throw new Error(`Alimento con id ${item.foodId} no existe`);
    const calsPer100 = food.calories_per_100g || 0;
    totalCalories += (item.grams * calsPer100) / 100;
  }

  const { rows: recipeRows } = await pool.query(
    `INSERT INTO recipes (name, username, user_id, total_calories, steps, pic)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name.trim(), username, userId, totalCalories, steps || null, pic || null]
  );
  const recipe = toCamelCase(recipeRows[0]);
  const recipeId = recipe.id;

  await Promise.all(
    items.map(item => pool.query(
      'INSERT INTO recipe_items (recipe_id, food_id, grams) VALUES ($1, $2, $3)',
      [recipeId, item.foodId, item.grams]
    ))
  );

  const nutrients = await getRecipeNutrientsFromItems(items);
  return { ...recipe, nutrients };
}

// ---------- crear comunidad ----------
async function createCommunity({ userId, name, description }) {
  if (!userId || !name) throw new Error('Faltan campos obligatorios: userId y name');

  const { rows } = await pool.query(
    `INSERT INTO communities (user_id, name, description, subscribers)
     VALUES ($1, $2, $3, 1)
     RETURNING *`,
    [userId, name.trim(), description || null]
  );
  const community = toCamelCase(rows[0]);

  await pool.query(
    'INSERT INTO community_subscriptions (user_id, community_id) VALUES ($1, $2)',
    [userId, community.id]
  );

  return community;
}

// ---------- crear posteo en comunidad ----------
async function createPost({ userId, communityId, title, body, topic, photos }) {
  if (!userId || !communityId || !title || !body || !topic) {
    throw new Error('Faltan campos obligatorios: userId, communityId, title, body o topic');
  }

  const subRes = await pool.query(
    'SELECT 1 FROM community_subscriptions WHERE user_id = $1 AND community_id = $2',
    [userId, communityId]
  );
  if (subRes.rowCount === 0) throw new Error('El usuario no está suscripto a esta comunidad');

  const { rows: postRows } = await pool.query(
    `INSERT INTO communities_posts (user_id, community_id, title, body, topic)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, communityId, title.trim(), body, topic]
  );
  const post = toCamelCase(postRows[0]);

  if (Array.isArray(photos) && photos.length > 0) {
    
      const insertPromises = photos.map(url => pool.query(
        'INSERT INTO communities_posts_photos (post_id, url) VALUES ($1, $2)',
        [post.id, url]
        )
      );
      await Promise.all(insertPromises);
  }

  return post;
}

module.exports = {
  getFormattedDate,
  daysAgo,
  addConsumedFood,
  addConsumedWater,
  addDoneActivity,
  createRecipe,
  createCommunity,
  createPost
};
