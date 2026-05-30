# PriceWise

MVP мобільного застосунку для моніторингу та порівняння цін на продукти. Користувач створює кошик, додає товари, а система показує актуальні ціни в магазинах, знаходить дешевший варіант і збирає акції в одному місці.

## Структура

```text
price-monitoring-app/
  backend/   Node.js + Express + TypeScript + Prisma + PostgreSQL
  mobile/    React Native + Expo + TypeScript
```

## Дані

Seed більше не генерує випадкові ціни й Unsplash-заглушки. Він створює реальні магазини Києва та стартові товари з посиланнями на джерела:

- АТБ
- Novus
- METRO
- Ашан
- Сільпо
- Фора
- VARUS
- Кишеня

Після seed потрібно запустити імпорт цін. Модуль `backend/src/modules/priceMonitoring` відкриває реальні сторінки товарів і промо-сторінки магазинів, зчитує назву, фото, ціну, стару ціну, акційну ціну та посилання на товар.

Зараз автоматично імпортуються:

- ціни товарів із Zakaz-сторінок Novus, METRO та Ашан;
- акції з `novus.zakaz.ua/uk/promotions/`;
- акції з `metro.zakaz.ua/uk/promotions/`;
- акції з `auchan.zakaz.ua/uk/promotions/`.

АТБ може повертати `403` на автоматичні запити, тому для нього в seed залишений реальний товар із реальним посиланням і фото. Для повного ATБ-імпорту потрібен окремий адаптер або офіційне джерело даних.

## Backend

Створіть PostgreSQL базу, наприклад `price_monitoring`, і заповніть `.env`.

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run monitor:prices -- 40 12
npm run dev
```

За замовчуванням API доступне на:

```text
http://localhost:4001/api
```

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

Для фізичного iPhone у тій самій мережі задайте IP комп'ютера:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR_LAN_IP:4001/api"
npm start
```

Для Android emulator:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:4001/api"
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
- Каталог товарів із реальними фото з магазинів.
- Пошук за назвою, брендом і категорією.
- Картка товару з цінами, мінімальною/середньою ціною, історією й посиланнями на магазини.
- Кошик і порівняння вартості кошика між магазинами.
- Окрема сторінка акцій із фільтрами за магазином.
- Імпорт актуальних промо-пропозицій із реальних сторінок магазинів.
- Рекомендації: дешевші аналоги, акції, ціна нижча за середню.
- Рецепти з додаванням інгредієнтів у кошик.
- CRUD endpoints для товарів, магазинів і цін.
