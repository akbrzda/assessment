ALTER TABLE assessment_questions
  ADD COLUMN question_bank_id INT UNSIGNED NULL AFTER assessment_id;

ALTER TABLE assessment_questions
  ADD INDEX idx_question_bank (question_bank_id);

ALTER TABLE assessment_questions
  ADD CONSTRAINT fk_assessment_questions_bank
  FOREIGN KEY (question_bank_id) REFERENCES question_bank(id) ON DELETE SET NULL;
