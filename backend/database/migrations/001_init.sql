-- Создание базовых таблиц для авторизации и приглашений (этап 1)

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  city VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS positions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL UNIQUE,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  position_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_positions FOREIGN KEY (position_id) REFERENCES positions(id),
  CONSTRAINT fk_users_branches FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  role_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_by INT UNSIGNED DEFAULT NULL,
  used_at DATETIME DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_inv_used_by FOREIGN KEY (used_by) REFERENCES users(id),
  CONSTRAINT fk_inv_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Наполнение справочников (roles, branches, positions)
INSERT INTO roles (name, description) VALUES
  ('employee', 'Сотрудник'),
  ('manager', 'Управляющий'),
  ('superadmin', 'Суперадмин')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO branches (name, city) VALUES
  ('Сургут-1 (30 лет Победы)', 'Сургут'),
  ('Сургут-2 (Усольцева)', 'Сургут'),
  ('Сургут-3 (Магистральная)', 'Сургут'),
  ('Парковая (Нефтеюганск)', 'Нефтеюганск')
ON DUPLICATE KEY UPDATE city = VALUES(city);

INSERT INTO positions (name) VALUES
  ('Официант'),
  ('Повар'),
  ('Старший повар'),
  ('Шеф повар'),
  ('Администратор'),
  ('Бармен'),
  ('Логист'),
  ('Курьер'),
  ('Управляющий')
ON DUPLICATE KEY UPDATE name = VALUES(name);
