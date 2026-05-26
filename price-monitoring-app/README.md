# PriceWise

MVP мобільного застосунку для підтримки прийняття рішень щодо оптимізації витрат на продукти. Користувач створює кошик, додає товари, а система порівнює повну вартість кошика в АТБ, Сільпо та Novus, показує найдешевший магазин, акції та базові рекомендації для економії.

## Структура

```text
price-monitoring-app/
  backend/   Node.js + Express + TypeScript + Prisma + PostgreSQL
  mobile/    React Native + Expo + TypeScript
```

## Дизайн

Інтерфейс стилістично орієнтований на застосунок NOVUS: зелений hero-блок, картка вибору магазину, акційні товарні картки, виразні бейджі знижок і нижня навігація. Логіка залишається мульти-магазинною: PriceWise показує ціни, акції та спецпропозиції для АТБ, Сільпо, Novus та інших магазинів, які можна додати через seed або API.

## Backend

Створіть PostgreSQL базу, наприклад `price_monitoring`.

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

За замовчуванням API доступне на:

```text
http://localhost:4000/api
```

Якщо порт `4000` зайнятий, змініть `PORT` у `backend/.env`, наприклад на `4001`, і задайте відповідний `EXPO_PUBLIC_API_URL` для mobile.

Демо-користувач після seed:

```text
email: demo@example.com
password: password123
```

## Mobile

```bash
cd mobile
npm install
npm start
```

Для фізичного телефона задайте IP вашого комп'ютера:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR_LAN_IP:4000/api"
npm start
```

Для Android emulator:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:4000/api"
npm start
```

## Основні API Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`

Products:

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/search?query=`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/products/:id/alternatives`

Stores, prices, offers:

- `GET /api/stores`
- `POST /api/stores`
- `GET /api/prices/product/:productId`
- `GET /api/prices/history/:productId`
- `POST /api/prices`
- `POST /api/prices/import/mock`
- `GET /api/offers`
- `GET /api/offers?storeId=...`

Shopping lists:

- `GET /api/shopping-lists`
- `POST /api/shopping-lists`
- `GET /api/shopping-lists/:id`
- `POST /api/shopping-lists/:id/items`
- `PUT /api/shopping-lists/:id/items/:itemId`
- `DELETE /api/shopping-lists/:id/items/:itemId`
- `GET /api/shopping-lists/:id/compare`
- `GET /api/shopping-lists/:id/recommendations`

Recipes:

- `GET /api/recipes`
- `GET /api/recipes/:id`
- `POST /api/recipes/:id/add-to-shopping-list`

## Реалізовано

- Реєстрація та вхід через email/password з JWT.
- Каталог із 30 seed-товарами, 3 магазинами, 5+ категоріями.
- Пошук за назвою, брендом і категорією.
- Картка товару з цінами в магазинах, мінімальною та середньою ціною.
- Історія ціни у вигляді простого графіка.
- Кошик зі зміною кількості товарів.
- Порівняння вартості кошика між магазинами.
- Окрема сторінка акцій і спецпропозицій із фільтрами за магазином.
- Рекомендації: дешевші аналоги, акції, ціна нижча за середню.
- Рецепти з додаванням інгредієнтів у кошик.
- CRUD endpoints для товарів, магазинів і цін.
- Модуль-заглушка `backend/src/modules/priceImport/mockImporter.ts` для майбутнього парсингу або імпорту цін.

## Алгоритм порівняння

Backend бере товари зі списку покупок, для кожного магазину шукає останню доступну ціну товару, множить її на кількість, рахує `totalPrice`, список відсутніх товарів, різницю з найдешевшим кошиком і повертає відсортований результат.

## Алгоритм рекомендацій

Для кожного товару в кошику система шукає товари тієї ж категорії з нижчою актуальною ціною, перевіряє акційні ціни та порівнює поточну ціну із середньою історичною ціною за останні 30 днів.
