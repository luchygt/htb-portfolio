# Портфоліо Hack The Box

Статичний сайт без залежностей: сертифікати, бейджі, машини та челенджі HTB.

## Структура

```
index.html   — розмітка
style.css    — стилі (кольори — змінні на початку файлу)
script.js    — логіка (фільтри, пошук, статистика, перегляд сертифікатів)
data.js      — ТВОЇ ДАНІ, редагуй тільки його
assets/      — картинки та PDF
  certs/     — сертифікати (png/jpg/pdf)
  badges/    — бейджі
  machines/  — аватари машин
```

## Адмін-панель (`admin.html`)

Відкрий `https://<нік>.github.io/<репозиторій>/admin.html`, введи свій логін GitHub, назву репозиторію і токен.
Там можна змінити профіль, додати чи видалити сертифікати, бейджі, машини й челенджі та завантажити картинки або PDF.
Кнопка **«Зберегти»** робить один коміт у репозиторій, і сайт оновлюється приблизно за хвилину.

Доступ має лише власник токена. Створи **fine-grained token**:
GitHub → Settings → Developer settings → Fine-grained tokens → *Only select repositories* (репозиторій сайту) →
Permissions → **Contents: Read and write**. Нікому не показуй токен. Галочку «Запам'ятати» став лише на своєму пристрої.

## Як додати свої дані вручну

Відкрий `data.js` і заміни приклади.

**Сертифікат:**
```js
{ title: "CPTS", issuer: "Hack The Box", date: "2026-09-14",
  image: "assets/certs/cpts.png", file: "assets/certs/cpts.pdf",
  credentialUrl: "https://...", description: "..." },
```

**Бейдж:** `{ name: "...", image: "assets/badges/x.png", date: "2026-05-10", description: "..." }`

**Машина:**
```js
{ name: "Lame", os: "Linux", difficulty: "Easy", date: "2026-04-11",
  image: "assets/machines/lame.png", tags: ["SMB"], writeup: "", user: true, root: true },
```

**Челендж:** `{ name: "...", category: "Web", difficulty: "Easy", date: "2026-03-14", writeup: "", tags: [] }`

Статистика (кількість, розподіл за складністю) рахується автоматично.
Якщо `image` порожній — показується заглушка.

> ⚠️ Правила HTB: райтапи публікуй тільки для **retired** машин і челенджів, і не викладай флаги.

## Перегляд

Просто відкрий `index.html` у браузері — сервер не потрібен.

## Публікація на GitHub Pages

1. Створи репозиторій `<твій_нік>.github.io` на GitHub.
2. Завантаж туди всі файли (index.html, style.css, script.js, data.js, assets/).
3. Settings → Pages → Source: `Deploy from a branch`, гілка `main`, папка `/ (root)`.
4. Через хвилину сайт буде на `https://<твій_нік>.github.io`.

Також підходять Netlify / Vercel / Cloudflare Pages — просто перетягни папку.
