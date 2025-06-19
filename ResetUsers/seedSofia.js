// ResetUsers/seedSofia.js
const bcrypt = require('bcrypt');
const pool   = require('../db');          // Ajusta si tu conexión vive en otro path

const SALT_ROUNDS = 10;
const PASSWORD    = 'administrador';
const EMAIL       = 'sofia@admin.com';
const TODAY       = () => new Date(Date.now()).toISOString();
const daysAgoUTC  = d => new Date(Date.now() - d * 86_400_000).toISOString();

module.exports = async function seedSofia () {
  // ── 1 · Alta (o actualización) del usuario
  const passHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (email, username, password, fullname, registrationday, verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
     RETURNING id`,
    [EMAIL, 'sofia', passHash, 'Sofia', TODAY()]
  );
  const userId = rows[0].id;

  // ── 2 · Objetivos
  await pool.query(
    `INSERT INTO user_goals (user_id, type, goal_value)
     VALUES  ($1, 'water', 2500),
             ($1, 'calories', 2200)
     ON CONFLICT (user_id, type) DO UPDATE SET goal_value = EXCLUDED.goal_value`,
    [userId]
  );

  // ── 3 · Entradas de agua (7 días)
  const waterValues = Array.from({ length: 7 }, (_, i) =>
    `(${userId}, 400, '${daysAgoUTC(i)}')`
  ).join(',');
  await pool.query(
    `INSERT INTO water_entries (user_id, ml, created_at) VALUES ${waterValues}`
  );

  // ── 4 · Entradas de comida (40)
  const foodIds = (await pool.query(`SELECT id FROM foods LIMIT 10`)).rows.map(r => r.id);
  const periods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  const foodValues = Array.from({ length: 40 }, (_, i) => {
    const date  = daysAgoUTC(i % 7);
    const grams = 100 + (i % 4) * 50;              // 100-250 g
    const food  = foodIds[i % foodIds.length];
    const per   = periods[i % periods.length];
    return `(${userId}, ${food}, ${grams}, '${per}', '${date}')`;
  }).join(',');
  await pool.query(
    `INSERT INTO user_food_entries
       (user_id, food_id, grams, period, created_at)
     VALUES ${foodValues}`
  );

  // ── 5 · Actividades (4)
  const actIds = (await pool.query(`SELECT id FROM activities LIMIT 4`)).rows.map(r => r.id);
  const actValues = actIds.map((id, i) =>
    `(${userId}, ${id}, ${30 + i * 10}, NULL, NULL, '${daysAgoUTC(i)}')`
  ).join(',');
  await pool.query(
    `INSERT INTO user_activity_entries
       (user_id, activity_id, minutes, sets, reps, created_at)
     VALUES ${actValues}`
  );
};
