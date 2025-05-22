const pool = require('../db');


async function registerUser (res, req) {
    const { email, password, username, fullname } = req.body;
    if (!email || !password || !username || !fullname) return res.status(400).json({ error: 'Faltan campos' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password, username, fullname, registrationDay) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, hashedPassword, username, fullname, getFormattedDate()]
        );

        const user = result.rows[0];
        res.status(201).json({ username: user.username, userId: user.id });
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'El email ya está registrado' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
}

module.exports = {registerUser};