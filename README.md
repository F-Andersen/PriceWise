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

Після seed потрібно запустити збір цін (`npm run monitor:prices` у `backend`). Модуль `backend/src/modules/priceMonitoring` збирає дані з 5 мереж на платформі zakaz.ua: **Novus, METRO, Ашан, Таврія В, МегаМаркет**.

Як це працює:

1. **Акції.** Збирач відкриває `/uk/custom-categories/promotions/` кожної мережі й додає акційні товари в каталог.
2. **Каталог за штрихкодом.** Кожен товар із бази шукається в кожній мережі за адресою `/uk/products/<GTIN>/`. Ціну, стару ціну, наявність і фото збирач бере зі структурованих даних сторінки. Ціну він приймає лише тоді, коли штрихкод на сторінці точно збігається.
3. **Вагові та внутрішні коди** (GTIN-13 з префіксом 20–29, невалідна контрольна цифра) між магазинами не зіставляються. Ці ціни лише оновлюються за вже відомим посиланням.
4. Якщо товару з відомим посиланням більше немає, збирач додає запис «немає в наявності», щоб у порівнянні не лишалася застаріла ціна.

Ціни залежать від міста. Без вибору адреси сайт показує Київ.

Не збираються: АТБ і Сільпо (відповідають `403` ботам, обходити не будемо), Фора, Кишеня, VARUS. Вони лишаються в БД, але API їх не показує. `stores-api.zakaz.ua` не використовується, бо його robots.txt забороняє ботів.

```bash
npm run monitor:prices                     # повний збір
npm run monitor:prices -- --dry-run        # без запису в БД
npm run monitor:prices -- --limit=5 --stores=Novus,METRO --verbose
```

## Backend

Створіть PostgreSQL базу, наприклад `price_monitoring`, і заповніть `.env`.

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run monitor:prices
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
