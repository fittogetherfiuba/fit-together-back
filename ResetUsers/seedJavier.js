// seedJavier.js
// Seeder para usuario Javier: crea el usuario y le agrega entradas de comida, actividad, agua, recetas, comunidad y posteos.

const pool = require('../db');
const bcrypt = require('bcrypt');
const {
  daysAgo,
  addConsumedFood,
  addConsumedWater,
  addDoneActivity,
  createRecipe,
  createCommunity,
  createPost
} = require('./userCreation');

async function seedJavier() {
  // 1. Crear usuario Javier
  const email = 'javier@admin.com';
  const username = 'javier';
  const fullname = 'Javier Admin';
  const emailVerified = true;
  const imageUrl = `data:image/jpeg;base64,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`
  const rawPassword = 'testeo';
  const hashed = await bcrypt.hash(rawPassword, 10);

  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email, username, password, fullname, registrationDay, image_url, verified, verification_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [email, username, hashed, fullname, daysAgo(30), imageUrl, emailVerified, null]
  );
  const userId = userRows[0].id;
  console.log(`Usuario Javier creado con id=${userId}`);

  // 2. Entradas de comida: 30 días para desayuno, almuerzo, merienda y cena
  const periods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  const desayunoOptions = ['Cereal de desayuno','Leche','Banana','Pan integral','Avena','Huevos','Manzana','Jugo de naranja'];
  const almuerzoOptions = ['Arroz','Pollo','Lentejas','Pasta','Tomate','Lechuga','Carne vacuna','Queso'];
  const meriendaOptions = ['Yogur','Frutilla','Chocolate negro','Almendras','Pan integral','Queso cottage','Banana'];
  const cenaOptions = ['Pescado','Tofu','Brocoli','Zanahoria','Papa','Carne de cerdo','Arroz'];
  const periodOptions = [desayunoOptions, almuerzoOptions, meriendaOptions, cenaOptions];

  for (let i = 0; i < periodOptions.length; i++) {
    const foodOptions = periodOptions[i];
    const period = periods[i];
    for (let j = 0; j < 30; j++) {
      const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
      const grams    = Math.floor(Math.random() * 200) + 50;
      const consumedAt = daysAgo(Math.floor(Math.random() * 30));
      await addConsumedFood({ userId, foodName, grams, consumedAt, period });
    }
  }
  console.log('✅ 30 * 4 entradas de comida agregadas');

  // 3. Entradas de actividad: 15 actividades variadas
  const activityOptions = ['Caminar','Correr','Nadar','Bicicleta','Sentadillas','Flexiones','Plancha','Burpees','Abdominales','Yoga','Biceps','Triceps','Espalda','Pecho','Hombros','Piernas','Eliptica','Remo','Escaladora','Boxeo','HIIT'];
  for (let i = 0; i < 15; i++) {
    const name = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    const result = await pool.query(
      `SELECT type, calories_burn_rate
       FROM activities
       WHERE name = $1
       LIMIT 1`,
      [name]
    );
    if (result.rows.length === 0) {
      console.warn(`Actividad no encontrada: ${name}`);
      continue;
    }
    const { type, calories_burn_rate: rate } = result.rows[0];
    let durationMinutes = null;
    let distanceKm      = null;
    let series          = null;
    let repetitions     = null;
    let caloriesBurned  = null;
    function getRandomIntInclusive(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    switch (type) {
      case 'cardio':
        durationMinutes = getRandomIntInclusive(20, 79);
        distanceKm      = getRandomIntInclusive(1, 7);
        caloriesBurned  = rate * durationMinutes;
        break;
      case 'musculacion':
        repetitions    = getRandomIntInclusive(5, 14);
        series         = getRandomIntInclusive(2, 4);
        caloriesBurned = rate * repetitions;
        break;
      default:
        console.warn(`Tipo desconocido: ${type}`);
    }
    const performedAt = daysAgo(getRandomIntInclusive(0, 29));
    await addDoneActivity({ userId, activityName: name, durationMinutes, distanceKm, series, repetitions, performedAt, caloriesBurned });
  }
  console.log('✅ 15 entradas de actividad agregadas');

  // 4. Entradas de agua: 30 días, 1.5-2.5 L diarias
  for (let d = 0; d < 30; d++) {
    const consumedAt = daysAgo(d);
    const liters = +(Math.random() * (2.5 - 1.5) + 1.5).toFixed(2);
    await addConsumedWater({ userId, liters, consumedAt });
  }
  console.log('✅ 30 entradas de agua agregadas');

  // 5. Recetas de ejemplo
  const { rows: foods } = await pool.query('SELECT id, name FROM foods');
  const mapId = {};
  foods.forEach(f => { mapId[f.name] = f.id; });

  await createRecipe({
    userId,
    username,
    name: 'Ensalada rápida de pollo',
    items: [
      { foodId: mapId['Lechuga'], grams: 50 },
      { foodId: mapId['Tomate'], grams: 50 },
      { foodId: mapId['Pollo'], grams: 100 },
      { foodId: mapId['Aceite de oliva'], grams: 10 }
    ],
    steps: `Cortar la lechuga y el tomate
Agregar el pollo cocido
Aliñar con aceite de oliva`,
    pic: null
  });

  await createRecipe({
    userId,
    username,
    name: 'Tazón de avena y frutas',
    items: [
      { foodId: mapId['Avena'], grams: 60 },
      { foodId: mapId['Banana'], grams: 100 },
      { foodId: mapId['Frutilla'], grams: 80 },
      { foodId: mapId['Leche'], grams: 150 }
    ],
    steps: `Verter la avena y la leche en un tazón
Cortar la banana y las frutillas por encima
Mezclar y servir`,
    pic: null
  });
  console.log('✅ 2 recetas creadas');

  console.log('🎉 Seed Javier completado.');
}

// Ejecutar directamente
seedJavier()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
