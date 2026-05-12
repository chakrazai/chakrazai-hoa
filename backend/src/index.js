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
  commRouter, accountingRouter, taxRouter, invoiceRouter
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
app.use('/api/invoices',       invoiceRouter);

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

async function seedInvoices(commId) {
  const MOCK = [
    { vendor:'Greenscape Landscaping', category:'Landscaping',       invNum:'GS-2026-041', invDate:'May 2, 2026',  dueDate:'May 15, 2026', amount:4200, desc:'April 2026 landscaping services — 4 visits, mowing, trimming, seasonal planting', status:'unpaid',  payments:[] },
    { vendor:'AquaCare Pool Services', category:'Pool & Spa',        invNum:'AQ-2026-051', invDate:'May 1, 2026',  dueDate:'Jun 1, 2026',  amount:1800, desc:'May 2026 pool & spa maintenance — 8 visits, chemical balancing', status:'unpaid',  payments:[] },
    { vendor:'ProPlumb Emergency',     category:'Plumbing',          invNum:'PP-2026-0418',invDate:'Apr 19, 2026', dueDate:'May 19, 2026', amount:1840, desc:'Emergency main water line repair Apr 18', status:'paid',    payments:[{date:'Apr 28, 2026',amount:1840,method:'Check',ref:'#4521',note:'Full payment'}] },
    { vendor:'SecureWatch Security',   category:'Security',          invNum:'SW-2026-MAY', invDate:'May 1, 2026',  dueDate:'May 15, 2026', amount:3200, desc:'May 2026 security guard services + camera monitoring', status:'partial', payments:[{date:'May 5, 2026',amount:1600,method:'ACH',ref:'ACH-8821',note:'First installment — 50%'}] },
    { vendor:'Greenscape Landscaping', category:'Landscaping',       invNum:'GS-2026-031', invDate:'Apr 1, 2026',  dueDate:'Apr 15, 2026', amount:4200, desc:'March 2026 landscaping services — 4 visits', status:'paid',    payments:[{date:'Apr 8, 2026',amount:4200,method:'Check',ref:'#4498',note:'Full payment'}] },
    { vendor:'PaintRight Contractors', category:'Painting & General',invNum:'PR-2026-002', invDate:'Apr 15, 2026', dueDate:'May 1, 2026',  amount:6000, desc:'Building A exterior painting — Phase 1 deposit + Phase 2 progress payment', status:'partial', payments:[{date:'Apr 20, 2026',amount:3000,method:'Check',ref:'#4510',note:'50% deposit per contract'},{date:'May 1, 2026',amount:2000,method:'ACH',ref:'ACH-9103',note:'Progress payment — Phase 2 milestone'}] },
    { vendor:'AquaCare Pool Services', category:'Pool & Spa',        invNum:'AQ-2026-041', invDate:'Apr 1, 2026',  dueDate:'May 1, 2026',  amount:1800, desc:'April 2026 pool & spa maintenance — partial payment pending COI resolution', status:'overdue', payments:[{date:'Apr 25, 2026',amount:900,method:'ACH',ref:'ACH-8740',note:'Partial — holding balance pending COI renewal'}] },
    { vendor:'SecureLock Inc.',        category:'Locksmith & Gates', invNum:'SL-2026-Q1',  invDate:'Mar 31, 2026', dueDate:'Apr 15, 2026', amount:1700, desc:'Q1 2026 gate PM + FOB programming + emergency lockout', status:'paid',    payments:[{date:'Apr 10, 2026',amount:1700,method:'Check',ref:'#4505',note:'Full payment'}] },
    { vendor:'Metro Collection Group', category:'Collections',       invNum:'MCG-2026-Q1', invDate:'Apr 1, 2026',  dueDate:'Apr 30, 2026', amount:630,  desc:'Q1 2026 collections services — 15% contingency on $4,200 collected', status:'paid',    payments:[{date:'Apr 22, 2026',amount:630,method:'ACH',ref:'ACH-8801',note:'Full payment'}] },
    { vendor:'SecureWatch Security',   category:'Security',          invNum:'SW-2026-APR', invDate:'Apr 1, 2026',  dueDate:'Apr 15, 2026', amount:3200, desc:'April 2026 security guard services + camera monitoring', status:'paid',    payments:[{date:'Apr 12, 2026',amount:2000,method:'Check',ref:'#4502',note:'First installment'},{date:'Apr 20, 2026',amount:1200,method:'ACH',ref:'ACH-8720',note:'Balance — final installment'}] },
  ];
  let inserted = 0;
  for (const m of MOCK) {
    try {
      const { rows } = await db.query(
        `INSERT INTO vendor_invoices (community_id, vendor_name, category, invoice_number, invoice_date, due_date, amount, description, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (community_id, invoice_number) DO NOTHING
         RETURNING id`,
        [commId, m.vendor, m.category, m.invNum, m.invDate, m.dueDate, m.amount, m.desc, m.status]
      );
      if (rows.length) {
        for (const p of m.payments) {
          await db.query(
            `INSERT INTO invoice_payments (invoice_id, community_id, pay_date, amount, method, reference, note)
             SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS (SELECT 1 FROM invoice_payments WHERE invoice_id=$1 AND pay_date=$3 AND amount=$4)`,
            [rows[0].id, commId, p.date, p.amount, p.method, p.ref || null, p.note || null]
          );
        }
        inserted++;
      }
    } catch (err) { console.error(`⚠️  Invoice seed failed for ${m.invNum}:`, err.message); }
  }
  console.log(`✅ Invoice seed: ${inserted}/10 invoice(s) seeded`);
}

