CREATE TABLE IF NOT EXISTS audit_logs (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  actor_user_id  INT UNSIGNED     NULL,
  actor_role     VARCHAR(64)      NULL,
  actor_name     VARCHAR(128)     NULL,
  action         VARCHAR(128)     NOT NULL,
  scope          VARCHAR(64)      NOT NULL DEFAULT 'admin_panel',
  entity_type    VARCHAR(64)      NULL,
  entity_id      BIGINT UNSIGNED  NULL,
  before_json    LONGTEXT         NULL,
  after_json     LONGTEXT         NULL,
  metadata_json  LONGTEXT         NULL,
  ip_address     VARCHAR(45)      NULL,
  user_agent     VARCHAR(512)     NULL,
  status         ENUM('success','failure') NOT NULL DEFAULT 'success',
  created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_audit_actor     (actor_user_id),
  KEY idx_audit_entity    (entity_type, entity_id),
  KEY idx_audit_action    (action),
  KEY idx_audit_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
