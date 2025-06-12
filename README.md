# FitTogether

# 📌 Pruebas de la API con cURL

Este archivo contiene ejemplos listos para probar los endpoints.

---

## Registro
```bash
curl --location 'http://localhost:3000/api/register' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "test@gmail.com",
    "password": "12345678",
    "username": "testest",
    "fullname": "test test"
  }'
```

## Obtener datos de usuario

```bash
curl -X GET http://localhost:3000/api/users/nombredeusuario
```

## Establecer objetivo

Actualmente se permiten los siguientes tipos de objetivo:

- `water`: litros de agua 
- `calories`: calorías diarias

```bash
curl --location --request POST 'http://localhost:3000/api/goals' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "type": "WATER",
  "goal": 2.5
}'
```

## Get objetivo
```bash
curl --location --request GET 'http://localhost:3000/api/goals/1?type=calories'
```

## Agregar comida consumida
```bash
curl --location --request POST 'http://localhost:3000/api/foods/entry' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "foodName": "Manzana",
  "grams": 150,
  "consumedAt": "2025-05-15",
  "period": "Desayun"
}'
```

## Agregar comida
```bash
curl --location --request POST 'http://localhost:3000/api/foods' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Manzana",
  "userId": 1,
  "caloriesPer100g": 52,
  "nutrients": [
    { "nutrientId": 1, "amountPer100g": 0.3 },
    { "nutrientId": 2, "amountPer100g": 0.2 },
    { "nutrientId": 3, "amountPer100g": 14 },
    { "nutrientId": 4, "amountPer100g": 2.4 },
    { "nutrientId": 5, "amountPer100g": 1 }
  ]
}'
```

## Ver comidas existentes
```bash
curl --location 'http://localhost:3000/api/foods' \
--header 'Content-Type: application/json' \
--data ''
```

## Agregar agua consumida
```bash
curl --location --request POST 'http://localhost:3000/api/water/entry' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "liters": 2.5
}'
```

## Ver agua consumida
```bash
curl --location --request GET 'http://localhost:3000/api/water/entries?userId=1&from=2025-05-01&to=2025-05-15'
```

## Ver todos los nutrientes existentes
```bash
curl --location 'http://localhost:3000/api/foods/nutrients'
```

## Crear receta
```bash
curl --location 'http://localhost:3000/api/recipes/create' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "name": "Tostadas con Palta",
  "items": [
    { "foodId": 6, "grams": 60 },
    { "foodId": 2, "grams": 100 }
  ],
  "steps": "1. Tostar el pan integral.\n2. Pisar la palta.\n3. Untar la palta sobre las tostadas y servir."
}'
```

## Obtener recetas
```bash
curl -X GET "http://localhost:3000/api/recipes/get?userId=1"
```

## Verificar usuario
```bash
curl --location 'http://localhost:3000/api/users/verify' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "sebastianpagura@gmail.com",
    "code": "766406"
  }'
```
Tambien soporta username o userId.

## Reenviar mail de verificacion
```bash
curl --location 'http://localhost:3000/api/users/resend-verification-code' \
--header 'Content-Type: application/json' \
--data '{"userId": 1}'
```

## Crear post
```bash
curl -X POST http://localhost:3000/api/communities/posts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "communityId": 2,
    "title": "Mi experiencia",
    "body": "Muy bueno el lugar.",
    "topic": "Recomendaciones",
    "photos": ["https://example.com/photo1.jpg"]
  }'
```

## Editar post
```bash

curl -X PUT http://localhost:3000/api/communities/posts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "title": "Título actualizado",
    "body": "Texto nuevo del post.",
    "topic": "Consejos",
    "photos": ["https://example.com/actualizado.jpg"]
  }'
```

## Obtener posts de una comunidad
```bash
curl --X POST 'http://localhost:3000/api/communities/1/posts?since=2025-06-11&until=2025-06-12' \
--header 'Content-Type: application/json' \
--data '{
    "topics": ["topico", "Test"]
}'
```

## Obtener post
```bash
curl -X GET http://localhost:3000/api/communities/posts/1 \
  -H "Content-Type: application/json"
```

## Postear comentario
```bash
curl -X POST http://localhost:3000/api/communities/posts/1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "postId": 1,
    "body": "Totalmente de acuerdo con tu recomendación, me pasó lo mismo."
  }'
```

## Obtener comentarios
```bash
curl -X GET http://localhost:3000/api/communities/posts/1/comments \
  -H "Content-Type: application/json"
```