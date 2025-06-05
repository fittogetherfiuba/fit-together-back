const pool = require('../db');

async function post('/users/:userId/diet-profiles', async (req, res) => {
  const { userId } = req.params;
  const { profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'Falta profileId en el body' });
  }

  try {
    await pool.query(
      `INSERT INTO user_diet_profiles (user_id, profile_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, profileId]
    );

    res.status(201).json({ message: 'Perfil agregado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar perfil al usuario' });
  }
});

module.exports = {  

};