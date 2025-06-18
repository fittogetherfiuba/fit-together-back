// resetUsers.js  – añadí / reemplazá con este contenido

const bcrypt = require('bcrypt');
const pool = require('../fit-together-back/db');
const { toCamelCase } = require('../fit-together-back/utils');

// ---------- utilidades ---------- //
function getFormattedDate() {
  const date = new Date();
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function cleanUsersTable(req, res) {
  try {
    await pool.query(`
      DELETE FROM friend_requests;
      DELETE FROM user_friends;
      DELETE FROM user_food_entries;
      DELETE FROM user_activity_entries;
      DELETE FROM user_goals;
      DELETE FROM water_entries;
      DELETE FROM recipe_items;
      DELETE FROM recipes;
      DELETE FROM users;

      DELETE FROM food_nutrients
      WHERE food_id IN (
        SELECT id FROM foods WHERE created_by_user_id IS NOT NULL
      );

      DELETE FROM foods
      WHERE created_by_user_id IS NOT NULL;

      DELETE FROM activities
      WHERE created_by_user_id IS NOT NULL;
    `);

    console.log("Limpieza completada");

  } catch (err) {
    console.error("❌ Error en la limpieza o inserción:", err);
    if (res) res.status(500).json({ error: 'Fallo en la limpieza o inserción' });
  }
}

// ---------- CRUD auxiliares ---------- //
async function registerUser(email, username, password, fullname) {
  const hashedPassword = await bcrypt.hash(password, 10);

  // crea el usuario o, si existe el e-mail, devuelve el id existente
  const { rows } = await pool.query(
    `
    WITH upsert AS (
      INSERT INTO users (email, username, fullname, password, registrationDay, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    )
    SELECT id FROM upsert
    UNION
    SELECT id FROM users WHERE email = $1
    LIMIT 1;
    `,
    [email, username, fullname, hashedPassword, getFormattedDate(), 'https://i.postimg.cc/K8yZ8Mpn/user-icon-white-background.png']
  );

  return rows[0].id;   // siempre habrá un id válido aquí


}

  async function registrarComidaConsumida({ userId, foodName, grams, consumedAt, period }) {
    if (!userId) throw new Error('Falta userId');
    if (!foodName || typeof foodName !== 'string') {
      throw new Error('foodName inválido o vacío');
    }
    if (typeof grams !== 'number' || grams <= 0) {
      throw new Error('grams debe ser un número mayor a 0');
    }
  
    const allowedPeriods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
    let normalizedPeriod = null;
  
    if (period) {
      normalizedPeriod = period.toLowerCase();
      if (!allowedPeriods.includes(normalizedPeriod)) {
        throw new Error('period inválido. Debe ser desayuno, almuerzo, merienda o cena');
      }
    }
  
    try {
      const foodResult = await pool.query(
        'SELECT id, calories_per_100g FROM foods WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [foodName.trim()]
      );
  
      if (foodResult.rows.length === 0) {
        throw new Error('El alimento no existe');
      }
  
      const { id: foodId, calories_per_100g } = foodResult.rows[0];
      const calories = calories_per_100g ? (grams * calories_per_100g) / 100 : null;
  
      const insertResult = await pool.query(
        `INSERT INTO user_food_entries (user_id, food_id, grams, calories, consumed_at, period)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, foodId, grams, calories, consumedAt || new Date(), normalizedPeriod]
      );
  
      return {
        message: 'Comida registrada',
        entry: toCamelCase(insertResult.rows[0])
      };
  
    } catch (err) {
      console.error("Error en registrarComidaConsumida:", err);
      throw err;
    }
  }


async function registrarConsumoAgua({ userId, liters, consumedAt }) {
  if (!userId || typeof liters !== 'number' || liters <= 0) {
    throw new Error('Datos inválidos: userId y liters > 0');
  }
  const res = await pool.query(
    `INSERT INTO water_entries (user_id, liters, consumed_at)
     VALUES ($1, $2, $3)
     RETURNING *;`,
    [userId, liters, consumedAt || new Date()]
  );
  return toCamelCase(res.rows[0]);
}

async function definirObjetivoUsuario({ userId, type, goal }) {
  const allowedTypes = ['calories', 'water'];
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : null;

  if (!userId) throw new Error('Falta userId');
  if (!normalizedType || !allowedTypes.includes(normalizedType)) {
    throw new Error('type inválido. Debe ser "calories" o "water"');
  }
  if (goal === undefined || typeof goal !== 'number' || goal <= 0) {
    throw new Error('goal debe ser un número mayor a 0');
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO user_goals (user_id, type, goal_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, type)
      DO UPDATE SET goal_value = EXCLUDED.goal_value
      RETURNING *;
      `,
      [userId, normalizedType, goal]
    );

    return {
      message: 'Objetivo guardado',
      goal: toCamelCase(result.rows[0])
    };

  } catch (err) {
    console.error("Error en definirObjetivoUsuario:", err);
    throw err;
  }
}

async function registrarActividadRealizada({
  userId,
  activityName,
  durationMinutes,
  distanceKm,
  series,
  repetitions,
  performedAt,
  caloriesBurned
}) {
  const actRes = await pool.query(
    'SELECT id FROM activities WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [activityName]
  );
  if (actRes.rows.length === 0) throw new Error('Actividad no existe');

  const activityId = actRes.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO user_activity_entries
     (user_id, activity_id, duration_minutes, distance_km, series,
      repetitions, performed_at, calories_burned)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      userId,
      activityId,
      durationMinutes || null,
      distanceKm || null,
      series || null,
      repetitions || null,
      performedAt || new Date(),
      caloriesBurned || null
    ]
  );
  return toCamelCase(ins.rows[0]);
}

