# API-контракты модуля «Курсы» (Sprint 1-2)

Обновлено: 22.04.2026

## 1. Старт подтемы

`POST /courses/:courseId/topics/:topicId/start`

### Ответ 201

```json
{
  "topic": {
    "id": 123,
    "startedAt": "2026-04-22T10:12:45.000Z",
    "requiredReadingSeconds": 35
  }
}
```

### Ошибки

- `400` — некорректные идентификаторы
- `404` — подтема не найдена
- `409` — не завершена предыдущая обязательная подтема или курс закрыт

## 2. Завершение подтемы по материалу

`POST /courses/:courseId/topics/:topicId/complete`

### Ответ 200

```json
{
  "topic": {
    "id": 123,
    "completed": true,
    "elapsedSeconds": 41,
    "requiredSeconds": 35
  },
  "progress": {
    "progressPercent": 50,
    "passedRequiredSections": 2,
    "totalRequiredSections": 4
  }
}
```

### Ошибки

- `400` — некорректные идентификаторы
- `404` — подтема не найдена
- `409` — подтема не запущена / не хватает времени чтения / курс закрыт / требуется тест
- `422` — у подтемы нет теоретического материала

## 3. Совместимость

Существующие endpoint-ы (`view-material`, `attempts/:attemptId/complete`) остаются без изменений.
