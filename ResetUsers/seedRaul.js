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
  const fullname = 'Raúl Admin';
  const imageUrl = 'data:image/jpeg;base64,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'
  const emailVerified = true;
  const rawPassword = 'testeo';
  const hashed = await bcrypt.hash(rawPassword, 10);
  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email, username, password, fullname, registrationDay, image_url, verified, verification_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [email, username, hashed, fullname, daysAgo(30), imageUrl, emailVerified, null]
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
    steps: `Cocinar lentejas y zanahoria en caldo.
     sazonar al gusto.`,
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
    steps: `Colocar el pescado en asadera.
    Agregar aceite y especias.
    Emplatar.`,
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
    topic: 'Habitos saludables',
    photos: []
  });
  await createPost({
    userId,
    communityId: community.id,
    title: 'Ejercicio después de los 60',
    body: 'Diversos estudios demuestran que mantenerse activo después de los 60 mejora la movilidad, la densidad ósea, el ánimo y previene enfermedades crónicas. Caminatas, ejercicios de fuerza con peso corporal o bandas elásticas y actividades como yoga o tai chi son ideales para esta etapa. La clave está en la constancia y la adaptación progresiva.',
    topic: 'Habitos saludables',
    photos: []
  });
  await createPost({
    userId,
    communityId: community.id,
    title: 'Salir al sol: vitamina D y salud',
    body: 'La exposición moderada al sol es fundamental para la síntesis de vitamina D, clave para absorber calcio y mantener huesos fuertes. En adultos mayores, esto ayuda a prevenir fracturas y osteoporosis. Se recomienda salir al sol unos 15-20 minutos al día, evitando horarios de alta radiación y usando protección en la piel expuesta de forma prolongada.',
    topic: 'Progreso semanal',
    photos: []
  });

  console.log('✅ Comunidad y posteos creados para Raúl');

  console.log('🎉 Seed Raúl completado.');
}

seedRaul()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
