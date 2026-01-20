ALTER TABLE assessment_user_assignments
  ADD COLUMN is_direct TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;

UPDATE assessment_user_assignments aua
SET aua.is_direct = 1
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = aua.assessment_id
)
AND NOT EXISTS (
  SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aua.assessment_id
);
