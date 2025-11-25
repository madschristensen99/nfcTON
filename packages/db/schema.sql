CREATE TABLE IF NOT EXISTS hoodies (
  code        CHAR(6) PRIMARY KEY,
  first_name  TEXT NOT NULL,
  tg_handle   TEXT NOT NULL,
  email       TEXT NOT NULL,
  size        TEXT NOT NULL CHECK (size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'burned')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  burned_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hoodies_status ON hoodies(status);
CREATE INDEX IF NOT EXISTS idx_hoodies_created_at ON hoodies(created_at);