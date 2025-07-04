const pool = require('../db');
const bcrypt = require('bcrypt');
const { sendVerificationEmail } = require('../utils');

function getFormattedDate() {
    const date = new Date()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
}

async function registerUser (req, res) {
    const { email, password, username, fullname, imageUrl, emailVerified } = req.body;
    if (!email || !password || !username || !fullname) {
        return res.status(400).json({ error: 'Faltan campos' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const code = emailVerified ? null : generateVerificationCode(); // no necesita código si ya viene verificado

        const image = imageUrl ? imageUrl : 'https://i.postimg.cc/K8yZ8Mpn/user-icon-white-background.png';
        const verified = emailVerified === true;

        const result = await pool.query(
            `INSERT INTO users (email, password, username, fullname, registrationDay, image_url, verified, verification_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, email`,
            [email, hashedPassword, username, fullname, getFormattedDate(), image, verified, code]
        );

        const user = result.rows[0];

        if (!verified) {
            await sendVerificationEmail(user.email, code);
        }

        console.log(user);
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

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

module.exports = {registerUser, sendVerificationEmail};