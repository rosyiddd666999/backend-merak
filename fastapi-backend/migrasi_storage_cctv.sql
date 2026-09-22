-- Migrasi storage MinIO + CCTV (jalankan sekali di MySQL existing).
-- Fresh install tidak perlu file ini (Base.metadata.create_all otomatis).

ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS cctv_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  object_key VARCHAR(500) NOT NULL,
  url VARCHAR(500) NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'incubator',
  INDEX ix_cctv_snapshots_id (id)
);
