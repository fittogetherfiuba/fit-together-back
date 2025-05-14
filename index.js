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

// Establecer objetivos
app.post('/api/goals', async (req, res) => {
    const { userId, goalId, goal } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId' });
    }

    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
        return res.status(400).json({ error: 'goalId inválido o vacío' });
    }

    if (goal === undefined) {
        return res.status(400).json({ error: 'Falta goal' });
    }

    if (typeof goal !== 'number') {
        return res.status(400).json({ error: 'goal debe ser un número' });
    }

    if (goal <= 0) {
        return res.status(400).json({ error: 'goal debe ser mayor a 0' });
    }

    try {
        const result = await pool.query(
            `
              INSERT INTO user_goals (user_id, goal_id, goal_value)
              VALUES ($1, $2, $3)
              ON CONFLICT (user_id, goal_id)
              DO UPDATE SET goal_value = EXCLUDED.goal_value
              RETURNING *;
            `,
            [userId, goalId, goal]
        );
      
        res.status(201).json({ message: 'Objetivo guardado', goal: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar objetivo en la base de datos' });
    }
});

// Agregar comida consumida
app.post('/api/foods/entry', async (req, res) => {
    const { userId, foodName, quantity, consumedAt } = req.body;

    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    if (!foodName || typeof foodName !== 'string') {
        return res.status(400).json({ error: 'foodName inválido o vacío' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'quantity debe ser un número mayor a 0' });
    }

    try {
        const foodResult = await pool.query(
            'SELECT id FROM foods WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [foodName.trim()]
        );

        if (foodResult.rows.length === 0) {
            return res.status(404).json({ error: 'El alimento no existe' });
        }

        const foodId = foodResult.rows[0].id;

        const insertResult = await pool.query(
            `INSERT INTO user_food_entries (user_id, food_id, quantity, consumed_at)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, foodId, quantity, consumedAt || new Date()]
        );

        res.status(201).json({ message: 'Comida registrada', entry: insertResult.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar la comida' });
    }
});

// Agregar comida
app.post('/api/foods', async (req, res) => {
    const { name, userId } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name inválido o vacío' });
    }

    const normalizedName = name.trim().toLowerCase();

    try {
        // Verificar si ya existe
        const existing = await pool.query(
            'SELECT * FROM foods WHERE LOWER(name) = $1 LIMIT 1',
            [normalizedName]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El alimento ya existe' });
        }

        // Insertar si no existe
        const result = await pool.query(
            `INSERT INTO foods (name, created_by_user_id)
             VALUES ($1, $2)
             RETURNING *`,
            [name.trim(), userId || null]
        );

        res.status(201).json({ message: 'Alimento creado', food: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear alimento' });
    }
});

// Ver comidas consumidas por un usuario
app.get('/api/foods/entry/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId' });
    }

    try {
        const result = await pool.query(
            `SELECT ufe.id, ufe.quantity, ufe.consumed_at, f.name AS food_name
             FROM user_food_entries ufe
             JOIN foods f ON ufe.food_id = f.id
             WHERE ufe.user_id = $1
             ORDER BY ufe.consumed_at DESC`,
            [userId]
        );
        res.json({ entries: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comidas del usuario' });
    }
});

// Ver comidas disponibles
app.get('/api/foods', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM foods ORDER BY name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener alimentos' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
