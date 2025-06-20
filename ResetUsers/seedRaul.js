// seedRaul.js
// Seeder para usuario Raúl: crea el usuario y le agrega entradas de comida, actividad, agua, recetas, comunidad y posteos.

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

  // Entradas de comida: 60 en últimos 30 días, perfil jubilado (diario equilibrado)
  const foodOptions = [
    'Pescado','Lentejas','Arroz','Pan integral','Leche',
    'Yogur','Manzana','Banana','Avena','Zanahoria'
  ];
  const periods = ['desayuno','almuerzo','merienda','cena'];
  for (let i = 0; i < 60; i++) {
    const foodName = foodOptions[Math.floor(Math.random() * foodOptions.length)];
    const grams    = Math.floor(Math.random() * 200) + 50;
    const period   = periods[Math.floor(Math.random() * periods.length)];
    const consumedAt = daysAgo(Math.floor(Math.random() * 30));
    await addConsumedFood({ userId, foodName, grams, consumedAt, period });
  }
  console.log('✅ 60 entradas de comida agregadas para Raúl');

  // Entradas de actividad: 15, actividades ligeras
  const activityOptions = ['Caminar','Yoga','Pilates','Natación','Bicicleta'];
  for (let i = 0; i < 15; i++) {
    const name = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    const duration = Math.floor(Math.random() * 40) + 20;  // 20-59 min
    const distance = ['Caminar','Bicicleta','Natación'].includes(name)
      ? +(Math.random() * 3 + 0.5).toFixed(1)
      : null;
    const performedAt = daysAgo(Math.floor(Math.random() * 30));
    await addDoneActivity({ userId, activityName: name, durationMinutes: duration, distanceKm: distance, series: null, repetitions: null, performedAt });
  }
  console.log('✅ 15 entradas de actividad agregadas para Raúl');

  // Entradas de agua: 30 días, 1.5-2.5 L diarias
  for (let d = 0; d < 30; d++) {
    const consumedAt = daysAgo(d);
    const liters = +(Math.random() * (2.5 - 1.5) + 1.5).toFixed(2);
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
