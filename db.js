const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.PRODUCTION === 'yes'

const pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
    ssl: isProduction ? { rejectUnauthorized: false} : false
});

module.exports = pool;
