# matproekty-179-stranica

Публичный репозиторий ровно с одной вещью: страница-приглашение научным руководителям
математических проектов 179 школы, вместе со встроенной анкетой.

Адрес страницы: https://d1-d57.github.io/matproekty-179-stranica/

## Что здесь лежит и чего здесь нет

Здесь — только то, что должно быть публичным: `stranica/index.html`, `stranica/anketa.js`,
`stranica/anketa.css` и workflow публикации. Рабочий репозиторий проекта (`matproekty-179`)
приватный и сюда не копируется целиком: в нём внутренние материалы, которым в открытом
доступе не место.

## Как обновить страницу

Файлы правятся в приватном `matproekty-179`, сюда переносятся копированием:

```bash
cp ~/Documents/GitHub/matproekty-179/stranica/{index.html,anketa.js,anketa.css} \
   ~/Documents/GitHub/matproekty-179-stranica/stranica/
cd ~/Documents/GitHub/matproekty-179-stranica && git add -A && git commit -m "страница: обновление" && git push
```

Публикация после `push` в `main` идёт сама, workflow `pages`; сайт — содержимое `stranica/`.

## Анкета

Форма шлёт `POST` на Cloudflare Worker `https://ankety-worker.ankety.workers.dev/submit`,
`form_id` = `nauchruki-2026`; ответы лежат в базе D1 `ankety-db`. Секретов в этом
репозитории нет и быть не должно: всё, что здесь, публично по определению.
