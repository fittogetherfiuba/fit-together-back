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

module.exports = {  
    addUsersDietProfile
};