async function registerUsers0FoodsEntries({id}){
      // ---------- día 0 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 140, period: 'desayuno', consumedAt: daysAgo(0) });
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo',  consumedAt: daysAgo(0) });
    await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 120, period: 'merienda',  consumedAt: daysAgo(0) });

    // ---------- día 1 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno', consumedAt: daysAgo(1) });
    await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 250, period: 'almuerzo', consumedAt: daysAgo(1) });
    await registrarComidaConsumida({ userId: id, foodName: 'Pasta',    grams: 200, period: 'cena',     consumedAt: daysAgo(1) });

    // ---------- día 2 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo', consumedAt: daysAgo(2) });
    await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 120, period: 'merienda', consumedAt: daysAgo(2) });

    // ---------- día 3 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 140, period: 'desayuno', consumedAt: daysAgo(3) });

    // ---------- día 4 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno', consumedAt: daysAgo(4) });
    await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 250, period: 'almuerzo', consumedAt: daysAgo(4) });
    await registrarComidaConsumida({ userId: id, foodName: 'Pasta',    grams: 200, period: 'cena',     consumedAt: daysAgo(4) });

    // ---------- día 5 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo', consumedAt: daysAgo(5) });
    await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 120, period: 'merienda', consumedAt: daysAgo(5) });

    // ---------- día 6 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 140, period: 'desayuno', consumedAt: daysAgo(6) });

    // ---------- día 7 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno', consumedAt: daysAgo(7) });
    await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 250, period: 'almuerzo', consumedAt: daysAgo(7) });
    await registrarComidaConsumida({ userId: id, foodName: 'Pasta',    grams: 200, period: 'cena',     consumedAt: daysAgo(7) });

    // ---------- día 8 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo', consumedAt: daysAgo(8) });
    await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 120, period: 'merienda', consumedAt: daysAgo(8) });

    // ---------- día 9 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 140, period: 'desayuno', consumedAt: daysAgo(9) });

    // ---------- día 10 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno', consumedAt: daysAgo(10) });
    await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 250, period: 'almuerzo', consumedAt: daysAgo(10) });
    await registrarComidaConsumida({ userId: id, foodName: 'Pasta',    grams: 200, period: 'cena',     consumedAt: daysAgo(10) });

    // ---------- día 11 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo', consumedAt: daysAgo(11) });
    await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 120, period: 'merienda', consumedAt: daysAgo(11) });

    // ---------- día 12 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 140, period: 'desayuno', consumedAt: daysAgo(12) });

    // ---------- día 13 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno', consumedAt: daysAgo(13) });
    await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 250, period: 'almuerzo', consumedAt: daysAgo(13) });

    // ---------- día 14 ----------
    await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 200, period: 'almuerzo', consumedAt: daysAgo(14) });

}

