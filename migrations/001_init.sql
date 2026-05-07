CREATE TABLE IF NOT EXISTS gage_cache (
  site_no TEXT PRIMARY KEY,
  site_name TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  county TEXT,
  huc8 TEXT,
  last_gage_height REAL,
  last_streamflow REAL,
  last_updated TEXT,
  flood_stage REAL,
  action_stage REAL,
  major_flood_stage REAL,
  moderate_flood_stage REAL,
  data_source TEXT DEFAULT 'usgs'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  site_no TEXT NOT NULL,
  site_name TEXT NOT NULL,
  trigger_level TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_alerted_at TEXT
);

CREATE TABLE IF NOT EXISTS alert_log (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  site_no TEXT NOT NULL,
  trigger_level TEXT NOT NULL,
  gage_height REAL,
  streamflow REAL,
  sent_at TEXT NOT NULL,
  resend_message_id TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value, updated_at)
VALUES ('alerts_enabled', 'true', datetime('now'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_site_no ON subscriptions(site_no);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log(sent_at);
