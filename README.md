# FitTogether

# 📌 Pruebas de la API con cURL

Este archivo contiene ejemplos listos para probar los endpoints.

---

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
  "consumedAt": "2025-05-15"
}'
```

## Agregar comida
```bash
curl --location --request POST 'http://localhost:3000/api/foods' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Manzana",
  "userId": 1,
  "caloriesPer100g": 52
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
