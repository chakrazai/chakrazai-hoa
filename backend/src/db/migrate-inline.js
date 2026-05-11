const migrations = `
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
CREATE TABLE IF NOT EXISTS communities (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  units      INTEGER NOT NULL DEFAULT 0,
  type       VARCHAR(100),
  state      VARCHAR(50),
  tier       VARCHAR(100),
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_communities (
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  role         VARCHAR(50) DEFAULT 'board_member',
  PRIMARY KEY (user_id, community_id)
);
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
CREATE TABLE IF NOT EXISTS dues_accounts (
  id             SERIAL PRIMARY KEY,
  resident_id    INTEGER REFERENCES residents(id) ON DELETE CASCADE,
  community_id   INTEGER REFERENCES communities(id),
  balance        DECIMAL(10,2) DEFAULT 0,
  monthly_amount DECIMAL(10,2) DEFAULT 150,
  status         VARCHAR(50) DEFAULT 'current',
  last_paid_at   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id               SERIAL PRIMARY KEY,
  resident_id      INTEGER REFERENCES residents(id),
  community_id     INTEGER REFERENCES communities(id),
  amount           DECIMAL(10,2) NOT NULL,
  method           VARCHAR(50),
  status           VARCHAR(50) DEFAULT 'pending',
  stripe_charge_id VARCHAR(255),
  paid_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id             SERIAL PRIMARY KEY,
  state          VARCHAR(10) NOT NULL,
  law            VARCHAR(100) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  summary        TEXT,
  detail         TEXT,
  status         VARCHAR(50) DEFAULT 'action_required',
  effective_date VARCHAR(100),
  days_remaining INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS violations (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id),
  resident_id  INTEGER REFERENCES residents(id),
  type         VARCHAR(100),
  description  TEXT,
  fine         DECIMAL(10,2),
  status       VARCHAR(50) DEFAULT 'notice_sent',
  hearing_date DATE,
  issued_date  DATE DEFAULT CURRENT_DATE,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS work_orders (
  id             SERIAL PRIMARY KEY,
  community_id   INTEGER REFERENCES communities(id),
  wo_number      VARCHAR(50) UNIQUE,
  location       VARCHAR(255),
  issue          TEXT,
  priority       VARCHAR(50) DEFAULT 'normal',
  vendor_id      INTEGER,
  status         VARCHAR(50) DEFAULT 'open',
  sb_rule        TEXT,
  sla_deadline   DATE,
  scheduled_date DATE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vendors (
  id             SERIAL PRIMARY KEY,
  community_id   INTEGER REFERENCES communities(id),
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(100),
  contract_exp   VARCHAR(100),
  coi_status     VARCHAR(50) DEFAULT 'valid',
  coi_exp        VARCHAR(100),
  w9_on_file     BOOLEAN DEFAULT false,
  license_number VARCHAR(100),
  annual_spend   DECIMAL(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id),
  name         VARCHAR(255) NOT NULL,
  type         VARCHAR(100),
  version      VARCHAR(50),
  status       VARCHAR(50) DEFAULT 'current',
  file_url     TEXT,
  note         TEXT,
  updated_by   VARCHAR(255),
  updated_date VARCHAR(100),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS communications (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id),
  subject      VARCHAR(500) NOT NULL,
  body         TEXT,
  type         VARCHAR(100),
  channel      VARCHAR(100),
  recipients   TEXT,
  open_rate    DECIMAL(5,2),
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS transactions (
  id               SERIAL PRIMARY KEY,
  community_id     INTEGER REFERENCES communities(id),
  type             VARCHAR(50),
  category         VARCHAR(100),
  vendor           VARCHAR(255),
  amount           DECIMAL(12,2) NOT NULL,
  description      TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS elections (
  id                         SERIAL PRIMARY KEY,
  community_id               INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  title                      VARCHAR(500) NOT NULL,
  type                       VARCHAR(100) DEFAULT 'board_director',
  stage                      VARCHAR(100) DEFAULT 'draft',
  seats_available            INTEGER DEFAULT 3,
  voting_method              VARCHAR(50)  DEFAULT 'hybrid',
  quorum_required            BOOLEAN      DEFAULT true,
  quorum_pct                 INTEGER      DEFAULT 25,
  total_eligible             INTEGER      DEFAULT 0,
  ballots_distributed        INTEGER      DEFAULT 0,
  ballots_received           INTEGER      DEFAULT 0,
  description                TEXT,
  ballot_instructions        TEXT,
  nom_open                   VARCHAR(100),
  nom_reminder               VARCHAR(100),
  nom_close                  VARCHAR(100),
  opt_in_deadline            VARCHAR(100),
  pre_ballot_notice          VARCHAR(100),
  ballot_dist_date           VARCHAR(100),
  voting_deadline            VARCHAR(100),
  counting_meeting_date      VARCHAR(100),
  retention_expiry           VARCHAR(100),
  inspector_name             VARCHAR(255),
  inspector_firm             VARCHAR(255),
  inspector_contact          VARCHAR(255),
  inspector_assigned_date    VARCHAR(100),
  inspector_conflict_checked BOOLEAN     DEFAULT false,
  acclamation_declared       BOOLEAN     DEFAULT false,
  quorum_met                 BOOLEAN,
  results                    JSONB,
  certified_date             VARCHAR(100),
  retention_status           VARCHAR(50) DEFAULT 'active',
  destroy_date               VARCHAR(100),
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS election_candidates (
  id              SERIAL PRIMARY KEY,
  election_id     INTEGER REFERENCES elections(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  unit            VARCHAR(50),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  bio             TEXT,
  nominated_date  VARCHAR(100),
  disq_reasons    TEXT[]  DEFAULT '{}',
  disqualified    BOOLEAN DEFAULT false,
  eligible        BOOLEAN DEFAULT true,
  override_reason TEXT,
  statement       TEXT,
  votes           INTEGER DEFAULT 0,
  elected         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS election_notices (
  id              SERIAL PRIMARY KEY,
  election_id     INTEGER REFERENCES elections(id) ON DELETE CASCADE,
  type            VARCHAR(100),
  sent_date       VARCHAR(100),
  recipient_count INTEGER     DEFAULT 0,
  method          VARCHAR(100),
  status          VARCHAR(50) DEFAULT 'sent',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ballot_receipts (
  id            SERIAL PRIMARY KEY,
  election_id   INTEGER REFERENCES elections(id) ON DELETE CASCADE,
  unit          VARCHAR(50),
  received_date VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS election_audit_log (
  id          SERIAL PRIMARY KEY,
  election_id INTEGER REFERENCES elections(id) ON DELETE CASCADE,
  ts          VARCHAR(100),
  action      VARCHAR(255),
  details     TEXT,
  by_user     VARCHAR(255),
  variant     VARCHAR(50) DEFAULT 'gray',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS co_owner           VARCHAR(255);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS address            TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS nit_number         VARCHAR(50);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS move_in_date       VARCHAR(50);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS move_out_date      VARCHAR(50);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS hoa_amount         DECIMAL(10,2) DEFAULT 150;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS hoa_payment_status VARCHAR(50)   DEFAULT 'current';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS balance            DECIMAL(10,2) DEFAULT 0;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS status             VARCHAR(50)   DEFAULT 'good';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS parking_spaces     JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS tenants            JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS relatives          JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS guest_parking_tags JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS garage_fobs        JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS garage_fob_log     JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS common_area_fobs   JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS common_area_fob_log JSONB DEFAULT '[]';
ALTER TABLE residents ADD COLUMN IF NOT EXISTS electronic_voting_consent      BOOLEAN DEFAULT false;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS electronic_voting_consent_date DATE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS electronic_statements          BOOLEAN DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_community_unit ON residents (community_id, unit);
CREATE INDEX IF NOT EXISTS idx_residents_community    ON residents(community_id);
CREATE INDEX IF NOT EXISTS idx_dues_community         ON dues_accounts(community_id);
CREATE INDEX IF NOT EXISTS idx_violations_community   ON violations(community_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_community  ON work_orders(community_id);
CREATE INDEX IF NOT EXISTS idx_vendors_community      ON vendors(community_id);
CREATE INDEX IF NOT EXISTS idx_transactions_community ON transactions(community_id);
CREATE INDEX IF NOT EXISTS idx_elections_community    ON elections(community_id);
CREATE INDEX IF NOT EXISTS idx_candidates_election    ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_notices_election       ON election_notices(election_id);
CREATE INDEX IF NOT EXISTS idx_receipts_election      ON ballot_receipts(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_election         ON election_audit_log(election_id);
`;

module.exports = { migrations };
