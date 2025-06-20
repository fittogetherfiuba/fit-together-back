const pool = require('../db');

async function cleanDatabase() {
  try {
    // -----------------------
    // Eliminar relaciones de usuario y datos asociados
    // -----------------------
    await pool.query(`
      -- Solicitudes y amistades
      DELETE FROM friend_requests;
      DELETE FROM user_friends;

      -- Entradas y registros de usuario
      DELETE FROM user_food_entries;
      DELETE FROM user_activity_entries;
      DELETE FROM user_goals;
      DELETE FROM water_entries;
      DELETE FROM recipe_items;
      DELETE FROM recipes;

      -- Perfiles de dieta de usuario
      DELETE FROM user_diet_profiles;


      DELETE FROM communities_posts_photos;
      DELETE FROM communities_posts_comments;
      DELETE FROM communities_posts;
      DELETE FROM community_subscriptions;
      DELETE FROM communities;

      -- Usuarios
      DELETE FROM users;

      -- -----------------------
      -- Eliminar contenidos creados por usuarios (con created_by_user_id NOT NULL)
      -- -----------------------

      -- Comidas y sus nutrientes asociados
      DELETE FROM food_nutrients
      WHERE food_id IN (
        SELECT id FROM foods WHERE created_by_user_id IS NOT NULL
      );
      DELETE FROM foods
      WHERE created_by_user_id IS NOT NULL;

      -- Actividades y sus registros de actividad asociados
      DELETE FROM user_activity_entries
      WHERE activity_id IN (
        SELECT id FROM activities WHERE created_by_user_id IS NOT NULL
      );
      DELETE FROM activities
      WHERE created_by_user_id IS NOT NULL;

      -- Perfiles de dieta creados por usuarios
      DELETE FROM diet_restrictions
      WHERE profile_id IN (
        SELECT id FROM diet_profiles WHERE created_by_user_id IS NOT NULL
      );
      DELETE FROM diet_profiles
      WHERE created_by_user_id IS NOT NULL;








      -- -----------------------
      -- Reiniciar secuencia de usuarios para que el próximo ID sea 1
      -- -----------------------
      ALTER SEQUENCE users_id_seq RESTART WITH 1;
    `);
    console.log('🧹 Base de datos limpiada y secuencias reiniciadas.');
  } catch (err) {
    console.error('❌ Error limpiando la base de datos:', err);
    process.exit(1);
  }
}

// Ejecución directa desde línea de comandos
if (require.main === module) {
  (async () => {
    await cleanDatabase();
    process.exit(0);
  })();
}

module.exports = { cleanDatabase };
