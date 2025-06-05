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

        res.status(201).json({ message: 'Perfil dietario agregado' });
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

module.exports = {  
    addUsersDietProfile,
    getDietProfiles,
    getUsersDietProfile
};