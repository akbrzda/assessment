ALTER TABLE course_sections
  ADD COLUMN test_shuffle_questions TINYINT(1) NOT NULL DEFAULT 1 AFTER estimated_minutes,
  ADD COLUMN test_shuffle_options TINYINT(1) NOT NULL DEFAULT 1 AFTER test_shuffle_questions,
  ADD COLUMN test_show_results_after_completion TINYINT(1) NOT NULL DEFAULT 1 AFTER test_shuffle_options;