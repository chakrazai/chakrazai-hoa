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
app.get('/api/ping', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT current_database() AS db, inet_server_addr() AS host, COUNT(*) AS residents FROM residents');
    const url = process.env.DATABASE_URL || '';
    const maskedUrl = url.replace(/:([^:@]+)@/, ':***@');
    res.json({ db: 'ok', jwt: !!process.env.JWT_SECRET, env: process.env.NODE_ENV,
               database: rows[0].db, dbHost: rows[0].host,
               residents: rows[0].residents, dbUrl: maskedUrl });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message });
  }
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status||500).json({ message: err.message });
});

async function seedResidents(commId) {
  const residents = [
    {
      unit: 'Unit 1', nit_number: '1-A',
      address: '1 Oakwood Drive, Unit 1-A, Sacramento, CA 95814',
      owner_name: 'Alex Thompson', co_owner: 'Jennifer Thompson',
      phone: '(916) 555-0101', email: 'a.thompson@email.com',
      move_in_date: 'Mar 2018', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 0,
      status: 'good', portal_status: 'active', auto_pay: true,
      parking_spaces: [
        { space: 'P-12', make: 'Toyota', model: 'Camry',  year: '2022', license: 'ABC1234' },
        { space: 'P-13', make: 'Honda',  model: 'CR-V',   year: '2021', license: 'XYZ5678' },
      ],
      tenants: [],
      relatives: [
        { id: 1, name: 'Jennifer Thompson', relation: 'Spouse', phone: '(916) 555-0102', email: 'j.thompson@email.com' },
        { id: 2, name: 'Emma Thompson',     relation: 'Child',  phone: '',               email: '' },
      ],
      guest_parking_tags: [
        { id: 1, tagId: 'GP-012', issuedDate: 'Jan 15, 2026', expiryDate: 'Jan 15, 2027', licensePlate: 'ABC1234', vehicle: '2022 Toyota Camry', status: 'active' },
      ],
      garage_fobs: [
        { id: 1, fobId: 'GF-001', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'May 1, 2026' },
        { id: 2, fobId: 'GF-002', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 29, 2026' },
      ],
      garage_fob_log: [
        { id: 1, date: 'May 1, 2026', time: '8:32 AM',  action: 'Entry', fobId: 'GF-001', gate: 'Gate A' },
        { id: 2, date: 'May 1, 2026', time: '6:15 PM',  action: 'Exit',  fobId: 'GF-001', gate: 'Gate A' },
      ],
      common_area_fobs: [
        { id: 1, fobId: 'CA-001', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 30, 2026' },
      ],
      common_area_fob_log: [
        { id: 1, date: 'Apr 30, 2026', time: '7:15 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-001' },
        { id: 2, date: 'Apr 29, 2026', time: '3:40 PM', area: 'Pool',           action: 'Entry', fobId: 'CA-001' },
      ],
    },
    {
      unit: 'Unit 12', nit_number: '12-B',
      address: '12 Oakwood Drive, Unit 12-B, Sacramento, CA 95814',
      owner_name: 'Diana Foster', co_owner: null,
      phone: '(916) 555-0212', email: 'd.foster@email.com',
      move_in_date: 'Jun 2020', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'late', balance: 150,
      status: 'delinquent', portal_status: 'invited', auto_pay: false,
      parking_spaces: [{ space: 'P-24', make: 'Ford', model: 'F-150', year: '2020', license: 'DEF2345' }],
      tenants: [],
      relatives: [{ id: 1, name: 'Robert Foster', relation: 'Parent', phone: '(916) 555-0300', email: '' }],
      guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-024', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 28, 2026' }],
      garage_fob_log: [
        { id: 1, date: 'Apr 28, 2026', time: '9:05 AM', action: 'Entry', fobId: 'GF-024', gate: 'Gate A' },
        { id: 2, date: 'Apr 28, 2026', time: '7:30 PM', action: 'Exit',  fobId: 'GF-024', gate: 'Gate A' },
      ],
      common_area_fobs: [{ id: 1, fobId: 'CA-024', areas: 'Pool, Gym', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 20, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 20, 2026', time: '11:00 AM', area: 'Pool', action: 'Entry', fobId: 'CA-024' }],
    },
    {
      unit: 'Unit 33', nit_number: '33-A',
      address: '33 Oakwood Drive, Unit 33-A, Sacramento, CA 95814',
      owner_name: 'Michael Torres', co_owner: 'Rosa Torres',
      phone: '(916) 555-0333', email: 'm.torres@email.com',
      move_in_date: 'Jan 2016', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'collections', balance: 900,
      status: 'collections', portal_status: 'none', auto_pay: false,
      parking_spaces: [{ space: 'P-33', make: 'Chevrolet', model: 'Silverado', year: '2018', license: 'GHI3456' }],
      tenants: [],
      relatives: [],
      guest_parking_tags: [{ id: 1, tagId: 'GP-033', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'XYZ9876', vehicle: '2019 Honda Civic', status: 'active' }],
      garage_fobs: [{ id: 1, fobId: 'GF-033', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 15, 2026' }],
      garage_fob_log: [{ id: 1, date: 'Mar 15, 2026', time: '10:22 AM', action: 'Entry', fobId: 'GF-033', gate: 'Gate B' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-033', areas: 'Gym', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 10, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Mar 10, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-033' }],
    },
    {
      unit: 'Unit 42', nit_number: '42-C',
      address: '42 Oakwood Drive, Unit 42-C, Sacramento, CA 95814',
      owner_name: 'Sarah Chen', co_owner: 'David Chen',
      phone: '(916) 555-0442', email: 's.chen@email.com',
      move_in_date: 'Sep 2019', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 0,
      status: 'good', portal_status: 'active', auto_pay: true,
      parking_spaces: [
        { space: 'P-42', make: 'Tesla',  model: 'Model 3', year: '2023', license: 'JKL4567' },
        { space: 'P-43', make: 'Toyota', model: 'RAV4',    year: '2021', license: 'MNO5678' },
      ],
      tenants: [],
      relatives: [
        { id: 1, name: 'David Chen', relation: 'Spouse', phone: '(916) 555-0443', email: 'd.chen@email.com' },
        { id: 2, name: 'Leo Chen',   relation: 'Child',  phone: '',               email: '' },
      ],
      guest_parking_tags: [{ id: 1, tagId: 'GP-042', issuedDate: 'Mar 1, 2026', expiryDate: 'Mar 1, 2027', licensePlate: 'DEF5678', vehicle: '2021 Subaru Outback', status: 'active' }],
      garage_fobs: [{ id: 1, fobId: 'GF-042', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 2, 2026' }],
      garage_fob_log: [
        { id: 1, date: 'May 2, 2026', time: '7:55 AM', action: 'Entry', fobId: 'GF-042', gate: 'Gate A' },
        { id: 2, date: 'May 2, 2026', time: '5:40 PM', action: 'Exit',  fobId: 'GF-042', gate: 'Gate A' },
      ],
      common_area_fobs: [{ id: 1, fobId: 'CA-042', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 1, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'May 1, 2026', time: '4:30 PM', area: 'Tennis Court', action: 'Entry', fobId: 'CA-042' }],
    },
    {
      unit: 'Unit 44', nit_number: '44-A',
      address: '44 Oakwood Drive, Unit 44-A, Sacramento, CA 95814',
      owner_name: 'Carlos Rivera', co_owner: null,
      phone: '(916) 555-0544', email: 'c.rivera@email.com',
      move_in_date: 'Feb 2021', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 100,
      status: 'good', portal_status: 'active', auto_pay: false,
      parking_spaces: [{ space: 'P-44', make: 'BMW', model: 'X5', year: '2022', license: 'PQR6789' }],
      tenants: [],
      relatives: [{ id: 1, name: 'Maria Rivera', relation: 'Parent', phone: '(916) 555-0545', email: '' }],
      guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-044', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'May 2, 2026' }],
      garage_fob_log: [{ id: 1, date: 'May 2, 2026', time: '11:45 PM', action: 'Entry', fobId: 'GF-044', gate: 'Gate A' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-044', areas: 'Pool, Gym', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'Apr 10, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 10, 2026', time: '2:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-044' }],
    },
    {
      unit: 'Unit 55', nit_number: '55-B',
      address: '55 Oakwood Drive, Unit 55-B, Sacramento, CA 95814',
      owner_name: 'Kevin Zhang', co_owner: 'Linda Zhang',
      phone: '(916) 555-0655', email: 'k.zhang@email.com',
      move_in_date: 'Nov 2017', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'late', balance: 150,
      status: 'delinquent', portal_status: 'active', auto_pay: false,
      parking_spaces: [{ space: 'P-55', make: 'Audi', model: 'Q7', year: '2021', license: 'STU7890' }],
      tenants: [],
      relatives: [{ id: 1, name: 'Linda Zhang', relation: 'Spouse', phone: '(916) 555-0656', email: 'l.zhang@email.com' }],
      guest_parking_tags: [{ id: 1, tagId: 'GP-055', issuedDate: 'Dec 1, 2025', expiryDate: 'Dec 1, 2026', licensePlate: 'JKL3456', vehicle: '2023 Tesla Model 3', status: 'active' }],
      garage_fobs: [{ id: 1, fobId: 'GF-055', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'May 1, 2026' }],
      garage_fob_log: [{ id: 1, date: 'May 1, 2026', time: '8:00 AM', action: 'Entry', fobId: 'GF-055', gate: 'Gate B' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-055', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'Apr 25, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 25, 2026', time: '5:00 PM', area: 'Clubhouse', action: 'Entry', fobId: 'CA-055' }],
    },
    {
      unit: 'Unit 67', nit_number: '67-A',
      address: '67 Oakwood Drive, Unit 67-A, Sacramento, CA 95814',
      owner_name: 'Amanda Liu', co_owner: null,
      phone: '(916) 555-0767', email: 'a.liu@email.com',
      move_in_date: 'Apr 2022', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'delinquent', balance: 300,
      status: 'delinquent', portal_status: 'active', auto_pay: false,
      parking_spaces: [{ space: 'P-67', make: 'Nissan', model: 'Altima', year: '2019', license: 'VWX8901' }],
      tenants: [], relatives: [], guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-067', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 30, 2026' }],
      garage_fob_log: [{ id: 1, date: 'Apr 30, 2026', time: '9:30 AM', action: 'Entry', fobId: 'GF-067', gate: 'Gate A' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-067', areas: 'Gym', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 15, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 15, 2026', time: '6:30 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-067' }],
    },
    {
      unit: 'Unit 83', nit_number: '83-A',
      address: '83 Oakwood Drive, Unit 83-A, Sacramento, CA 95814',
      owner_name: 'Tom Nakamura', co_owner: 'Yuki Nakamura',
      phone: '(916) 555-0883', email: 't.nakamura@email.com',
      move_in_date: 'Jul 2015', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 0,
      status: 'good', portal_status: 'active', auto_pay: true,
      parking_spaces: [
        { space: 'P-83', make: 'Lexus',  model: 'RX 350', year: '2022', license: 'YZA9012' },
        { space: 'P-84', make: 'Toyota', model: 'Sienna',  year: '2020', license: 'BCD0123' },
      ],
      tenants: [],
      relatives: [
        { id: 1, name: 'Yuki Nakamura', relation: 'Spouse', phone: '(916) 555-0884', email: 'y.nakamura@email.com' },
        { id: 2, name: 'Hiro Nakamura', relation: 'Child',  phone: '',               email: '' },
      ],
      guest_parking_tags: [{ id: 1, tagId: 'GP-083', issuedDate: 'Jan 1, 2026', expiryDate: 'Jan 1, 2027', licensePlate: 'MNO7890', vehicle: '2020 Lexus RX', status: 'active' }],
      garage_fobs: [
        { id: 1, fobId: 'GF-083', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
        { id: 2, fobId: 'GF-084', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
      ],
      garage_fob_log: [
        { id: 1, date: 'May 2, 2026', time: '7:20 AM', action: 'Entry', fobId: 'GF-083', gate: 'Gate A' },
        { id: 2, date: 'May 2, 2026', time: '5:50 PM', action: 'Exit',  fobId: 'GF-083', gate: 'Gate A' },
      ],
      common_area_fobs: [{ id: 1, fobId: 'CA-083', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 1, 2026' }],
      common_area_fob_log: [
        { id: 1, date: 'May 1, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-083' },
        { id: 2, date: 'May 1, 2026', time: '8:15 AM', area: 'Fitness Center', action: 'Exit',  fobId: 'CA-083' },
      ],
    },
    {
      unit: 'Unit 88', nit_number: '88-B',
      address: '88 Oakwood Drive, Unit 88-B, Sacramento, CA 95814',
      owner_name: 'Laura Kim', co_owner: null,
      phone: '(916) 555-0988', email: 'l.kim@email.com',
      move_in_date: 'Aug 2023', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'late', balance: 150,
      status: 'delinquent', portal_status: 'active', auto_pay: false,
      parking_spaces: [{ space: 'P-88', make: 'Mercedes', model: 'GLE', year: '2023', license: 'EFG1234' }],
      tenants: [],
      relatives: [{ id: 1, name: 'James Kim', relation: 'Sibling', phone: '(916) 555-0989', email: 'j.kim@email.com' }],
      guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-088', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'May 2, 2026' }],
      garage_fob_log: [{ id: 1, date: 'May 2, 2026', time: '10:05 AM', action: 'Entry', fobId: 'GF-088', gate: 'Gate B' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-088', areas: 'Pool, Gym', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'Apr 22, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 22, 2026', time: '1:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-088' }],
    },
    {
      unit: 'Unit 119', nit_number: '119-A',
      address: '119 Oakwood Drive, Unit 119-A, Sacramento, CA 95814',
      owner_name: 'Maria Garcia', co_owner: 'Jose Garcia',
      phone: '(916) 555-1190', email: 'm.garcia@email.com',
      move_in_date: 'May 2014', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 0,
      status: 'good', portal_status: 'active', auto_pay: true,
      parking_spaces: [
        { space: 'P-119', make: 'Porsche', model: 'Cayenne', year: '2023', license: 'HIJ2345' },
        { space: 'P-120', make: 'Tesla',   model: 'Model Y',  year: '2022', license: 'KLM3456' },
      ],
      tenants: [],
      relatives: [
        { id: 1, name: 'Jose Garcia',  relation: 'Spouse', phone: '(916) 555-1191', email: 'j.garcia@email.com' },
        { id: 2, name: 'Sofia Garcia', relation: 'Child',  phone: '(916) 555-1192', email: 's.garcia@email.com' },
      ],
      guest_parking_tags: [{ id: 1, tagId: 'GP-119', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'PQR2345', vehicle: '2022 BMW 3 Series', status: 'active' }],
      garage_fobs: [
        { id: 1, fobId: 'GF-119', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' },
        { id: 2, fobId: 'GF-120', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 1, 2026' },
      ],
      garage_fob_log: [
        { id: 1, date: 'May 2, 2026', time: '8:45 AM', action: 'Entry', fobId: 'GF-119', gate: 'Gate A' },
        { id: 2, date: 'May 2, 2026', time: '6:10 PM', action: 'Exit',  fobId: 'GF-119', gate: 'Gate A' },
      ],
      common_area_fobs: [{ id: 1, fobId: 'CA-119', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' }],
      common_area_fob_log: [
        { id: 1, date: 'May 2, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-119' },
        { id: 2, date: 'May 2, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Exit',  fobId: 'CA-119' },
      ],
    },
  ];

  let inserted = 0;
  for (const r of residents) {
    try {
      await db.query(
        `INSERT INTO residents
           (community_id, unit, owner_name, co_owner, nit_number, address, email, phone,
            move_in_date, move_out_date, hoa_amount, hoa_payment_status, balance, status,
            portal_status, auto_pay, parking_spaces, tenants, relatives,
            guest_parking_tags, garage_fobs, garage_fob_log, common_area_fobs, common_area_fob_log)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (community_id, unit) DO NOTHING`,
        [
          commId, r.unit, r.owner_name, r.co_owner, r.nit_number, r.address, r.email, r.phone,
          r.move_in_date, r.move_out_date, r.hoa_amount, r.hoa_payment_status, r.balance, r.status,
          r.portal_status, r.auto_pay,
          JSON.stringify(r.parking_spaces), JSON.stringify(r.tenants), JSON.stringify(r.relatives),
          JSON.stringify(r.guest_parking_tags), JSON.stringify(r.garage_fobs),
          JSON.stringify(r.garage_fob_log), JSON.stringify(r.common_area_fobs),
          JSON.stringify(r.common_area_fob_log),
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`⚠️  Resident seed failed for ${r.unit}:`, err.message);
    }
  }
  if (inserted > 0) console.log(`✅ Resident seed: ${inserted} resident(s) inserted`);
  else console.log('✅ Resident seed: all residents already present');
}

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
    const existingComm = await db.query(`SELECT id FROM communities WHERE name = 'Oakwood Estates HOA' LIMIT 1`);
    let commId = existingComm.rows[0]?.id;
    if (!commId) {
      const commRes = await db.query(
        `INSERT INTO communities (name, units, type, state, tier)
         VALUES ('Oakwood Estates HOA', 148, 'Self-managed', 'California', 'Full Service')
         RETURNING id`
      );
      commId = commRes.rows[0].id;
    }
    const userId = userRes.rows[0]?.id ?? (await db.query(`SELECT id FROM users WHERE email = 'admin@demo.com'`)).rows[0]?.id;
    if (userId && commId) {
      await db.query(
        `INSERT INTO user_communities (user_id, community_id, role)
         VALUES ($1, $2, 'board_president') ON CONFLICT DO NOTHING`,
        [userId, commId]
      );
      console.log('✅ Seed complete: admin@demo.com / password123 → community', commId);
    }

    // ── Resident seed ──────────────────────────────────────────────────────────
    await seedResidents(commId);
  } catch (err) {
    console.error('⚠️  Seed warning:', err.message);
  }

  app.listen(PORT, () => console.log(`✅ HOAConnect API running on http://localhost:${PORT}`));
}

start();
