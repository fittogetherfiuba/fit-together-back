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
    created_by_user_id INTEGER REFERENCES users(id)
);

-- Tabla de entradas de comida consumida
CREATE TABLE user_food_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    food_id INTEGER REFERENCES foods(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),  -- en gramos, ml, unidades, etc.
    consumed_at DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO foods (name, created_by_user_id) VALUES
('Manzana', NULL),
('Banana', NULL),
('Pollo', NULL),
('Arroz', NULL),
('Leche', NULL),
('Pan integral', NULL),
('Huevos', NULL),
('Yogur', NULL),
('Carne vacuna', NULL),
('Lentejas', NULL),
('Pasta', NULL),
('Tomate', NULL),
('Queso', NULL),
('Aceite de oliva', NULL),
('Avena', NULL);
