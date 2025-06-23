// seedRaul.js
// Seeder para usuario Raúl: crea el usuario y le agrega entradas de comida, actividad, agua, recetas, comunidad y posteos.

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

async function seedRaul() {
  // Crear usuario Raúl
  const email = 'raul@admin.com';
  const username = 'raul';
  const rawPassword = 'testeo';
  const hashed = await bcrypt.hash(rawPassword, 10);
  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email, username, password)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [email, username, hashed]
  );
  const userId = userRows[0].id;
  console.log(`Usuario Raúl creado con id=${userId}`);

  const periods = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  const desayunoOptions = [
    'Leche', 'Pan integral'
  ];
  const almuerzoOptions = [
    'Carne vacuna', 'Carne de cerdo', 'Pasta'
  ];
  const meriendaOptions = [
    'Yogur'
  ];
  const cenaOptions = [
    'Carne vacuna', 'Carne de cerdo', 'Pasta', 'Chocolate negro'
  ];
  const periodOptions = [desayunoOptions, almuerzoOptions, meriendaOptions, cenaOptions]

  for (let i = 0; i < periodOptions.length; i ++){
    const foodOptions = periodOptions[i]
    const period = periods[i]
    for (let j = 0; j < 25; j++) {
      const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
      const grams    = Math.floor(Math.random() * 200) + 50;       // 50-249 g
      const consumedAt = daysAgo(Math.floor(Math.random() * 30));  // en el rango 0-29 días atrás
      await addConsumedFood({ userId, foodName, grams, consumedAt, period });
    }
  }
  console.log('✅ 25 * 4 entradas de comida agregadas');

  // 3. Entradas de actividad: 10
  const activityOptions = ['Caminar','Bicicleta'];
  for (let i = 0; i < 10; i++) {
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
  console.log('✅ 10 entradas de actividad agregadas');

  // Entradas de agua: 30 días, 1.5-2.5 L diarias
  for (let d = 0; d < 30; d++) {
    const consumedAt = daysAgo(d);
    const liters = +(Math.random() * (2.5 - 1.5) + 1).toFixed(2);
    await addConsumedWater({ userId, liters, consumedAt });
  }
  console.log('✅ 30 entradas de agua agregadas para Raúl');

  // Recetas de ejemplo
  const { rows: foods } = await pool.query('SELECT id, name FROM foods');
  const mapId = {};
  foods.forEach(f => { mapId[f.name] = f.id; });

  await createRecipe({
    userId,
    username,
    name: 'Sopa de Lentejas',
    items: [
      { foodId: mapId['Lentejas'], grams: 100 },
      { foodId: mapId['Zanahoria'], grams: 50 }
    ],
    steps: 'Cocinar lentejas y zanahoria en caldo, sazonar al gusto.',
    pic: null
  });

  await createRecipe({
    userId,
    username,
    name: 'Pescado al Horno',
    items: [
      { foodId: mapId['Pescado'], grams: 150 },
      { foodId: mapId['Aceite de oliva'], grams: 10 }
    ],
    steps: 'Hornear el pescado con aceite y especias.',
    pic: null
  });
  console.log('✅ 2 recetas creadas para Raúl');

  // Comunidad y posteo
  const community = await createCommunity({
    userId,
    name: 'Golden Years',
    description: 'Espacio para compartir estilo de vida saludable en la jubilación.'
  });
  await createPost({
    userId,
    communityId: community.id,
    title: '¡Bienvenido a Golden Years!',
    body: 'Comparte aquí tus rutinas ligeras y recetas nutritivas.',
    topic: 'Jubilación activa',
    photos: []
  });
  console.log('✅ Comunidad y primer posteo creados para Raúl');

  console.log('🎉 Seed Raúl completado.');
}

seedRaul()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
