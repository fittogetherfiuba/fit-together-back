const pool = require('../db');
const { toCamelCase } = require('../utils');


// Cantidad de agua consumida por el usuario en un día dado (sin dia dado -> dia acutal)
async function getWaterConsumedDaily (req,res) {
  const { userId, date } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Faltan userId' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters
       FROM water_entries
       WHERE user_id = $1
         AND consumed_at = $2::date`,
      [userId, date || new Date()]
    );

    res.json({ date, totalLiters: Number(rows[0].total_liters) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular agua diaria' });
  }
}

// Cantidad de agua consumida por el usuario desde ultimo dia hata dia acual
async function getWaterConsumedThisWeek (req,res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Falta userId en la query' });
  }

  const now = new Date();
  // 0 = domingo … 1 = lunes … 6 = sábado
  const todayDay = now.getDay();  // :contentReference[oaicite:0]{index=0}
  // Cuántos días restar para llegar al lunes
  const daysSinceMonday = (todayDay + 6) % 7;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);  // corte a medianoche
  const mondayStr = lastMonday.toISOString().slice(0, 10);

  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(liters), 0) AS total_liters
         FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= $2::date`,
      [userId, mondayStr]
    );

    return res.json({since: mondayStr, until: now.toISOString(), totalLiters: Number(rows[0].total_liters)});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al calcular agua desde el último lunes' });
  }
}

// Cargar agua consumida
async function addConsumedWater (req,res){
    const { userId, liters } = req.body;
  
    if (!userId || typeof liters !== 'number' || liters <= 0) {
      return res.status(400).json({ error: 'Datos inválidos: se requiere userId y liters > 0' });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO water_entries (user_id, liters)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, liters]
      );
  
      res.status(201).json({ message: 'Registro de agua guardado', entry: toCamelCase(result.rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar el consumo de agua' });
    }
}

// Obtener agua consumida
async function getWaterConsumed (req,res){
    const { userId, from, to } = req.query;
  
    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }
  
    try {
      const result = await pool.query(
        `
        SELECT * FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= COALESCE($2::date, '1970-01-01')
          AND consumed_at <= COALESCE($3::date, CURRENT_DATE)
        ORDER BY consumed_at DESC
        `,
        [userId, from || null, to || null]
      );
  
      res.json({ entries: toCamelCase(result.rows) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener registros de agua' });
    }
}


module.exports = { getWaterConsumedDaily, getWaterConsumedThisWeek, getWaterConsumed , addConsumedWater };