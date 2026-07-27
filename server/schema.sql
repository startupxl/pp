-- Principle Pitch — MySQL schema
-- Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
-- Import this via phpMyAdmin in hPanel, or it runs automatically on server
-- startup when DB_HOST/DB_USER/DB_PASSWORD/DB_NAME env vars are set.
--
-- User accounts and passwords live entirely in Firebase Authentication —
-- there's no `users` table here. Rows below are tagged with `user_id`,
-- which stores the Firebase UID (a string, not an auto-increment int).

CREATE TABLE IF NOT EXISTS frameworks (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  complexity VARCHAR(50) NOT NULL,
  read_time VARCHAR(50),
  tag VARCHAR(100),
  description TEXT,
  featured TINYINT(1) DEFAULT 0,
  workshop TINYINT(1) DEFAULT 0,
  is_new TINYINT(1) DEFAULT 0,
  tool VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Session',
  framework_id INT,
  context_text MEDIUMTEXT,
  stage VARCHAR(20) NOT NULL DEFAULT 'context',
  committed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id)
);

CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  quadrants JSON,
  metrics JSON,
  insights JSON,
  executive_summary MEDIUMTEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Generic store for the newer tools (Issue Tree Builder, MECE Workspace,
-- Pyramid Principle Workspace, SCQA Workshop, Logic Tree, Systems Thinking,
-- First Principles, Hypothesis Workspace). Each row is one saved document;
-- `type` distinguishes which tool it belongs to and `data` holds the
-- tool-specific shape (tree nodes, pyramid levels, SCQA fields, etc).
CREATE TABLE IF NOT EXISTS tool_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_user_type (user_id, type)
);

-- One row per user, tracking their current plan and (if paid) the linked
-- PayPal subscription. Users with no row default to the "free" plan in
-- application code — a row is only created here once they interact with
-- billing (subscribe, or an admin/manual override).
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id VARCHAR(128) PRIMARY KEY,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  seats INT NOT NULL DEFAULT 1,
  paypal_subscription_id VARCHAR(64),
  paypal_plan_id VARCHAR(64),
  current_period_end TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_paypal (paypal_subscription_id)
);

-- Monthly AI-assist usage counter per user. `period` is a YYYY-MM string so
-- allowances reset naturally each billing month without a cron job.
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id VARCHAR(128) NOT NULL,
  period VARCHAR(7) NOT NULL,
  used INT NOT NULL DEFAULT 0,
  addon_balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, period)
);

-- Lightweight audit trail of individual AI-assist calls, for cost/usage
-- analysis later. Not read by the app today — write-only.
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  feature VARCHAR(20) NOT NULL,
  tool VARCHAR(30),
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_usage_log_user (user_id)
);
