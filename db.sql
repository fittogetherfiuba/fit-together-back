CREATE USER test WITH PASSWORD 'test';

CREATE DATABASE fittogether OWNER test;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE user_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    goal_id TEXT NOT NULL,
    goal_value NUMERIC NOT NULL CHECK (goal_value > 0),
    CONSTRAINT unique_user_goal UNIQUE (user_id, goal_id)
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
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Actividades disponibles (como "Correr", "Bicicleta", "Levantamiento de pesas", etc.)
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id)
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
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

INSERT INTO activities (name, created_by_user_id) VALUES
('Caminar', NULL),
('Correr', NULL),
('Nadar', NULL),
('Bicicleta', NULL),
('Sentadillas', NULL),
('Flexiones', NULL),
('Plancha', NULL),
('Burpees', NULL),
('Abdominales', NULL),
('Yoga', NULL);

CREATE TABLE water_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    liters NUMERIC NOT NULL CHECK (liters > 0),
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE
);
