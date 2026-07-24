-- Principle Pitch — MySQL schema
-- Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
-- Import this via phpMyAdmin in hPanel, or it runs automatically on server
-- startup when DB_HOST/DB_USER/DB_PASSWORD/DB_NAME env vars are set.

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
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Session',
  framework_id INT,
  context_text MEDIUMTEXT,
  stage VARCHAR(20) NOT NULL DEFAULT 'context',
  committed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
-- Pyramid Principle Workspace, SCQA Workshop). Each row is one saved
-- document; `type` distinguishes which tool it belongs to and `data` holds
-- the tool-specific shape (tree nodes, pyramid levels, SCQA fields, etc).
CREATE TABLE IF NOT EXISTS tool_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
