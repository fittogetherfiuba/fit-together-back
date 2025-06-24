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
  const fullname = 'Sofia Admin';
  const imageUrl = 'data:image/jpeg;base64,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';
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
      caloriesBurned
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
    steps: `Licuar avena con yogur. 
    Servir frío.`,
    pic: null
  });
  console.log('✅ 2 recetas creadas');

  // 6. Comunidad y posteo
  const community = await createCommunity({
    userId,
    name: 'Vegetarianos y Saludables',
    description: 'Comunidad para compartir consejos de vida saludable.'
  });
  await createPost({
    userId,
    communityId: community.id,
    title: 'Verde = Saludable ?',
    body: 'Muchas verduras de hoja verde como la espinaca, la rúcula o el brócoli están cargadas de vitaminas, minerales y antioxidantes que favorecen el sistema inmune y la salud cardiovascular. Aunque no todo lo verde es automáticamente sano, en general los alimentos de este color suelen tener una alta densidad nutricional y bajo contenido calórico.',
    topic: 'Alimentacion saludable',
    photos: []
  });
    await createPost({
    userId,
    communityId: community.id,
    title: 'Proteínas vegetales',
    body: 'Aunque durante años se creyó que solo las proteínas animales eran “completas”, estudios actuales demuestran que combinaciones vegetales como legumbres + cereales (ej. lentejas con arroz) aportan todos los aminoácidos esenciales. Además, alimentos como la soja, la quinoa y el trigo sarraceno contienen proteínas completas por sí solos, sin necesidad de combinaciones.',
    topic: 'Macronutrientes',
    photos: []
  });
    await createPost({
    userId,
    communityId: community.id,
    title: 'IA y veganismo',
    body: 'La inteligencia artificial puede ayudar a quienes siguen una dieta vegana a planificar comidas equilibradas, evitar deficiencias nutricionales y descubrir nuevas recetas. Además, aplicaciones basadas en IA permiten escanear productos, generar menús personalizados y hasta detectar ingredientes de origen animal en etiquetas, facilitando una vida más consciente y saludable.',
    topic: 'Recomendaciones de IA',
    photos: []
  });
  console.log('✅ Comunidad con Posteos creados');

  console.log('🎉 Seed Sofia completado.');
}

// Ejecutar directamente
seedSofia()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
