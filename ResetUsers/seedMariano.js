// seedMariano.js
// Seeder para usuario Mariano: crea el usuario y le agrega entradas de comida, actividad, agua, recetas, comunidad y posteos.

const pool = require('../fit-together-back/db');
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

async function seedMariano() {
  // Crear usuario Mariano
  const email = 'mariano@admin.com';
  const username = 'mariano';
  const rawPassword = 'testeo';
  const hashed = await bcrypt.hash(rawPassword, 10);
  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email, username, password)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [email, username, hashed]
  );
  const userId = userRows[0].id;
  console.log(`Usuario Mariano creado con id=${userId}`);

  // Entradas de comida: 60 en últimos 30 días, perfil personal trainer (alto en proteínas)
  const foodOptions = [
    'Huevos','Yogur','Pasta','Arroz','Carne vacuna',
    'Pescado','Avena','Leche','Pan integral','Lentejas'
  ];
  const periods = ['desayuno','almuerzo','merienda','cena'];
  for (let i = 0; i < 60; i++) {
    const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
    const grams    = Math.floor(Math.random() * 200) + 50;
    const period   = periods[Math.floor(Math.random() * periods.length)];
    const consumedAt = daysAgo(Math.floor(Math.random() * 30));
    await addConsumedFood({ userId, foodName, grams, consumedAt, period });
  }
  console.log('✅ 60 entradas de comida agregadas para Mariano');

  // Entradas de actividad: 15, alto rendimiento
  const activityOptions = ['HIIT','Correr','Elíptica','Entrenamiento con pesas','Bicicleta'];
  for (let i = 0; i < 15; i++) {
    const name = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    const duration = Math.floor(Math.random() * 60) + 30;  // 30-89 min
    const distance = ['Correr','Bicicleta','Elíptica'].includes(name)
      ? +(Math.random() * 10 + 1).toFixed(1)
      : null;
    const performedAt = daysAgo(Math.floor(Math.random() * 30));
    await addDoneActivity({ userId, activityName: name, durationMinutes: duration, distanceKm: distance, series: 3, repetitions: 12, performedAt });
  }
  console.log('✅ 15 entradas de actividad agregadas para Mariano');

  // Entradas de agua: 30 días, 2-3 L diarias
  for (let d = 0; d < 30; d++) {
    const consumedAt = daysAgo(d);
    const liters = +(Math.random() * (3 - 2) + 2).toFixed(2);
    await addConsumedWater({ userId, liters, consumedAt });
  }
  console.log('✅ 30 entradas de agua agregadas para Mariano');

  // Recetas de ejemplo
  const { rows: foods } = await pool.query('SELECT id, name FROM foods');
  const mapId = {};
  foods.forEach(f => { mapId[f.name] = f.id; });

  await createRecipe({
    userId,
    username,
    name: 'Batido Proteico',
    items: [
      { foodId: mapId['Avena'], grams: 50 },
      { foodId: mapId['Leche'], grams: 200 },
      { foodId: mapId['Huevos'], grams: 60 }
    ],
    steps: 'Licuar avena, leche y claras de huevo hasta obtener mezcla homogénea.',
    pic: null
  });

  await createRecipe({
    userId,
    username,
    name: 'Pasta con Pollo',
    items: [
      { foodId: mapId['Pasta'], grams: 100 },
      { foodId: mapId['Carne vacuna'], grams: 120 }
    ],
    steps: 'Cocinar pasta y carne, mezclar y sazonar al gusto.',
    pic: null
  });
  console.log('✅ 2 recetas creadas para Mariano');

  // Comunidad y posteo
  const community = await createCommunity({
    userId,
    name: 'Trainer Hub',
    description: 'Comunidad para entrenadores y entusiastas del fitness.'
  });
  await createPost({
    userId,
    communityId: community.id,
    title: '¡Bienvenido a Trainer Hub!',
    body: 'Comparte tus rutinas avanzadas y consejos pro.',
    topic: 'Entrenamiento',
    photos: []
  });
  console.log('✅ Comunidad y primer posteo creados para Mariano');

  console.log('🎉 Seed Mariano completado.');
}

seedMariano()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
