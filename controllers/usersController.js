const pool = require('../db');

async function getAllUsers(req,res) {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
}

async function updateUser  (req, res) {
    const { username } = req.params;
    const { fullname, birthday, weight, height, description } = req.body;

    try {
        const result = await pool.query(
            `
                UPDATE users
                SET
                    fullname = $1,
                    birthday = $2,
                    weight = $3,
                    height = $4,
                    description = $5
                WHERE username = $6
                    RETURNING 
        id, username, fullname, email, birthday, weight, height, description;
            `,
            [fullname, birthday, weight, height, description, username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado', user: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
}

async function getUserByUsername (req, res) {
    const { username } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
         id,
         username,
         fullname,
         email,
         birthday,
         weight,
         height,
         description, 
         registrationDay
       FROM users
       WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
}

module.exports = { getAllUsers, getUserByUsername, updateUser };