async function registerUsers0ActivitiesEntries({id}) {
  // ===== CARDIO (17 nuevas) =====
await registrarActividadRealizada({ userId: id, activityName: 'Correr',     durationMinutes: 28, distanceKm: 5,  performedAt: daysAgo(4),  caloriesBurned: 160 });
await registrarActividadRealizada({ userId: id, activityName: 'Correr',     durationMinutes: 30, distanceKm: 6,  performedAt: daysAgo(6),  caloriesBurned: 180 });
await registrarActividadRealizada({ userId: id, activityName: 'Correr',     durationMinutes: 27, distanceKm: 5,  performedAt: daysAgo(10), caloriesBurned: 165 });
await registrarActividadRealizada({ userId: id, activityName: 'Correr',     durationMinutes: 32, distanceKm: 6,  performedAt: daysAgo(15), caloriesBurned: 190 });
await registrarActividadRealizada({ userId: id, activityName: 'Correr',     durationMinutes: 29, distanceKm: 5,  performedAt: daysAgo(20), caloriesBurned: 170 });

await registrarActividadRealizada({ userId: id, activityName: 'Burpees',    durationMinutes: 15,                    performedAt: daysAgo(0),  caloriesBurned: 120 });
await registrarActividadRealizada({ userId: id, activityName: 'Burpees',    durationMinutes: 14,                    performedAt: daysAgo(5),  caloriesBurned: 115 });
await registrarActividadRealizada({ userId: id, activityName: 'Burpees',    durationMinutes: 16,                    performedAt: daysAgo(12), caloriesBurned: 125 });
await registrarActividadRealizada({ userId: id, activityName: 'Burpees',    durationMinutes: 17,                    performedAt: daysAgo(22), caloriesBurned: 130 });

await registrarActividadRealizada({ userId: id, activityName: 'Nadar',      durationMinutes: 40, distanceKm: 1,    performedAt: daysAgo(8),  caloriesBurned: 200 });
await registrarActividadRealizada({ userId: id, activityName: 'Nadar',      durationMinutes: 38, distanceKm: 1,    performedAt: daysAgo(14), caloriesBurned: 190 });
await registrarActividadRealizada({ userId: id, activityName: 'Nadar',      durationMinutes: 42, distanceKm: 1.1,  performedAt: daysAgo(18), caloriesBurned: 205 });
await registrarActividadRealizada({ userId: id, activityName: 'Nadar',      durationMinutes: 41, distanceKm: 1,    performedAt: daysAgo(25), caloriesBurned: 200 });

await registrarActividadRealizada({ userId: id, activityName: 'Bicicleta',  durationMinutes: 60, distanceKm: 18,   performedAt: daysAgo(7),  caloriesBurned: 350 });
await registrarActividadRealizada({ userId: id, activityName: 'Bicicleta',  durationMinutes: 55, distanceKm: 16,   performedAt: daysAgo(11), caloriesBurned: 330 });
await registrarActividadRealizada({ userId: id, activityName: 'Bicicleta',  durationMinutes: 62, distanceKm: 19,   performedAt: daysAgo(17), caloriesBurned: 360 });
await registrarActividadRealizada({ userId: id, activityName: 'Bicicleta',  durationMinutes: 58, distanceKm: 17,   performedAt: daysAgo(28), caloriesBurned: 340 });

// ===== MUSCULACIÓN (13 nuevas) =====
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 4, repetitions: 12, performedAt: daysAgo(3),  caloriesBurned: 90  });
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 5, repetitions: 10, performedAt: daysAgo(9),  caloriesBurned: 95  });
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 4, repetitions: 12, performedAt: daysAgo(13), caloriesBurned: 90  });
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 5, repetitions: 11, performedAt: daysAgo(19), caloriesBurned: 100 });
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 4, repetitions: 12, performedAt: daysAgo(24), caloriesBurned: 95  });
await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 5, repetitions: 12, performedAt: daysAgo(29), caloriesBurned: 100 });

