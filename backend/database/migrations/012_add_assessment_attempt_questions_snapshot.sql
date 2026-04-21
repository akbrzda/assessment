CREATE TABLE IF NOT EXISTS assessment_attempt_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attempt_question (attempt_id, question_id),
  KEY idx_attempt_order (attempt_id, order_index),
  CONSTRAINT fk_attempt_questions_attempt
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_attempt_questions_question
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
