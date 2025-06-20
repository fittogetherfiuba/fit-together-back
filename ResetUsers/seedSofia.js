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

  // 2. Entradas de comida: 60 en últimos 30 días, perfil saludable sin carnes
  const foodOptions = [
    'Banana','Manzana','Lechuga','Tomate','Zanahoria',
    'Avena','Yogur','Arroz','Lentejas','Pan integral','Aceite de oliva','Pasta'
  ];
  const periods = ['desayuno','almuerzo','merienda','cena'];
  for (let i = 0; i < 80; i++) {
    const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
    const grams    = Math.floor(Math.random() * 200) + 50;       // 50-249 g
    const period   = periods[Math.floor(Math.random() * periods.length)];
    const consumedAt = daysAgo(Math.floor(Math.random() * 30));  // en el rango 0-29 días atrás
    await addConsumedFood({ userId, foodName, grams, consumedAt, period });
  }
  console.log('✅ 60 entradas de comida agregadas');

  // 3. Entradas de actividad: 15, principalmente cardio
  const activityOptions = ['Correr','Caminar','Bicicleta','Nadar','Hombros'];
  for (let i = 0; i < 15; i++) {
    const name = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    const duration = Math.floor(Math.random() * 60) + 20;                // 20-79 min
    const distance = ['Correr','Caminar'].includes(name)
      ? +(Math.random() * 5 + 1).toFixed(1)                               // 1.0-6.0 km
      : null;
    const performedAt = daysAgo(Math.floor(Math.random() * 30));
    await addDoneActivity({
      userId,
      activityName: name,
      durationMinutes: duration,
      distanceKm: distance,
      series: null,
      repetitions: null,
      performedAt
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
