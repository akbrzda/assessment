ALTER TABLE assessment_question_options
  ADD COLUMN match_text VARCHAR(512) NULL AFTER option_text;

ALTER TABLE question_bank_options
  ADD COLUMN match_text VARCHAR(512) NULL AFTER option_text;