async function seedDues(commId) {
  try {
    const existing = await db.query('SELECT COUNT(*) as cnt FROM dues_accounts WHERE community_id=$1', [commId]);
    if (parseInt(existing.rows[0].cnt) > 0) {
      console.log('✅ Dues accounts already seeded, skipping');
      return;
    }
    const seed = [
      { unit:'Unit 1',   status:'current',    balance:0,   lastPaid:'2026-05-01', payments:['2026-05-01','2026-04-01','2026-03-01','2026-02-01','2026-01-01','2025-12-01'], method:'ACH'   },
      { unit:'Unit 7',   status:'current',    balance:0,   lastPaid:'2026-04-25', payments:['2026-04-25','2026-03-25','2026-02-25','2026-01-25','2025-12-25','2025-11-25'], method:'Check' },
      { unit:'Unit 12',  status:'late',       balance:150, lastPaid:'2026-03-31', payments:['2026-03-31','2026-02-28','2026-01-31','2025-12-31','2025-11-30'],              method:'Check' },
      { unit:'Unit 33',  status:'collections',balance:900, lastPaid:'2026-02-09', payments:['2026-02-09','2026-01-09','2025-12-09','2025-11-09'],                           method:'Check' },
      { unit:'Unit 42',  status:'current',    balance:0,   lastPaid:'2026-04-26', payments:['2026-04-26','2026-03-26','2026-02-26','2026-01-26','2025-12-26','2025-11-26'], method:'ACH'   },
      { unit:'Unit 44',  status:'current',    balance:50,  lastPaid:'2026-04-15', payments:['2026-04-15','2026-03-15','2026-02-15','2026-01-15','2025-12-15','2025-11-15'], method:'Check' },
      { unit:'Unit 55',  status:'late',       balance:150, lastPaid:'2026-03-31', payments:['2026-03-31','2026-02-28','2026-01-31','2025-12-31','2025-11-30'],              method:'ACH'   },
      { unit:'Unit 67',  status:'delinquent', balance:300, lastPaid:'2026-03-10', payments:['2026-03-10','2026-02-10','2026-01-10','2025-12-10','2025-11-10'],              method:'Check' },
      { unit:'Unit 83',  status:'current',    balance:0,   lastPaid:'2026-04-24', payments:['2026-04-24','2026-03-24','2026-02-24','2026-01-24','2025-12-24','2025-11-24'], method:'ACH'   },
      { unit:'Unit 88',  status:'late',       balance:150, lastPaid:'2026-03-31', payments:['2026-03-31','2026-02-28','2026-01-31','2025-12-31','2025-11-30'],              method:'Check' },
      { unit:'Unit 104', status:'delinquent', balance:150, lastPaid:'2026-03-10', payments:['2026-03-10','2026-02-10','2026-01-10','2025-12-10','2025-11-10'],              method:'Check' },
      { unit:'Unit 119', status:'current',    balance:0,   lastPaid:'2026-04-25', payments:['2026-04-25','2026-03-25','2026-02-25','2026-01-25','2025-12-25','2025-11-25'], method:'ACH'   },
    ];
    let daSeeded = 0, pSeeded = 0;
    for (const d of seed) {
      const res = await db.query('SELECT id FROM residents WHERE community_id=$1 AND unit=$2 LIMIT 1', [commId, d.unit]);
      if (!res.rows.length) continue;
      const rid = res.rows[0].id;
      await db.query(
        `INSERT INTO dues_accounts (community_id, resident_id, balance, monthly_amount, status, last_paid_at)
         VALUES ($1,$2,$3,150,$4,$5::timestamptz)
         ON CONFLICT (resident_id) DO NOTHING`,
        [commId, rid, d.balance, d.status, d.lastPaid]
      );
      daSeeded++;
      for (const pd of d.payments) {
        await db.query(
          `INSERT INTO payments (resident_id, community_id, amount, method, status, paid_at)
           SELECT $1,$2,150,$3,'cleared',$4::timestamptz
           WHERE NOT EXISTS (SELECT 1 FROM payments WHERE resident_id=$1 AND paid_at::date=$4::date)`,
          [rid, commId, d.method, pd]
        );
        pSeeded++;
      }
    }
    console.log(`✅ Dues seed: ${daSeeded} accounts, ${pSeeded} payment rows`);
  } catch (err) { console.error('⚠️  Dues seed failed:', err.message); }
}

