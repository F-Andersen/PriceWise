# Розгортання PriceWise на сервері

Стек запускається одним `docker compose`:

```text
Інтернет ──► Caddy (web, 80/443, HTTPS) ──► /api/* ──► API (Express, збір цін за розкладом)
                    │                                        │
                    └── вебзастосунок (статичні файли)       └──► PostgreSQL (лише всередині Docker)
```

Назовні відкриті лише порти 80 і 443. API і база доступні тільки всередині Docker-мережі.

## 1. Сервер

- Ubuntu 22.04/24.04 (або інший Linux з Docker), **від 2 ГБ RAM**: веб-збірка Expo потребує пам'яті. Якщо RAM лише 1 ГБ, додайте swap на 2 ГБ.
- Встановіть Docker і плагін compose:

```bash
curl -fsSL https://get.docker.com | sh
```

- Відкрийте в брандмауері лише SSH, 80 і 443:

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Код

```bash
git clone https://github.com/F-Andersen/PriceWise.git
cd PriceWise
git checkout main
```

## 3. Налаштування

```bash
cp .env.production.example .env
nano .env
```

Обов'язково заповніть:

| Змінна | Що це |
|---|---|
| `POSTGRES_PASSWORD` | пароль бази, згенерувати: `openssl rand -base64 24` |
| `JWT_SECRET` | ключ підпису входу (≥ 32 символи): `openssl rand -hex 32`. Якщо змінити його, усі користувачі вийдуть з акаунтів. |
| `SITE_ADDRESS` | ваш домен (наприклад, `pricewise.example.com`) для автоматичного HTTPS. Поки домену немає — `:80` (HTTP за IP). |

Для домену створіть DNS-запис **A** на IP сервера **до** першого запуску, інакше Caddy не отримає сертифікат.

## 4. Запуск

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

Перший запуск збирає образи кілька хвилин. API сам застосовує міграції бази. Перевірка: `https://<домен>/api/health` має повернути `{"ok":true,...}`.

## 5. Дані

Нова база порожня. Є два варіанти.

**А. Перенести поточну локальну базу (рекомендовано: там уже зібрані ціни й історія).**

На своєму комп'ютері:

```bash
docker exec price-monitoring-postgres pg_dump -U postgres -d price_monitoring -Fc > pricewise.dump
scp pricewise.dump user@SERVER:~/PriceWise/
```

На сервері:

```bash
docker compose stop api
docker compose exec -T db pg_restore -U pricewise -d price_monitoring --clean --if-exists --no-owner --role=pricewise < pricewise.dump
docker compose start api
```

**Б. Почати з нуля:** зареєструйтеся в застосунку, і перший автоматичний збір (або ручний, див. нижче) заповнить ціни. Seed на сервері заблокований: він стирає всі дані.

Ручний збір цін:

```bash
docker compose exec api npm run monitor:prices:prod
```

## 6. Мобільні застосунки

Веб-версія на сервері звертається до `/api` за тією ж адресою. Збірці для iPhone/Android потрібна повна адреса:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://<домен>/api npx expo start
```

Для App Store / Google Play — те саме значення в EAS Build (`eas.json` → `env`). Без HTTPS iOS блокує запити, тож для телефонів потрібен домен.

## 7. Оновлення

```bash
git pull
docker compose up -d --build
```

## 8. Резервні копії

Щоденний дамп о 03:30 з зберіганням 14 днів (`crontab -e`):

```cron
30 3 * * * cd ~/PriceWise && docker compose exec -T db pg_dump -U pricewise -d price_monitoring -Fc > ~/backups/pricewise_$(date +\%F).dump && find ~/backups -name 'pricewise_*.dump' -mtime +14 -delete
```

(Створіть теку: `mkdir -p ~/backups`.)

## Налаштування за замовчуванням

- Збір цін щодня о 06:00 за київським часом (`PRICE_SYNC_TIME`, можна кілька: `06:00,14:00,22:00`).
- Історія цін зберігається 730 днів (`PRICE_HISTORY_DAYS`).
- Зміна каталогу через API дозволена лише адресам з `ADMIN_EMAILS`. Застосунку це не потрібно.
- Вхід і реєстрація обмежені 30 спробами за 15 хвилин з однієї IP-адреси.