await registrarActividadRealizada({ userId: id, activityName: 'Sentadillas',series: 4, repetitions: 12, performedAt: daysAgo(5),  caloriesBurned: 110 });
await registrarActividadRealizada({ userId: id, activityName: 'Sentadillas',series: 4, repetitions: 12, performedAt: daysAgo(16), caloriesBurned: 115 });
await registrarActividadRealizada({ userId: id, activityName: 'Sentadillas',series: 4, repetitions: 12, performedAt: daysAgo(23), caloriesBurned: 110 });

await registrarActividadRealizada({ userId: id, activityName: 'Plancha',    series: 4, repetitions: 45, performedAt: daysAgo(6),  caloriesBurned: 80  });
await registrarActividadRealizada({ userId: id, activityName: 'Plancha',    series: 4, repetitions: 50, performedAt: daysAgo(12), caloriesBurned: 85  });
await registrarActividadRealizada({ userId: id, activityName: 'Plancha',    series: 4, repetitions: 45, performedAt: daysAgo(21), caloriesBurned: 80  });
await registrarActividadRealizada({ userId: id, activityName: 'Plancha',    series: 5, repetitions: 50, performedAt: daysAgo(26), caloriesBurned: 90  });
}

// ---------- funciones de seed ---------- //
async function seedAdmin0() {
  const id = await registerUser(
    'admin0@admin.com',
    'administrador0',
    '123456',
    'admin0 admin0'
  );

  // goals
  await definirObjetivoUsuario({ userId: id, type: 'water',    goal: 2.5 });
  await definirObjetivoUsuario({ userId: id, type: 'calories', goal: 2400 });

  // comidas (6)
  await registerUsers0FoodsEntries({id: id});

  // agua (4)
  await registrarConsumoAgua({ userId: id, liters: 0.7, consumedAt: daysAgo(0) });
  await registrarConsumoAgua({ userId: id, liters: 1.0, consumedAt: daysAgo(1) });
  await registrarConsumoAgua({ userId: id, liters: 0.8, consumedAt: daysAgo(2) });
  await registrarConsumoAgua({ userId: id, liters: 1.2, consumedAt: daysAgo(3) });

  // actividades (4)
  await registerUsers0ActivitiesEntries({id: id});
}

