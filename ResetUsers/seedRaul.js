// ResetUsers/seedRaul.js
const bcrypt = require('bcrypt');
const pool   = require('../db');

const SALT_ROUNDS = 10;
const PASSWORD    = 'administrador';
const EMAIL       = 'raul@admin.com';
const TODAY       = () => new Date(Date.now()).toISOString();
const daysAgoUTC  = d => new Date(Date.now() - d * 86_400_000).toISOString();

module.exports = async function seedRaul () {
  const passHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (email, username, password, fullname, registrationday, verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
     RETURNING id`,
    [EMAIL, 'raul', passHash, 'Raúl', TODAY()]
  );
  const userId = rows[0].id;

  await pool.query(
    `INSERT INTO user_goals (user_id, type, goal_value)
     VALUES  ($1, 'water', 2200),
             ($1, 'calories', 2000)
     ON CONFLICT (user_id, type) DO UPDATE SET goal_value = EXCLUDED.goal_value`,
    [userId]
  );

  const waterValues = Array.from({ length: 7 }, (_, i) =>
    `(${userId}, 350, '${daysAgoUTC(i)}')`
  ).join(',');
  await pool.query(
    `INSERT INTO water_entries (user_id, ml, created_at) VALUES ${waterValues}`
  );

  const foodIds = (await pool.query(`SELECT id FROM foods LIMIT 10`)).rows.map(r => r.id);
  const periods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  const foodValues = Array.from({ length: 40 }, (_, i) => {
    const date  = daysAgoUTC(i % 7);
    const grams = 110 + (i % 4) * 30;
    const food  = foodIds[i % foodIds.length];
    const per   = periods[i % periods.length];
    return `(${userId}, ${food}, ${grams}, '${per}', '${date}')`;
  }).join(',');
  await pool.query(
    `INSERT INTO user_food_entries
       (user_id, food_id, grams, period, created_at)
     VALUES ${foodValues}`
  );

  const actIds = (await pool.query(`SELECT id FROM activities LIMIT 4`)).rows.map(r => r.id);
  const actValues = actIds.map((id, i) =>
    `(${userId}, ${id}, ${20 + i * 10}, NULL, NULL, '${daysAgoUTC(i)}')`
  ).join(',');
  await pool.query(
    `INSERT INTO user_activity_entries
       (user_id, activity_id, minutes, sets, reps, created_at)
     VALUES ${actValues}`
  );
};
