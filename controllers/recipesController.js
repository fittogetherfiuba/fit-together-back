const pool = require('../db');
const { toCamelCase } = require('../utils');

// 🔧 Helper para calcular nutrientes totales de una receta
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

// ✅ Crear una receta con ítems y nutrientes calculados
async function createRecipe(req, res) {
  const { userId, name, items, calories } = req.body;

  if (!userId || !name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos: userId, name o items' });
  }

  try {
    const foodIds = items.map(i => i.foodId);

    const { rows: foodsData } = await pool.query(
      `SELECT id, calories_per_100g FROM foods WHERE id = ANY($1::int[])`,
      [foodIds]
    );

    const foodMap = {};
    for (const food of foodsData) {
      foodMap[food.id] = food;
    }

    let totalCalories = calories;
    if (typeof totalCalories !== 'number') {
      totalCalories = 0;
      for (const item of items) {
        const food = foodMap[item.foodId];
        if (!food) {
          return res.status(400).json({ error: `Alimento con id ${item.foodId} no existe` });
        }
        const calsPer100 = food.calories_per_100g || 0;
        totalCalories += (item.grams * calsPer100) / 100;
      }
    }

    const { rows: recipeRows } = await pool.query(
      `INSERT INTO recipes (name, user_id, total_calories)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), userId, totalCalories]
    );
    const recipeId = recipeRows[0].id;

    const insertItems = items.map(item =>
      pool.query(
        `INSERT INTO recipe_items (recipe_id, food_id, grams)
         VALUES ($1, $2, $3)`,
        [recipeId, item.foodId, item.grams]
      )
    );
    await Promise.all(insertItems);

    const nutrients = await getRecipeNutrientsFromItems(items);

    res.status(201).json({
      message: 'Receta creada',
      recipe: {
        ...toCamelCase(recipeRows[0]),
        nutrients
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear receta' });
  }
}

// Obtener todas las recetas con ítems y nutrientes
async function getRecipes(req, res) {
    const { userId } = req.query;
  
    try {
      const queryBase = `
        SELECT r.id, r.name, r.user_id, r.total_calories, r.created_at
        FROM recipes r
        ${userId ? 'WHERE r.user_id = $1' : ''}
        ORDER BY r.created_at DESC
      `;
  
      const recipesQuery = await pool.query(queryBase, userId ? [userId] : []);
      const recipes = recipesQuery.rows;
  
      if (recipes.length === 0) {
        return res.json({ recipes: [] });
      }
  
      const recipeIds = recipes.map(r => r.id);
  
      const itemsQuery = await pool.query(`
        SELECT ri.recipe_id, ri.grams, f.id AS food_id, f.name AS food_name
        FROM recipe_items ri
        JOIN foods f ON ri.food_id = f.id
        WHERE ri.recipe_id = ANY($1::int[])
      `, [recipeIds]);
  
      const itemsByRecipe = {};
      for (const item of itemsQuery.rows) {
        if (!itemsByRecipe[item.recipe_id]) itemsByRecipe[item.recipe_id] = [];
        itemsByRecipe[item.recipe_id].push({
          foodId: item.food_id,
          foodName: item.food_name,
          grams: item.grams
        });
      }
  
      const enriched = await Promise.all(recipes.map(async (recipe) => {
        const items = itemsByRecipe[recipe.id] || [];
        const nutrients = await getRecipeNutrientsFromItems(items);
  
        return {
          id: recipe.id,
          name: recipe.name,
          userId: recipe.user_id,
          totalCalories: Number(recipe.total_calories),
          createdAt: recipe.created_at,
          items,
          nutrients
        };
      }));
  
      res.json({ recipes: enriched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener recetas' });
    }
  }


module.exports = { createRecipe, getRecipes };