async function fixChargeRecords(commId) {
  try {
    // Fix any charge payments that were stored with negative amounts / old 'pending' status
    const { rowCount } = await db.query(
      `UPDATE payments SET amount = ABS(amount), status = 'charge'
       WHERE community_id=$1 AND method='Charge' AND (amount < 0 OR status='pending')`,
      [commId]
    );
    if (rowCount > 0) console.log(`✅ Fixed ${rowCount} charge record(s) to positive amount + status='charge'`);
  } catch (err) { console.error('⚠️  fixChargeRecords failed:', err.message); }
}

async function seedFobEvents(commId) {
  try {
    // Seed replacement fob events for specific residents + charge fees to their dues accounts.
    // Each entry either adds a new fob to the resident's JSONB array and/or charges a fee.
    const events = [
      {
        unit: 'Unit 12', fobType: 'garage',
        newFob: { fobId: 'GF-024B', status: 'active', issuedDate: 'Apr 10, 2026', lastUsed: '—', reason: 'lost' },
        fee: 50, feeDesc: 'Garage fob replacement (lost) — GF-024B',
      },
      {
        unit: 'Unit 44', fobType: 'common_area',
        newFob: { fobId: 'CA-044B', status: 'active', issuedDate: 'Apr 15, 2026', lastUsed: '—', reason: 'damaged', areas: 'Pool, Gym' },
        fee: 25, feeDesc: 'Common area fob replacement (damaged) — CA-044B',
      },
      {
        unit: 'Unit 7', fobType: 'common_area',
        newFob: { fobId: 'CA-007B', status: 'active', issuedDate: 'May 1, 2026', lastUsed: '—', reason: 'hoa_assigned', areas: 'Pool, Gym, Clubhouse' },
        fee: 0,
      },
      {
        unit: 'Unit 88', fobType: 'code',
        newCode: { code: '7812', areas: 'Pool, Gym', issuedDate: 'Apr 20, 2026', status: 'active', reason: 'hoa_assigned' },
        fee: 0,
      },
      {
        unit: 'Unit 33', fobType: 'code',
        newCode: { code: '4491', areas: 'Gym', issuedDate: 'Mar 5, 2026', status: 'active', reason: 'hoa_assigned' },
        fee: 0,
      },
    ];

    for (const ev of events) {
      const res = await db.query('SELECT id, garage_fobs, common_area_fobs, common_area_codes FROM residents WHERE community_id=$1 AND unit=$2 LIMIT 1', [commId, ev.unit]);
      if (!res.rows.length) continue;
      const { id: rid, garage_fobs, common_area_fobs, common_area_codes } = res.rows[0];

      if (ev.fobType === 'garage') {
        const existing = Array.isArray(garage_fobs) ? garage_fobs : [];
        if (existing.some(f => f.fobId === ev.newFob.fobId)) continue;
        const updated = [...existing, { ...ev.newFob, id: Date.now() + Math.floor(Math.random() * 1000) }];
        await db.query('UPDATE residents SET garage_fobs=$1 WHERE id=$2', [JSON.stringify(updated), rid]);
      } else if (ev.fobType === 'common_area') {
        const existing = Array.isArray(common_area_fobs) ? common_area_fobs : [];
        if (existing.some(f => f.fobId === ev.newFob.fobId)) continue;
        const updated = [...existing, { ...ev.newFob, id: Date.now() + Math.floor(Math.random() * 1000) }];
        await db.query('UPDATE residents SET common_area_fobs=$1 WHERE id=$2', [JSON.stringify(updated), rid]);
      } else if (ev.fobType === 'code') {
        const existing = Array.isArray(common_area_codes) ? common_area_codes : [];
        if (existing.some(c => c.code === ev.newCode.code)) continue;
        const updated = [...existing, { ...ev.newCode, id: Date.now() + Math.floor(Math.random() * 1000) }];
        await db.query('UPDATE residents SET common_area_codes=$1 WHERE id=$2', [JSON.stringify(updated), rid]);
      }

      if (ev.fee > 0) {
        await db.query('UPDATE dues_accounts SET balance = balance + $1 WHERE community_id=$2 AND resident_id=$3', [ev.fee, commId, rid]);
        await db.query(
          `INSERT INTO payments (resident_id, community_id, amount, method, status, note, paid_at)
           SELECT $1,$2,$3,'Charge','charge',$4,NOW()
           WHERE NOT EXISTS (SELECT 1 FROM payments WHERE resident_id=$1 AND note=$4 AND method='Charge')`,
          [rid, commId, Math.abs(ev.fee), ev.feeDesc]
        );
        await db.query(
          `INSERT INTO transactions (community_id, type, category, amount, description, transaction_date)
           SELECT $1,'income','Fob/Access Fees',$2,$3,CURRENT_DATE
           WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE community_id=$1 AND description=$3 AND type='income')`,
          [commId, Math.abs(ev.fee), ev.feeDesc]
        );
      }
    }
    console.log('✅ Fob events seed complete');
  } catch (err) { console.error('⚠️  Fob events seed failed:', err.message); }
}

