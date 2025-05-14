# FitTogether

# 📌 Pruebas de la API con cURL

Este archivo contiene ejemplos listos para probar los endpoints.

---

## Establecer objetivo

```bash
curl --location --request POST 'http://localhost:3000/api/goals' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "goalId": "daily_steps",
  "goal": 10000
}'
```

## Agregar comida consumida
```bash
curl --location --request POST 'http://localhost:3000/api/foods/entry' \
--header 'Content-Type: application/json' \
--data '{
  "userId": 1,
  "foodName": "Manzana",
  "quantity": 150
}'
```

## Agregar comida
```bash
curl --location --request POST 'http://localhost:3000/api/foods' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Manzana",
  "userId": 1
}'
```

## Ver comidas existentes
```bash
curl --location 'http://localhost:3000/api/foods' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Manzana",
  "userId": 1
}'
```
