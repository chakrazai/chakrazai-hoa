require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');

const authRoutes      = require('./routes/auth');
const electionsRouter = require('./routes/elections');
const {
  communityRouter, duesRouter, complianceRouter, violationsRouter,
  maintenanceRouter, vendorRouter, residentRouter, documentRouter,
  commRouter, accountingRouter, taxRouter
} = require('./routes/all');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 200 }));
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 10 }));

app.use('/api/auth',           authRoutes);
app.use('/api/communities',    communityRouter);
app.use('/api/dues',           duesRouter);
app.use('/api/compliance',     complianceRouter);
app.use('/api/violations',     violationsRouter);
app.use('/api/maintenance',    maintenanceRouter);
app.use('/api/vendors',        vendorRouter);
app.use('/api/residents',      residentRouter);
app.use('/api/documents',      documentRouter);
app.use('/api/communications', commRouter);
app.use('/api/accounting',     accountingRouter);
app.use('/api/tax',            taxRouter);
app.use('/api/elections',      electionsRouter);

app.get('/health', (req, res) => res.json({ status:'ok', ts: new Date().toISOString() }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ error: process.env.NODE_ENV==='production' ? 'Internal server error' : err.message });
});

async function start() {
  try {
    const { migrations } = require('./db/migrate-inline');
    await db.query(migrations);
    console.log('✅ Database schema up to date');
  } catch (err) {
    console.error('⚠️  Migration warning:', err.message);
  }

  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 12);
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ('admin@demo.com', $1, 'Jane', 'Ramirez', 'board_president')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [hash]
    );
    const commRes = await db.query(
      `INSERT INTO communities (name, units, type, state, tier)
       VALUES ('Oakwood Estates HOA', 148, 'Self-managed', 'California', 'Full Service')
       ON CONFLICT (name) DO NOTHING RETURNING id`
    );
    if (userRes.rows[0] && commRes.rows[0]) {
      await db.query(
        `INSERT INTO user_communities (user_id, community_id, role)
         VALUES ($1, $2, 'board_president') ON CONFLICT DO NOTHING`,
        [userRes.rows[0].id, commRes.rows[0].id]
      );
      console.log('✅ Default admin seeded: admin@demo.com / password123');
    } else {
      console.log('✅ Seed check complete (records already exist)');
    }
  } catch (err) {
    console.error('⚠️  Seed warning:', err.message);
  }

  app.listen(PORT, () => console.log(`✅ HOAConnect API running on http://localhost:${PORT}`));
}

start();
