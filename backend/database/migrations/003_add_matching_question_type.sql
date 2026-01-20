ALTER TABLE assessment_questions
  MODIFY question_type ENUM('single','multiple','text','matching') NOT NULL DEFAULT 'single';

ALTER TABLE question_bank
  MODIFY question_type ENUM('single','multiple','text','matching') NOT NULL DEFAULT 'single';
