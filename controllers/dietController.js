const pool = require('../db');

//agregar perfil dietario a usuario
async function addUsersDietProfile(req, res){
    const { userId, dietProfileName } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    if (!dietProfileName) {
        return res.status(400).json({ error: 'Falta dietProfileName' });
    }
    

    try {
        const { rows } = await pool.query(
            'SELECT id FROM diet_profiles WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [dietProfileName]
        );
        
        if (rows.length === 0){
            return res.status(400).json({error: 'el perfil no existe'});
        }
        
        const profileId = rows[0].id;

        await pool.query(
        `INSERT INTO user_diet_profiles (user_id, profile_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING`,
        [userId, profileId]
        );

        res.status(201).json({ message: 'Perfil dietario agregado - ' + dietProfileName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al agregar perfil dietario al usuario' });
    }
}


async function getDietProfiles (req, res){

    try {
        const { rows } = await pool.query(
        `SELECT dp.id AS profile_id,
                dp.name AS profile_name,
                COALESCE(
                    json_agg(json_build_object('id', f.id, 'name', f.name)
                            ORDER BY f.name)
                    FILTER (WHERE f.id IS NOT NULL),
                    '[]'
                ) AS restricted_foods
        FROM diet_profiles dp
        LEFT JOIN diet_restrictions dr ON dp.id = dr.profile_id
        LEFT JOIN foods f ON dr.food_id = f.id
        GROUP BY dp.id, dp.name
        ORDER BY dp.id`
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfiles' });
    }
}

async function getUsersDietProfile(req, res) {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    try {
        const { rows } = await pool.query(
        `SELECT dp.id AS profile_id,
                dp.name AS profile_name,
                COALESCE(
                    json_agg(json_build_object('id', f.id, 'name', f.name)
                            ORDER BY f.name)
                    FILTER (WHERE f.id IS NOT NULL),
                    '[]'
                ) AS restricted_foods
        FROM user_diet_profiles udp
        JOIN diet_profiles dp ON udp.profile_id = dp.id
        LEFT JOIN diet_restrictions dr ON dp.id = dr.profile_id
        LEFT JOIN foods f ON dr.food_id = f.id
        WHERE udp.user_id = $1
        GROUP BY dp.id, dp.name
        ORDER BY dp.id`,
        [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfiles del usuario' });
    }
}

async function getDietProfileOfFood(req, res) {
    const { food: identifier } = req.params;
    console.log(identifier);
    if (!identifier) return res.status(400).json({ error: 'Falta identificador de comida' });

    const foodId = parseInt(identifier, 10);
    const isNumeric = !isNaN(foodId);
    
    try {
        let query, params;

        if (isNumeric) {
        query = `SELECT dp.id, dp.name
                FROM diet_restrictions dr
                JOIN diet_profiles dp ON dr.profile_id = dp.id
                WHERE dr.food_id = $1
                ORDER BY dp.name`;
        params = [foodId];
        } else {
        query = `SELECT dp.id, dp.name
                FROM diet_restrictions dr
                JOIN diet_profiles dp ON dr.profile_id = dp.id
                JOIN foods f ON dr.food_id = f.id
                WHERE f.name ILIKE $1
                ORDER BY dp.name`;
        params = [identifier];
        }

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfiles para la comida' });
    }
}



// Body: { "foodIds": [2, 4, 13] }
async function getDietProfileOfListedFoods(req, res) {
  const { foodIds } = req.body ?? {};

  if (!Array.isArray(foodIds) || foodIds.length === 0)
    return res.status(400).json({ error: 'El cuerpo debe incluir "foodIds" como arreglo' });

  // Validar que todos sean enteros
  const ids = foodIds.map(n => parseInt(n, 10));
  if (ids.some(Number.isNaN))
    return res.status(400).json({ error: 'Todos los elementos de "foodIds" deben ser enteros válidos' });

  try {
    const query = `
      SELECT DISTINCT dp.id, dp.name
      FROM diet_restrictions dr
      JOIN diet_profiles dp ON dr.profile_id = dp.id
      WHERE dr.food_id = ANY($1::int[])
      ORDER BY dp.name;`;
    const { rows } = await pool.query(query, [ids]);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener perfiles para la lista de alimentos' });
  }
}


//Body esperado:{"name": "keto","restrictedFoods": [3, "Carne vacuna", 14]}
async function createDietProfile(req, res){
    const { userId } = req.params;
    const { name, restrictedFoods } = req.body || {};

    if (!name || !Array.isArray(restrictedFoods) || restrictedFoods.length === 0) {
        return res.status(400).json({ error: 'name y restrictedFoods son requeridos' });
    }
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar si el perfil ya existe (case‑insensitive)
        const existing = await client.query(
        'SELECT id FROM diet_profiles WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [name]
        );
        if (existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'El perfil ya existe' });
        }

        // 2. Crear nuevo perfil
        const insertProfile = await client.query(
        `INSERT INTO diet_profiles (name, created_by_user_id)
        VALUES ($1, $2)
        RETURNING id, name`,
        [name, userId]
        );
        const profileId = insertProfile.rows[0].id;

        // 3. Mapear restrictedFoods a IDs
        const foodIds = [];
        for (const item of restrictedFoods) {
        if (Number.isInteger(item)) {
            foodIds.push(item);
        } else if (typeof item === 'string') {
            const foodRes = await client.query('SELECT id FROM foods WHERE name ILIKE $1 LIMIT 1', [item]);
            if (!foodRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Comida no encontrada: ${item}` });
            }
            foodIds.push(foodRes.rows[0].id);
        }
        }

        // 4. Insertar restricciones (evitar duplicados con ON CONFLICT)
        for (const fid of foodIds) {
        await client.query(
            'INSERT INTO diet_restrictions (profile_id, food_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [profileId, fid]
        );
        }

        // 5. Asignar el perfil al usuario
        await client.query(
        'INSERT INTO user_diet_profiles (user_id, profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, profileId]
        );

        await client.query('COMMIT');
        res.status(201).json({ id: profileId, name, restrictedFoods: foodIds });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al crear perfil' });
    } finally {
        client.release();
    }
}

async function deleteUsersDietProfile(req, res){
    const { userId } = req.params;
    const { profileId } = req.body;
    if (!userId || !profileId)
        return res.status(400).json({ error: 'Falta UserId o Diet ProfileId'});
    try {
        const { rowCount } = await pool.query(
        `DELETE FROM user_diet_profiles
        WHERE user_id = $1 AND profile_id = $2`,
        [userId, profileId]
        );

        if (rowCount === 0) return res.status(404).json({ error: 'Relación no existe' });

        res.json({ message: 'Perfil eliminado del usuario' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
}

async function getUserRestrictedFoods(req, res) {
  const { userId } = req.params;
  if (!userId)
        return res.status(400).json({ error: 'Falta UserId' });
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT f.id, f.name
       FROM user_diet_profiles udp
       JOIN diet_restrictions dr ON udp.profile_id = dr.profile_id
       JOIN foods f              ON dr.food_id = f.id
       WHERE udp.user_id = $1
       ORDER BY f.name;`,
      [userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener comidas restringidas del usuario' });
  }
}

module.exports = {  
    addUsersDietProfile,
    getDietProfiles,
    getUsersDietProfile,
    getDietProfileOfFood,
    getDietProfileOfListedFoods,
    createDietProfile,
    deleteUsersDietProfile,
    getUserRestrictedFoods
};