# CONTRIBUTING.md

Руководство для разработчиков и LLM-агентов, работающих с репозиторием.

---

## Начало работы

```bash
# Backend
cd backend && npm install

# Admin Frontend
cd admin-frontend && npm install

# Frontend (MiniApp)
cd frontend && npm install

# Bot
cd bot && npm install
```

После клонирования установи git hooks:

```bash
node scripts/install-hooks.mjs
```

---

## Проверки перед коммитом

Запускай проверки из корня репозитория:

```bash
# Проверка .env.example синхронизации
node scripts/check-env-sync.mjs

# Проверка отсутствия временных файлов
node scripts/check-no-temp-files.mjs

# Список изменённых файлов
git status --short
```

Для backend — запусти тесты:

```bash
cd backend && npm test
```

---

## ENV-переменные

При добавлении новой ENV-переменной **обязательно** обнови:

1. `backend/src/config/env.js` — единый конфиг-модуль.
2. `.env.example` соответствующего пакета.
3. `.github/workflows/ci.yml` — если переменная нужна в CI.
4. Документацию в `docs/`, если переменная нужна при деплое.
5. Тестовые конфиги, если переменная влияет на тесты.

**ЗАПРЕЩЕНО:**

- Хардкодить значения в коде.
- Читать `process.env.*` напрямую вне `backend/src/config/env.js`.
- Добавлять реальные секреты в `.env.example`.

---

## Commit messages

Commit messages пишутся на **русском языке** в формате:

```text
type(scope): описание на русском
```

Допустимые типы: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `build`, `perf`.

Примеры:

```text
fix(auth): исправлена проверка refresh-токена
feat(ui): добавлен компонент пустого состояния
refactor(config): вынесена валидация env-переменных
```

Commit message **не должен** содержать:

- пути к файлам
- имена таблиц, эндпоинтов
- низкоуровневые технические детали

Git hook для автоматической проверки устанавливается через `node scripts/install-hooks.mjs`.

---

## Архитектура

Перед изменением архитектуры прочитай:

- `ARCHITECTURE.md` — полные требования к архитектуре

Backend: `Routes -> Controller -> Service -> Repository -> Database`  
SQL — только в Repository. Бизнес-логика — только в Service.

---

## UI-компоненты

Перед созданием нового UI-компонента прочитай:

- `DESIGN_SYSTEM.md` — документация по UI-компонентам

Используй проектные компоненты вместо нативных HTML-элементов.

---

## Временные файлы

- Не создавай временные файлы в репозитории.
- Удаляй debug-скрипты, `.tmp`, `.bak` файлы до коммита.
- Проверяй `git status --short` перед каждым коммитом.

---

## Кодировка

Все файлы — UTF-8, без BOM. Переносы строк — LF (Unix).  
Правила закреплены в `.editorconfig` и `.gitattributes`.

При работе в PowerShell на Windows:

```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```
