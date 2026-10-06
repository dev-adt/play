-- MySQL 8.0 Schema for Tiến lên miền Bắc online (play.edunow.today)
-- Database: play_db (charset utf8mb4)

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  balance INT NOT NULL DEFAULT 1000,
  last_login_reward_at VARCHAR(32) DEFAULT NULL,
  login_streak INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token VARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'basic',
  password_hash VARCHAR(255) DEFAULT NULL,
  max_players INT NOT NULL DEFAULT 4,
  bet_amount INT NOT NULL DEFAULT 10,
  owner_id VARCHAR(64) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rooms_code (code),
  CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_members (
  room_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  seat_index INT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT fk_rm_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_rm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  rules_version VARCHAR(32) NOT NULL DEFAULT '1.0',
  participants JSON NOT NULL,
  phase VARCHAR(32) NOT NULL,
  state_version INT NOT NULL DEFAULT 1,
  snapshot JSON DEFAULT NULL,
  deadlines DATETIME DEFAULT NULL,
  first_game TINYINT(1) NOT NULL DEFAULT 0,
  end_reason VARCHAR(64) DEFAULT NULL,
  winners JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_games_room (room_id),
  CONSTRAINT fk_games_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_events (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL,
  seq INT NOT NULL,
  actor_id VARCHAR(64) DEFAULT NULL,
  action_type VARCHAR(64) NOT NULL,
  payload JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_game_events_game (game_id, seq),
  CONSTRAINT fk_events_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS score_ledger (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) DEFAULT NULL,
  mode VARCHAR(16) NOT NULL,
  from_player_id VARCHAR(64) NOT NULL,
  to_player_id VARCHAR(64) DEFAULT NULL,
  reason VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  card_ids JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_score_ledger_game (game_id),
  CONSTRAINT fk_ledger_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_from FOREIGN KEY (from_player_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_results (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL,
  player_id VARCHAR(64) NOT NULL,
  score_delta INT NOT NULL,
  win_delta INT NOT NULL DEFAULT 0,
  breakdown JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_game_results_user (player_id),
  CONSTRAINT fk_results_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_user FOREIGN KEY (player_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_mode_stats (
  user_id VARCHAR(64) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  net_score INT NOT NULL DEFAULT 0,
  total_negative INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, mode),
  CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
