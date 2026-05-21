-- Миграция 036: Добавить статус draft в courses и VIEW levels для аналитики
-- Причина: бэкенд создаёт курсы со статусом 'draft', но в ENUM его не было.
--          VIEW levels нужен для обратной совместимости аналитического модуля.

-- 1. Добавляем draft в enum статуса курса.
--    Порядок: draft → published → archived (жизненный цикл курса).
ALTER TABLE courses
  MODIFY COLUMN status
    ENUM('draft', 'published', 'archived')
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci
    NOT NULL
    DEFAULT 'draft';

-- 2. VIEW levels как псевдоним gamification_levels.
--    Поле id = level_number для совместимости с кодом, который JOIN-ит по users.level.
--    Код аналитики (analytics/admin/service.js) обновлён отдельно — JOIN теперь использует
--    gamification_levels напрямую, но VIEW сохраняется на случай внешних запросов.
CREATE OR REPLACE VIEW levels AS
  SELECT
    level_number  AS id,
    code,
    name,
    description,
    color,
    icon_url,
    is_active,
    sort_order,
    min_points,
    created_at,
    updated_at
  FROM gamification_levels;
