const pool = require('../db');

async function getAllUsers(req, res) {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
}

async function updateUser(req, res) {
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
                registrationDay,
                verified
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

async function verifyUser(req, res) {
    const { email, username, userId, code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Falta el código' });
    }

    if (!email && !username && !userId) {
        return res.status(400).json({ error: 'Debes enviar email, username o userId' });
    }

    try {
        const conditions = [];
        const values = [];

        if (userId) {
            conditions.push('id = $' + (values.length + 1));
            values.push(userId);
        }
        if (email) {
            conditions.push('email = $' + (values.length + 1));
            values.push(email);
        }
        if (username) {
            conditions.push('username = $' + (values.length + 1));
            values.push(username);
        }

        const whereClause = conditions.join(' OR ');

        const result = await pool.query(
            `SELECT id, email, verification_code, verified FROM users WHERE ${whereClause} LIMIT 1`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (user.verified) {
            return res.status(400).json({ error: 'Usuario ya verificado' });
        }

        if (user.verification_code !== code) {
            return res.status(401).json({ error: 'Código incorrecto' });
        }

        await pool.query(
            `UPDATE users
         SET verified = true, verification_code = NULL
         WHERE id = $1`,
            [user.id]
        );

        res.json({ message: 'Cuenta verificada con éxito', email: user.email });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al verificar usuario' });
    }
}

module.exports = { getAllUsers, getUserByUsername, updateUser, verifyUser };
