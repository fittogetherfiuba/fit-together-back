/*
const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();
const bcrypt = require('bcrypt');
const { toCamelCase } = require('./utils');

function getFormattedDate() {
    const date = new Date()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  }

const app = express();
app.use(cors());
app.use(express.json()); // para parsear JSON
*/
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const activitiesRoutes = require('./routes/activities');
const usersRoutes      = require('./routes/users');
const waterRoutes      = require('./routes/water');
const foodsRoutes      = require('./routes/foods');
const goalsRoutes      = require('./routes/goals');
const loginRoutes      = require('./routes/login');
const registerRoutes   = require('./routes/register');
const recipesRoutes   = require('./routes/recipes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/activities', activitiesRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/water',      waterRoutes);
app.use('/api/foods',      foodsRoutes);
app.use('/api/goals',      goalsRoutes);
app.use('/api/login',      loginRoutes);
app.use('/api/register',   registerRoutes);
app.use('/api/recipes',     recipesRoutes)

app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});