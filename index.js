const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json()); // para parsear JSON

app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// REGISTRO
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
            [email, hashedPassword]
        );

        res.status(201).json({ message: 'Usuario registrado', userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'El email ya está registrado' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        res.json({ message: 'Login exitoso', userId: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
