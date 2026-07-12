# Foxen Profiles Backend

Это бэкенд для хранения профилей, баннеров и сессий пользователей Foxen. 
Работает на базе Cloudflare Workers (бесплатно до 100,000 запросов в день).
Встроена бесплатная AI-модерация описаний профилей на базе `Llama-3-8b`.

## Как задеплоить (опубликовать)

1. Установите Node.js если ещё нет: https://nodejs.org/
2. Откройте терминал в папке `worker/`
3. Выполните установку зависимостей:
   ```bash
   npm install
   ```
4. Авторизуйтесь в Cloudflare (потребуется создать бесплатный аккаунт, если нет):
   ```bash
   npx wrangler login
   ```
5. Создайте пространство для хранения (KV namespace):
   ```bash
   npx wrangler kv:namespace create "FPT_PROFILES"
   ```
   *В консоли появится сообщение с ID. Скопируйте значение `id`.*
6. Откройте файл `wrangler.toml` и вставьте скопированный ID вместо `ЗАМЕНИТЕ_ЭТОТ_ID_НА_СВОЙ`.
7. Задеплойте код:
   ```bash
   npm run deploy
   ```
8. В консоли появится ваш URL (что-то вроде `https://foxen-profiles.<ВАШ_SUBDOMAIN>.workers.dev`).
   Скопируйте этот URL и обновите переменную `SERVER` в файле `content/features/profile_descriptions.js` в расширении.
