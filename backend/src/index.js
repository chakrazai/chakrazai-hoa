require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const authRoutes = require('./routes/auth');
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

app.get('/health', (req, res) => res.json({ status:'ok', ts: new Date().toISOString() }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ error: process.env.NODE_ENV==='production' ? 'Internal server error' : err.message });
});

app.listen(PORT, () => console.log(`✅ HOAConnect API running on http://localhost:${PORT}`));
