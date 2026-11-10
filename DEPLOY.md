# Розгортання PriceWise на сервері

На окремому сервері стек запускається одним `docker compose`:

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

Для окремого сервера без GitHub Actions:

```bash
git pull
docker compose up -d --build
```

На поточному спільному Oracle-сервері використовуйте автоматичне розгортання з `main`, описане нижче.

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
- Вхід, реєстрація і скидання пароля обмежені 30 спробами за 15 хвилин з однієї IP-адреси.
- Код для скидання пароля надходить поштою. Для цього в змінних середовища сервера (на Oracle це `/etc/pricewise/production.env`) потрібні `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` і `MAIL_FROM`, а `/etc/pricewise/compose.yml` має бути оновлений з [`deploy/oracle/compose.yml`](deploy/oracle/compose.yml). Порт 25 на хмарних серверах часто закритий, тому використовуйте 587 або 465. Без цих значень «Забули пароль?» відповідає, що відновлення тимчасово недоступне, усе інше працює.

## Oracle: CI/CD на спільному сервері

GitHub Actions перевіряє збірку backend, типи мобільного застосунку і вебекспорт для `main` та `dev`. Успішний push до `main` запускає деплой на `sites-prod-01`. `production` у GitHub дозволяє деплой лише з `main` і містить секрети `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.

Цей сервер також обслуговує інші сайти через Nginx. Конфігурація [`deploy/oracle/compose.yml`](deploy/oracle/compose.yml) встановлена як `/etc/pricewise/compose.yml` і закріплює порти PriceWise на `127.0.0.1:14001` (API) та `127.0.0.1:18084` (web). Секрети лежать у root-owned `/etc/pricewise/production.env`, а не керуються GitHub Actions. Зміни Compose і серверного сценарію треба окремо перевірити та встановити адміністратором; звичайний деплой оновлює код і образи.

Окремий користувач `deploy` не входить до групи `docker`. Його SSH-ключ має `restrict,command="/usr/local/libexec/pricewise-ssh-gate"` в `authorized_keys`. Каталог `.ssh` і `authorized_keys` належать `root` та мають права `755` і `644`: SSH-сервер читає ключ, а користувач `deploy` не може змінити обмеження. Через `sudoers` цей користувач може без пароля запускати тільки `/usr/local/sbin/pricewise-deploy` без аргументів (`""` у правилі sudoers). Сценарій приймає SHA через stdin, звіряє його з поточним `origin/main`, створює резервну копію БД, збирає образи й перевіряє локальні та публічний HTTP-маршрути. Якщо оновлення не пройшло, він пробує повернути попередній код і контейнери. **Міграції БД автоматично назад не відкочуються**; для несумісних міграцій потрібен окремий план відновлення.

Гілка `main` захищена: зміни потрапляють у неї лише через pull request, обидві перевірки CI (`Test and build backend`, `Test, typecheck and export web app`) мають бути зеленими, а гілка — актуальною відносно `main`. Примусовий push і видалення гілки заборонені, і правило діє також для адміністраторів. Реліз за git flow: `release/<версія>` від `dev` → pull request у `main` → після злиття деплой запускається автоматично → `main` зливається назад у `dev`.

Тести: `npm test` у `backend` і `mobile`. CI запускає їх перед збіркою, тож тест, що не пройшов, зупиняє деплой.

Журнал зборів цін (статус, кількість цін, що не вдалося прочитати):

```bash
sudo docker compose -p pricewise -f /etc/pricewise/compose.yml --env-file /etc/pricewise/production.env exec api npm run monitor:runs:prod -- --issues
```

Черга можливих дублікатів товарів (після кожного збору; нічого не об'єднується без підтвердження):

```bash
sudo docker compose -p pricewise -f /etc/pricewise/compose.yml --env-file /etc/pricewise/production.env exec api npm run matches:prod -- --limit=50
```

Команди: `approve <id>` об'єднує пару, `reject <id>` більше її не пропонує, `approve-all --yes` об'єднує всі пари з однаковою назвою.

Перевірка на сервері:

```bash
sudo docker compose -p pricewise -f /etc/pricewise/compose.yml --env-file /etc/pricewise/production.env ps
curl -fsS https://pricewise.130.61.111.249.sslip.io/api/health
systemctl status pricewise-backup.timer
```
