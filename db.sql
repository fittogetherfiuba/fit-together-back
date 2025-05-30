CREATE USER test WITH PASSWORD 'test';

CREATE DATABASE fittogether OWNER test;

CREATE TABLE users (
                       id SERIAL PRIMARY KEY,
                       email TEXT UNIQUE NOT NULL,
                       username TEXT UNIQUE NOT NULL,
                       password TEXT NOT NULL,
                       fullname TEXT,
                       birthday DATE,
                       registrationDay TEXT,
                       weight NUMERIC,
                       height NUMERIC,
                       description TEXT,
                       image_url TEXT


);

CREATE TABLE user_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('calories', 'water')),
    goal_value NUMERIC NOT NULL CHECK (goal_value > 0),
    CONSTRAINT unique_user_goal UNIQUE (user_id, type)
);

GRANT CONNECT ON DATABASE fittogether TO test;
GRANT USAGE ON SCHEMA public TO test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test;

CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id),
    calories_per_100g NUMERIC
);

-- Tabla de entradas de comida consumida
CREATE TABLE user_food_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    food_id INTEGER REFERENCES foods(id),
    grams NUMERIC NOT NULL CHECK (grams > 0),
    calories NUMERIC,  -- se calculará al insertar: (grams * calories_per_100g) / 100
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    period TEXT CHECK (period IN ('desayuno', 'almuerzo', 'merienda', 'cena'))
);

-- Actividades disponibles (como "Correr", "Bicicleta", "Levantamiento de pesas", etc.)
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    calories_burn_rate NUMERIC
);

-- Entradas de actividades realizadas por usuario
CREATE TABLE user_activity_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_id INTEGER REFERENCES activities(id),
    duration_minutes INTEGER,
    distance_km REAL,
    series INTEGER,
    repetitions INTEGER,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calories_burned NUMERIC
);

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  total_calories NUMERIC,
  steps TEXT,  -- 🆕 Instrucciones o pasos opcionales
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_items (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  food_id INTEGER REFERENCES foods(id),
  grams NUMERIC NOT NULL
);


CREATE TABLE nutrients (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,  
  name TEXT NOT NULL,
  unit TEXT NOT NULL
);

INSERT INTO nutrients (slug, name, unit) VALUES
  ('protein', 'Proteinas', 'g'),
  ('fat', 'Grasas', 'g'),
  ('carbohydrates', 'Carbohidratos', 'g'),
  ('fiber', 'Fibras', 'g'),
  ('sodium', 'Sodio', 'mg');

    CREATE TABLE food_nutrients (
      food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
      nutrient_id INTEGER REFERENCES nutrients(id) ON DELETE CASCADE,
      amount_per_100g NUMERIC NOT NULL,
      PRIMARY KEY (food_id, nutrient_id)
    );

INSERT INTO foods (name, created_by_user_id, calories_per_100g) VALUES
('Manzana', NULL, 52),
('Banana', NULL, 89),
('Pollo', NULL, 165),
('Arroz', NULL, 130),
('Leche', NULL, 42),
('Pan integral', NULL, 247),
('Huevos', NULL, 143),
('Yogur', NULL, 59),
('Carne vacuna', NULL, 250),
('Lentejas', NULL, 116),
('Pasta', NULL, 131),
('Tomate', NULL, 18),
('Queso', NULL, 402),
('Aceite de oliva', NULL, 884),
('Avena', NULL, 389);

-- Manzana (id 1)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(1, 1, 0.3),   -- Proteínas
(1, 2, 0.2),   -- Grasas
(1, 3, 14),    -- Carbohidratos
(1, 4, 2.4),   -- Fibras
(1, 5, 1);     -- Sodio (mg)

-- Banana (id 2)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(2, 1, 1.1),
(2, 2, 0.3),
(2, 3, 23),
(2, 4, 2.6),
(2, 5, 1);

-- Pollo (id 3)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(3, 1, 31),
(3, 2, 3.6),
(3, 3, 0),
(3, 4, 0),
(3, 5, 74);

-- Arroz (id 4)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(4, 1, 2.7),
(4, 2, 0.3),
(4, 3, 28),
(4, 4, 0.4),
(4, 5, 1);

-- Leche (id 5)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(5, 1, 3.4),
(5, 2, 1),
(5, 3, 5),
(5, 4, 0),
(5, 5, 44);

-- Pan integral (id 6)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(6, 1, 13),
(6, 2, 4.2),
(6, 3, 41),
(6, 4, 6),
(6, 5, 490);

-- Huevos (id 7)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(7, 1, 13),
(7, 2, 11),
(7, 3, 1.1),
(7, 4, 0),
(7, 5, 124);

-- Yogur (id 8)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(8, 1, 3.5),
(8, 2, 3.3),
(8, 3, 4.7),
(8, 4, 0),
(8, 5, 36);

-- Carne vacuna (id 9)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(9, 1, 26),
(9, 2, 15),
(9, 3, 0),
(9, 4, 0),
(9, 5, 65);

-- Lentejas (id 10)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(10, 1, 9),
(10, 2, 0.4),
(10, 3, 20),
(10, 4, 8),
(10, 5, 6);

-- Pasta (id 11)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(11, 1, 5),
(11, 2, 1.1),
(11, 3, 25),
(11, 4, 1.3),
(11, 5, 1);

-- Tomate (id 12)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(12, 1, 0.9),
(12, 2, 0.2),
(12, 3, 3.9),
(12, 4, 1.2),
(12, 5, 5);

-- Queso (id 13)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(13, 1, 25),
(13, 2, 33),
(13, 3, 1.3),
(13, 4, 0),
(13, 5, 621);

-- Aceite de oliva (id 14)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(14, 1, 0),
(14, 2, 100),
(14, 3, 0),
(14, 4, 0),
(14, 5, 2);

-- Avena (id 15)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
(15, 1, 13.2),
(15, 2, 6.5),
(15, 3, 67),
(15, 4, 10.6),
(15, 5, 2);

INSERT INTO activities (name, created_by_user_id, type, calories_burn_rate) VALUES
('Caminar', NULL, 'cardio', 12),
('Correr', NULL, 'cardio', 20),
('Nadar', NULL, 'cardio', 14),
('Bicicleta', NULL, 'cardio', 16),
('Sentadillas', NULL, 'musculacion', 3),
('Flexiones', NULL, 'musculacion', 4),
('Plancha', NULL, 'musculacion', 6),
('Burpees', NULL, 'cardio', 7),
('Abdominales', NULL, 'musculacion', 3),
('Yoga', NULL, 'cardio', 1);

CREATE TABLE water_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    liters NUMERIC NOT NULL CHECK (liters > 0),
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE friend_requests (
                                 id SERIAL PRIMARY KEY,
                                 sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                                 receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 CONSTRAINT unique_request UNIQUE (sender_id, receiver_id),
                                 CHECK (sender_id <> receiver_id)
);

CREATE TABLE user_friends (
                              id SERIAL PRIMARY KEY,
                              user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                              friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
                              CHECK (user_id <> friend_id)
);
