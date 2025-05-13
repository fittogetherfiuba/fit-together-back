-- Crear usuario
CREATE USER test WITH PASSWORD 'test';

-- Crear base de datos
CREATE DATABASE fittogether OWNER test;

-- Conectarse a la base (PGAdmin lo hace solo si seleccionás la base)
\c fittogether

-- Crear tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

-- Crear tabla de objetivos
CREATE TABLE user_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    goal_id TEXT NOT NULL,
    goal_value NUMERIC NOT NULL CHECK (goal_value > 0)
);

-- Dar permisos sobre tablas actuales
GRANT CONNECT ON DATABASE fittogether TO test;
GRANT USAGE ON SCHEMA public TO test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test;

-- Dar permisos por defecto para futuras tablas y secuencias
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test;

