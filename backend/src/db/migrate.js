require('dotenv').config();
const db = require('./index');

const migrations = `
-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  role          VARCHAR(50) DEFAULT 'board_member',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Communities (HOAs)
CREATE TABLE IF NOT EXISTS communities (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  units       INTEGER NOT NULL DEFAULT 0,
  type        VARCHAR(100),
  state       VARCHAR(50),
  tier        VARCHAR(100),
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User <-> Community membership
CREATE TABLE IF NOT EXISTS user_communities (
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  community_id  INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  role          VARCHAR(50) DEFAULT 'board_member',
  PRIMARY KEY (user_id, community_id)
);

-- Residents (homeowners)
CREATE TABLE IF NOT EXISTS residents (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  unit          VARCHAR(50) NOT NULL,
  owner_name    VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(50),
  portal_status VARCHAR(50) DEFAULT 'none',
  auto_pay      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Dues accounts
CREATE TABLE IF NOT EXISTS dues_accounts (
  id            SERIAL PRIMARY KEY,
  resident_id   INTEGER REFERENCES residents(id) ON DELETE CASCADE,
  community_id  INTEGER REFERENCES communities(id),
  balance       DECIMAL(10,2) DEFAULT 0,
  monthly_amount DECIMAL(10,2) DEFAULT 150,
  status        VARCHAR(50) DEFAULT 'current',
  last_paid_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL PRIMARY KEY,
  resident_id   INTEGER REFERENCES residents(id),
  community_id  INTEGER REFERENCES communities(id),
  amount        DECIMAL(10,2) NOT NULL,
  method        VARCHAR(50),
  status        VARCHAR(50) DEFAULT 'pending',
  stripe_charge_id VARCHAR(255),
  paid_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id            SERIAL PRIMARY KEY,
  state         VARCHAR(10) NOT NULL,
  law           VARCHAR(100) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  summary       TEXT,
  detail        TEXT,
  status        VARCHAR(50) DEFAULT 'action_required',
  effective_date VARCHAR(100),
  days_remaining INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Violations
CREATE TABLE IF NOT EXISTS violations (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id),
  resident_id   INTEGER REFERENCES residents(id),
  type          VARCHAR(100),
  description   TEXT,
  fine          DECIMAL(10,2),
  status        VARCHAR(50) DEFAULT 'notice_sent',
  hearing_date  DATE,
  issued_date   DATE DEFAULT CURRENT_DATE,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance / Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id),
  wo_number     VARCHAR(50) UNIQUE,
  location      VARCHAR(255),
  issue         TEXT,
  priority      VARCHAR(50) DEFAULT 'normal',
  vendor_id     INTEGER,
  status        VARCHAR(50) DEFAULT 'open',
  sb_rule       TEXT,
  sla_deadline  DATE,
  scheduled_date DATE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id              SERIAL PRIMARY KEY,
  community_id    INTEGER REFERENCES communities(id),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  contract_exp    VARCHAR(100),
  coi_status      VARCHAR(50) DEFAULT 'valid',
  coi_exp         VARCHAR(100),
  w9_on_file      BOOLEAN DEFAULT false,
  license_number  VARCHAR(100),
  annual_spend    DECIMAL(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id),
  name          VARCHAR(255) NOT NULL,
  type          VARCHAR(100),
  version       VARCHAR(50),
  status        VARCHAR(50) DEFAULT 'current',
  file_url      TEXT,
  note          TEXT,
  updated_by    VARCHAR(255),
  updated_date  VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id),
  subject       VARCHAR(500) NOT NULL,
  body          TEXT,
  type          VARCHAR(100),
  channel       VARCHAR(100),
  recipients    TEXT,
  open_rate     DECIMAL(5,2),
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Accounting transactions
CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  community_id  INTEGER REFERENCES communities(id),
  type          VARCHAR(50),
  category      VARCHAR(100),
  vendor        VARCHAR(255),
  amount        DECIMAL(12,2) NOT NULL,
  description   TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_residents_community     ON residents(community_id);
CREATE INDEX IF NOT EXISTS idx_dues_community          ON dues_accounts(community_id);
CREATE INDEX IF NOT EXISTS idx_violations_community    ON violations(community_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_community   ON work_orders(community_id);
CREATE INDEX IF NOT EXISTS idx_vendors_community       ON vendors(community_id);
CREATE INDEX IF NOT EXISTS idx_transactions_community  ON transactions(community_id);
CREATE INDEX IF NOT EXISTS idx_compliance_state        ON compliance_alerts(state);
`;

async function migrate() {
  console.log('Running database migrations...');
  try {
    await db.query(migrations);
    console.log('✅ Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