async function seedViolations(commId) {
  try {
    const existing = await db.query('SELECT COUNT(*) AS cnt FROM violations WHERE community_id=$1', [commId]);
    if (parseInt(existing.rows[0].cnt) > 0) {
      console.log('✅ Violations already seeded, skipping');
      return;
    }
    const SEED = [
      { unit:'Unit 88',  type:'Parking',      description:'Vehicle in fire lane',               fine:75,  status:'notice_sent',       issuedDate:'2026-04-26' },
      { unit:'Unit 12',  type:'Parking',       description:'Guest spot occupied 7+ days',        fine:50,  status:'hearing_pending',   issuedDate:'2026-04-24' },
      { unit:'Unit 55',  type:'Landscaping',   description:'Unapproved front yard modification', fine:100, status:'escalated',         issuedDate:'2026-04-22' },
      { unit:'Unit 119', type:'Landscaping',   description:'Dead landscaping not remedied',      fine:75,  status:'notice_sent',       issuedDate:'2026-04-18' },
      { unit:'Unit 44',  type:'Noise',         description:'Repeated late-night disturbance',    fine:100, status:'hearing_scheduled', issuedDate:'2026-04-15' },
      { unit:'Unit 33',  type:'Modification',  description:'Unapproved front door replacement',  fine:100, status:'under_review',      issuedDate:'2026-04-10' },
      { unit:'Unit 7',   type:'Parking',       description:'Inoperable vehicle stored',          fine:75,  status:'second_notice',     issuedDate:'2026-04-08' },
    ];
    let seeded = 0;
    for (const v of SEED) {
      const res = await db.query('SELECT id FROM residents WHERE community_id=$1 AND unit=$2 LIMIT 1', [commId, v.unit]);
      if (!res.rows.length) { console.warn(`⚠️  No resident found for ${v.unit}, skipping violation`); continue; }
      await db.query(
        `INSERT INTO violations (community_id, resident_id, type, description, fine, status, issued_date)
         SELECT $1,$2,$3,$4,$5,$6,$7::date
         WHERE NOT EXISTS (
           SELECT 1 FROM violations WHERE community_id=$1 AND resident_id=$2 AND issued_date=$7::date
         )`,
        [commId, res.rows[0].id, v.type, v.description, v.fine, v.status, v.issuedDate]
      );
      seeded++;
    }
    console.log(`✅ Violations seed: ${seeded}/${SEED.length} violation(s) seeded`);
  } catch (err) { console.error('⚠️  Violations seed failed:', err.message); }
}

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
    }
    ,{
      unit: 'Unit 7', nit_number: '7-A',
      address: '7 Oakwood Drive, Unit 7-A, Sacramento, CA 95814',
      owner_name: 'James Okonkwo', co_owner: null,
      phone: '(916) 555-0107', email: 'j.okonkwo@email.com',
      move_in_date: 'Oct 2019', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'current', balance: 0,
      status: 'good', portal_status: 'active', auto_pay: false,
      parking_spaces: [{ space: 'P-07', make: 'Hyundai', model: 'Sonata', year: '2021', license: 'ABC7777' }],
      tenants: [], relatives: [], guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-007', status: 'active', issuedDate: 'Oct 10, 2019', lastUsed: 'Apr 25, 2026' }],
      garage_fob_log: [{ id: 1, date: 'Apr 25, 2026', time: '9:00 AM', action: 'Entry', fobId: 'GF-007', gate: 'Gate A' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-007', areas: 'Pool, Gym', status: 'active', issuedDate: 'Oct 10, 2019', lastUsed: 'Apr 24, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 24, 2026', time: '3:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-007' }],
    }
    ,{
      unit: 'Unit 104', nit_number: '104-A',
      address: '104 Oakwood Drive, Unit 104-A, Sacramento, CA 95814',
      owner_name: 'Robert Patel', co_owner: null,
      phone: '(916) 555-1040', email: 'r.patel@email.com',
      move_in_date: 'Mar 2021', move_out_date: null,
      hoa_amount: 150, hoa_payment_status: 'late', balance: 150,
      status: 'delinquent', portal_status: 'invited', auto_pay: false,
      parking_spaces: [{ space: 'P-104', make: 'Kia', model: 'Telluride', year: '2022', license: 'RPT1040' }],
      tenants: [], relatives: [], guest_parking_tags: [],
      garage_fobs: [{ id: 1, fobId: 'GF-104', status: 'active', issuedDate: 'Mar 5, 2021', lastUsed: 'Apr 30, 2026' }],
      garage_fob_log: [{ id: 1, date: 'Apr 30, 2026', time: '10:15 AM', action: 'Entry', fobId: 'GF-104', gate: 'Gate B' }],
      common_area_fobs: [{ id: 1, fobId: 'CA-104', areas: 'Pool, Gym', status: 'active', issuedDate: 'Mar 5, 2021', lastUsed: 'Apr 10, 2026' }],
      common_area_fob_log: [{ id: 1, date: 'Apr 10, 2026', time: '11:00 AM', area: 'Pool', action: 'Entry', fobId: 'CA-104' }],
    }
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
  console.log(`✅ Resident seed: ${inserted}/10 resident(s) upserted`);
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
    await seedDues(commId);
    await seedInvoices(commId);
    await seedViolations(commId);
    await seedFobEvents(commId);
    await fixChargeRecords(commId);
  } catch (err) {
    console.error('⚠️  Seed warning:', err.message);
  }

  app.listen(PORT, () => console.log(`✅ HOAConnect API running on http://localhost:${PORT}`));
}

start();
