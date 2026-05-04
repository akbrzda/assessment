DELETE FROM system_settings
WHERE setting_key IN (
  'gamification_points_per_assessment',
  'gamification_high_score_multiplier',
  'gamification_perfect_score_bonus',
  'gamification_monthly_activity_bonus'
);
