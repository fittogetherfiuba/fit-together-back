const pool = require('../fit-together-back/db');

async function cleanUsersTable (req,res){
    try{
        await pool.query(`
      DELETE FROM friend_requests;
      DELETE FROM user_friends;
      DELETE FROM user_food_entries;
      DELETE FROM user_activity_entries;
      DELETE FROM user_goals;
      DELETE FROM water_entries;
      DELETE FROM recipe_items;
      DELETE FROM recipes;
      DELETE FROM users;

      DELETE FROM food_nutrients
      WHERE food_id IN (
        SELECT id FROM foods WHERE created_by_user_id IS NOT NULL
      );

      DELETE FROM foods
      WHERE created_by_user_id IS NOT NULL;

      DELETE FROM activities
      WHERE created_by_user_id IS NOT NULL;
    `);
    } catch(err){
        console.error(err);
        
    }
}

cleanUsersTable();