async function seedAdmin1() {
  const id = await registerUser(
    'admin1@admin.com',
    'administrador1',
    '123456',
    'admin1 admin1'
  );

  await definirObjetivoUsuario({ userId: id, type: 'water',    goal: 3.0 });
  await definirObjetivoUsuario({ userId: id, type: 'calories', goal: 2600 });

  await registrarComidaConsumida({ userId: id, foodName: 'Pasta',  grams: 180, period: 'almuerzo',  consumedAt: daysAgo(0) });
  await registrarComidaConsumida({ userId: id, foodName: 'Huevos', grams: 100, period: 'desayuno',  consumedAt: daysAgo(0) });
  await registrarComidaConsumida({ userId: id, foodName: 'Tomate', grams: 90,  period: 'merienda',  consumedAt: daysAgo(1) });
  await registrarComidaConsumida({ userId: id, foodName: 'Leche',  grams: 250, period: 'desayuno',  consumedAt: daysAgo(2) });
  await registrarComidaConsumida({ userId: id, foodName: 'Queso',  grams: 60,  period: 'cena',      consumedAt: daysAgo(2) });
  await registrarComidaConsumida({ userId: id, foodName: 'Lentejas', grams: 220, period: 'almuerzo', consumedAt: daysAgo(3) });

  await registrarConsumoAgua({ userId: id, liters: 1.1, consumedAt: daysAgo(0) });
  await registrarConsumoAgua({ userId: id, liters: 0.9, consumedAt: daysAgo(1) });
  await registrarConsumoAgua({ userId: id, liters: 1.0, consumedAt: daysAgo(2) });
  await registrarConsumoAgua({ userId: id, liters: 1.4, consumedAt: daysAgo(4) });

  await registrarActividadRealizada({ userId: id, activityName: 'Nadar',      durationMinutes: 30, distanceKm: 1, performedAt: daysAgo(0), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Bicicleta',  durationMinutes: 50, distanceKm: 15, performedAt: daysAgo(1), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Flexiones',  series: 3, repetitions: 15, performedAt: daysAgo(2), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Plancha',    durationMinutes: 5, performedAt: daysAgo(3), caloriesBurned: 10  });
}

async function seedAdmin2() {
  const id = await registerUser(
    'admin2@admin.com',
    'administrador2',
    '123456',
    'admin2 admin2'
  );

  await definirObjetivoUsuario({ userId: id, type: 'water',    goal: 2.2 });
  await definirObjetivoUsuario({ userId: id, type: 'calories', goal: 2000 });

  await registrarComidaConsumida({ userId: id, foodName: 'Avena',    grams: 70,  period: 'desayuno',  consumedAt: daysAgo(0) });
  await registrarComidaConsumida({ userId: id, foodName: 'Banana',   grams: 120, period: 'merienda',  consumedAt: daysAgo(0) });
  await registrarComidaConsumida({ userId: id, foodName: 'Pollo',    grams: 150, period: 'almuerzo',  consumedAt: daysAgo(1) });
  await registrarComidaConsumida({ userId: id, foodName: 'Arroz',    grams: 200, period: 'cena',      consumedAt: daysAgo(1) });
  await registrarComidaConsumida({ userId: id, foodName: 'Manzana',  grams: 100, period: 'merienda',  consumedAt: daysAgo(2) });
  await registrarComidaConsumida({ userId: id, foodName: 'Yogur',    grams: 180, period: 'desayuno',  consumedAt: daysAgo(4) });

  await registrarConsumoAgua({ userId: id, liters: 0.6, consumedAt: daysAgo(0) });
  await registrarConsumoAgua({ userId: id, liters: 1.3, consumedAt: daysAgo(1) });
  await registrarConsumoAgua({ userId: id, liters: 0.7, consumedAt: daysAgo(2) });
  await registrarConsumoAgua({ userId: id, liters: 1.1, consumedAt: daysAgo(5) });

  await registrarActividadRealizada({ userId: id, activityName: 'Burpees',     series: 4, repetitions: 10, performedAt: daysAgo(0), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Abdominales', series: 3, repetitions: 20, performedAt: daysAgo(1), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Caminar',     durationMinutes: 30, distanceKm: 2, performedAt: daysAgo(3), caloriesBurned: 10  });
  await registrarActividadRealizada({ userId: id, activityName: 'Yoga',        durationMinutes: 45, performedAt: daysAgo(6), caloriesBurned: 10  });
}

// ---------- ejecución ---------- //
(async () => {
  try {
    cleanUsersTable();
    await seedAdmin0();
    await seedAdmin1();
    await seedAdmin2();
    console.log('🙌 Todos los usuarios de prueba y sus datos fueron creados.');
    process.exit();
  } catch (err) {
    console.error('❌ Error sembrando datos:', err);
    process.exit(1);
  }
})();
