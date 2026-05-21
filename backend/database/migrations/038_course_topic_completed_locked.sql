-- Миграция 038: статус completed_locked для тем курса
-- Цель: поддержать сценарий «тема была пройдена, но администратор добавил новую
-- обязательную тему перед ней — последующие темы переходят в completed_locked».
-- После прохождения новой темы статус восстанавливается до completed.

ALTER TABLE course_topic_user_progress
  MODIFY COLUMN status
    ENUM('not_started', 'in_progress', 'completed', 'failed', 'completed_locked')
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci
    NOT NULL
    DEFAULT 'not_started';
