// ResetUsers/resetUsers.js
const pool        = require('../db');
const seedSofia   = require('./seedSofia');
const seedMariano = require('./seedMariano');
const seedRaul    = require('./seedRaul');

/**
 * Limpia SOLO la información asociada a usuarios.
 * Usa transacción + TRUNCATE para evitar condiciones de carrera.
 */
async function cleanUsersData () {
  await pool.query('BEGIN');
  try {
    await pool.query(`
      TRUNCATE
        user_food_entries,
        user_activity_entries,
        water_entries,
        friend_requests,
        user_friends,
        user_goals
      RESTART IDENTITY CASCADE;

      -- Ítems creados por usuarios (dejamos catálogo intacto)
      DELETE FROM foods      WHERE created_by_user_id IS NOT NULL;
      DELETE FROM activities WHERE created_by_user_id IS NOT NULL;

      TRUNCATE users RESTART IDENTITY CASCADE;
    `);

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

(async () => {
  try {
    await cleanUsersData();      // ¡ahora sí con await!
    await seedSofia();
    await seedMariano();
    await seedRaul();
    console.log('✅ Base limpiada y usuarios de demo recreados');
  } catch (err) {
    console.error('❌ Error sembrando datos:', err);
    process.exit(1);
  } finally {
    await pool.end();            // libera conexiones
  }
})();
