// seedSofia.js
// Seeder para usuario Sofia: crea el usuario y le agrega entradas de comida, actividad, agua, recetas, comunidad y posteos.

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

async function seedSofia() {
  // 1. Crear usuario Sofia
  const email = 'sofia@admin.com';
  const username = 'sofia';
  const rawPassword = 'testeo';
  const hashed = await bcrypt.hash(rawPassword, 10);

  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email, username, password)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [email, username, hashed]
  );
  const userId = userRows[0].id;
  console.log(`Usuario Sofia creado con id=${userId}`);


  const periods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  const desayunoOptions = [
    'Banana', 'Manzana', 'Avena', 'Pan integral', 'Yogur', 'Jugo de naranja'
  ];
  const almuerzoOptions = [
    'Arroz', 'Lentejas', 'Pasta', 'Tomate', 'Lechuga', 'Zanahoria', 'Papa', 'Brocoli'
  ];
  const meriendaOptions = [
    'Banana', 'Manzana', 'Frutilla', 'Chocolate negro', 'Yogur', 'Jugo de naranja'
  ];
  const cenaOptions = [
    'Arroz', 'Lentejas', 'Pasta', 'Tomate', 'Lechuga', 'Zanahoria', 'Papa', 'Brocoli'
  ];
  const periodOptions = [desayunoOptions, almuerzoOptions, meriendaOptions, cenaOptions]

  for (let i = 0; i < periodOptions.length; i ++){
    const foodOptions = periodOptions[i]
    const period = periods[i]
    for (let j = 0; j < 30; j++) {
      const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
      const grams    = Math.floor(Math.random() * 200) + 50;       // 50-249 g
      const consumedAt = daysAgo(Math.floor(Math.random() * 30));  // en el rango 0-29 días atrás
      await addConsumedFood({ userId, foodName, grams, consumedAt, period });
    }
  }
  console.log('✅ 30 * 4 entradas de comida agregadas');

  // 3. Entradas de actividad: 15, principalmente cardio
  const activityOptions = ['Correr','Caminar','Bicicleta','Nadar','Hombros'];
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
        return res.status(404).json({ error: 'Actividad no encontrada' });
    }
   
    const { type: type, calories_burn_rate: rate } = result.rows[0];  
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
        durationMinutes = getRandomIntInclusive(20, 79); // 20–79 min
        distanceKm      = getRandomIntInclusive(1, 7);   // 1–7 km
        caloriesBurned  = rate * durationMinutes;
        break;

      case 'musculacion':
        repetitions    = getRandomIntInclusive(5, 14);  // 5–14 reps
        series         = getRandomIntInclusive(2, 4);   // 2–4 series
        caloriesBurned = rate * repetitions;
        break;

      default:
        console.warn(`Tipo desconocido: ${type}`);
    }
    const performedAt = daysAgo(getRandomIntInclusive(0, 29));

    await addDoneActivity({
      userId,
      activityName    : name,
      durationMinutes,
      distanceKm,
      series,
      repetitions,
      performedAt,
      calories_burned : caloriesBurned
    });
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
  // Obtener mapeo de food names a IDs
  const { rows: foods } = await pool.query('SELECT id, name FROM foods');
  const mapId = {};
  foods.forEach(f => { mapId[f.name] = f.id; });

  // Ensalada vegetal
  await createRecipe({
    userId,
    username,
    name: 'Ensalada Vegetal',
    items: [
      { foodId: mapId['Lechuga'], grams: 80 },
      { foodId: mapId['Tomate'], grams: 60 },
      { foodId: mapId['Zanahoria'], grams: 50 },
      { foodId: mapId['Aceite de oliva'], grams: 10 }
    ],
    steps: 'Mezclar todos los ingredientes y aliñar al gusto.',
    pic: null
  });

  // Smoothie de avena y yogur
  await createRecipe({
    userId,
    username,
    name: 'Smoothie Avena y Yogur',
    items: [
      { foodId: mapId['Avena'], grams: 50 },
      { foodId: mapId['Yogur'], grams: 150 }
    ],
    steps: 'Licuar avena con yogur y servir frío.',
    pic: null
  });
  console.log('✅ 2 recetas creadas');

  // 6. Comunidad y posteo
  const community = await createCommunity({
    userId,
    name: 'Healthy Community',
    description: 'Comunidad para compartir consejos de vida saludable.'
  });
  await createPost({
    userId,
    communityId: community.id,
    title: '¡Bienvenida a Healthy Community!',
    body: 'Aquí compartiremos rutinas de cardio y recetas saludables.',
    topic: 'Salud',
    photos: []
  });
  console.log('✅ Comunidad y primer posteo creados');

  console.log('🎉 Seed Sofia completado.');
}

// Ejecutar directamente
seedSofia()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
