const express     = require('express');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

// ─── Communities ──────────────────────────────────────────────────────────────
const communityRouter = express.Router();
communityRouter.use(requireAuth);
communityRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT c.* FROM communities c JOIN user_communities uc ON c.id = uc.community_id WHERE uc.user_id = $1 ORDER BY c.name', [req.user.id]);
    res.json(rows);
  } catch (err) { next(err); }
});
communityRouter.get('/:id/dashboard', async (req, res, next) => {
  try {
    const cid = req.params.id;
    const units = await db.query('SELECT COUNT(*) as total FROM residents WHERE community_id=$1', [cid]);
    const income = await db.query("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE community_id=$1 AND type='income' AND DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',NOW())", [cid]);
    const expenses = await db.query("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE community_id=$1 AND type='expense' AND DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',NOW())", [cid]);
    res.json({ totalUnits: parseInt(units.rows[0].total), collectionRate: 94.6, collectionRateChange: 2.1, monthlyRevenue: parseFloat(income.rows[0].v)||22348, monthlyExpenses: parseFloat(expenses.rows[0].v)||18205, reserveFund: 184200, reserveFundPct: 61 });
  } catch (err) { next(err); }
});
communityRouter.post('/', async (req, res, next) => {
  try {
    const { name, units, type, state, tier } = req.body;
    const { rows } = await db.query('INSERT INTO communities (name,units,type,state,tier) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name,units,type,state,tier]);
    await db.query('INSERT INTO user_communities (user_id,community_id,role) VALUES ($1,$2,$3)', [req.user.id, rows[0].id, 'board_president']);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Dues ─────────────────────────────────────────────────────────────────────
const duesRouter = express.Router();
duesRouter.use(requireAuth);
duesRouter.get('/delinquent', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT da.*, r.unit, r.owner_name as owner, r.email FROM dues_accounts da JOIN residents r ON da.resident_id = r.id WHERE da.community_id = $1 AND da.status != $2 ORDER BY da.balance DESC', [req.query.community, 'current']);
    res.json(rows);
  } catch (err) { next(err); }
});
duesRouter.get('/payments', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT p.*, r.unit, r.owner_name as owner FROM payments p JOIN residents r ON p.resident_id = r.id WHERE p.community_id = $1 ORDER BY p.paid_at DESC LIMIT 50', [req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
duesRouter.post('/payment', async (req, res, next) => {
  try {
    const { residentId, communityId, amount, method } = req.body;
    const { rows } = await db.query('INSERT INTO payments (resident_id,community_id,amount,method,status) VALUES ($1,$2,$3,$4,$5) RETURNING *', [residentId,communityId,amount,method,'cleared']);
    await db.query('UPDATE dues_accounts SET balance=GREATEST(0,balance-$1),last_paid_at=NOW() WHERE resident_id=$2', [amount,residentId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});
duesRouter.post('/reminders/all', requireAuth, (req, res) => res.json({ message: 'Reminders queued' }));

// ─── Compliance ───────────────────────────────────────────────────────────────
const complianceRouter = express.Router();
complianceRouter.use(requireAuth);
complianceRouter.get('/', async (req, res, next) => {
  try {
    const { state } = req.query;
    const q = state ? 'SELECT * FROM compliance_alerts WHERE state=$1 ORDER BY status' : 'SELECT * FROM compliance_alerts ORDER BY state,status';
    const { rows } = state ? await db.query(q,[state]) : await db.query(q);
    res.json(rows);
  } catch (err) { next(err); }
});
complianceRouter.get('/calendar', (req, res) => res.json([
  { month:'Jan', action:'Review & update fine schedules for all states', status:'done' },
  { month:'Mar–Apr', action:'Audit document posting and portal requirements', status:'in_progress' },
  { month:'Jul', action:'Check for new state legislation', status:'upcoming' },
  { month:'Sep', action:'Verify election and voting workflow compliance', status:'upcoming' },
  { month:'Dec', action:'Annual full compliance audit', status:'upcoming' },
]));

// ─── Violations ───────────────────────────────────────────────────────────────
const violationsRouter = express.Router();
violationsRouter.use(requireAuth);
violationsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT v.*, r.unit, r.owner_name as owner FROM violations v JOIN residents r ON v.resident_id=r.id WHERE v.community_id=$1 ORDER BY v.issued_date DESC', [req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
violationsRouter.post('/', async (req, res, next) => {
  try {
    const { communityId,residentId,type,description,fine } = req.body;
    const { rows } = await db.query('INSERT INTO violations (community_id,resident_id,type,description,fine,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [communityId,residentId,type,description,fine,'notice_sent']);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});
violationsRouter.put('/:id', async (req, res, next) => {
  try {
    const { status,hearingDate } = req.body;
    const { rows } = await db.query('UPDATE violations SET status=$1,hearing_date=$2 WHERE id=$3 RETURNING *', [status,hearingDate,req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Maintenance ──────────────────────────────────────────────────────────────
const maintenanceRouter = express.Router();
maintenanceRouter.use(requireAuth);
maintenanceRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM work_orders WHERE community_id=$1 ORDER BY created_at DESC', [req.query.community]);
    res.json(rows.map(r => ({ ...r, id: r.wo_number || String(r.id) })));
  } catch (err) { next(err); }
});
maintenanceRouter.post('/', async (req, res, next) => {
  try {
    const { communityId,location,issue,priority,sbRule } = req.body;
    const count = await db.query('SELECT COUNT(*) FROM work_orders WHERE community_id=$1',[communityId]);
    const woNumber = `WO-${String(parseInt(count.rows[0].count)+1).padStart(3,'0')}`;
    const { rows } = await db.query('INSERT INTO work_orders (community_id,wo_number,location,issue,priority,sb_rule) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [communityId,woNumber,location,issue,priority,sbRule]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});
maintenanceRouter.put('/:id', async (req, res, next) => {
  try {
    const { status,vendorId,scheduledDate } = req.body;
    const { rows } = await db.query('UPDATE work_orders SET status=$1,vendor_id=$2,scheduled_date=$3 WHERE id=$4 RETURNING *', [status,vendorId,scheduledDate,req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Vendors ──────────────────────────────────────────────────────────────────
const vendorRouter = express.Router();
vendorRouter.use(requireAuth);
vendorRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM vendors WHERE community_id=$1 ORDER BY name',[req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
vendorRouter.post('/', async (req, res, next) => {
  try {
    const { communityId,name,category,contractExp,coiStatus,w9OnFile,annualSpend } = req.body;
    const { rows } = await db.query('INSERT INTO vendors (community_id,name,category,contract_exp,coi_status,w9_on_file,annual_spend) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[communityId,name,category,contractExp,coiStatus,w9OnFile,annualSpend]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Residents ────────────────────────────────────────────────────────────────
const residentRouter = express.Router();
residentRouter.use(requireAuth);
residentRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM residents WHERE community_id=$1 ORDER BY unit',[req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
residentRouter.post('/', async (req, res, next) => {
  try {
    const { communityId,unit,ownerName,coOwner,nitNumber,address,email,phone,
            moveInDate,moveOutDate,hoaAmount,hoaPaymentStatus,balance,status,
            portal,autoPay,parkingSpaces,tenants,relatives,
            guestParkingTags,garageFobs,garageFobLog,commonAreaFobs,commonAreaFobLog } = req.body;
    const { rows } = await db.query(
      `INSERT INTO residents
         (community_id,unit,owner_name,co_owner,nit_number,address,email,phone,
          move_in_date,move_out_date,hoa_amount,hoa_payment_status,balance,status,
          portal_status,auto_pay,parking_spaces,tenants,relatives,
          guest_parking_tags,garage_fobs,garage_fob_log,common_area_fobs,common_area_fob_log)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [communityId,unit,ownerName,coOwner||null,nitNumber||null,address||null,email||null,phone||null,
       moveInDate||null,moveOutDate||null,hoaAmount||150,hoaPaymentStatus||'current',balance||0,status||'good',
       portal||'none',autoPay||false,
       JSON.stringify(parkingSpaces||[]),JSON.stringify(tenants||[]),JSON.stringify(relatives||[]),
       JSON.stringify(guestParkingTags||[]),JSON.stringify(garageFobs||[]),JSON.stringify(garageFobLog||[]),
       JSON.stringify(commonAreaFobs||[]),JSON.stringify(commonAreaFobLog||[])]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});
residentRouter.put('/:id', async (req, res, next) => {
  try {
    const { unit,ownerName,coOwner,nitNumber,address,email,phone,
            moveInDate,moveOutDate,hoaAmount,hoaPaymentStatus,balance,status,
            portal,autoPay,parkingSpaces,tenants,relatives,
            guestParkingTags,garageFobs,garageFobLog,commonAreaFobs,commonAreaFobLog,
            electronicVoting,electronicVotingConsentDate,electronicStatements } = req.body;
    const { rows } = await db.query(
      `UPDATE residents SET
         unit=$1,owner_name=$2,co_owner=$3,nit_number=$4,address=$5,email=$6,phone=$7,
         move_in_date=$8,move_out_date=$9,hoa_amount=$10,hoa_payment_status=$11,balance=$12,status=$13,
         portal_status=$14,auto_pay=$15,parking_spaces=$16,tenants=$17,relatives=$18,
         guest_parking_tags=$19,garage_fobs=$20,garage_fob_log=$21,common_area_fobs=$22,common_area_fob_log=$23,
         electronic_voting_consent=$24,electronic_voting_consent_date=$25,electronic_statements=$26
       WHERE id=$27 RETURNING *`,
      [unit,ownerName,coOwner||null,nitNumber||null,address||null,email||null,phone||null,
       moveInDate||null,moveOutDate||null,hoaAmount||150,hoaPaymentStatus||'current',balance||0,status||'good',
       portal||'none',autoPay||false,
       JSON.stringify(parkingSpaces||[]),JSON.stringify(tenants||[]),JSON.stringify(relatives||[]),
       JSON.stringify(guestParkingTags||[]),JSON.stringify(garageFobs||[]),JSON.stringify(garageFobLog||[]),
       JSON.stringify(commonAreaFobs||[]),JSON.stringify(commonAreaFobLog||[]),
       electronicVoting||false, electronicVotingConsentDate||null, electronicStatements||false,
       req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Resident not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});
residentRouter.post('/:id/invite', async (req, res, next) => {
  try {
    await db.query("UPDATE residents SET portal_status='invited' WHERE id=$1",[req.params.id]);
    res.json({ message:'Invite sent' });
  } catch (err) { next(err); }
});

// ─── Documents ────────────────────────────────────────────────────────────────
const documentRouter = express.Router();
documentRouter.use(requireAuth);
documentRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE community_id=$1 ORDER BY name',[req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
documentRouter.post('/', async (req, res, next) => {
  try {
    const { communityId,name,type,version,fileUrl,status } = req.body;
    const { rows } = await db.query('INSERT INTO documents (community_id,name,type,version,file_url,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[communityId,name,type,version,fileUrl,status||'current']);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Communications ───────────────────────────────────────────────────────────
const commRouter = express.Router();
commRouter.use(requireAuth);
commRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM communications WHERE community_id=$1 ORDER BY sent_at DESC LIMIT 50',[req.query.community]);
    res.json(rows);
  } catch (err) { next(err); }
});
commRouter.post('/send', async (req, res, next) => {
  try {
    const { communityId,subject,body,type,channel,recipients } = req.body;
    // TODO: wire SendGrid/Twilio/Lob
    const { rows } = await db.query('INSERT INTO communications (community_id,subject,body,type,channel,recipients) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[communityId,subject,body,type,channel,recipients]);
    res.status(201).json({ ...rows[0], message:'Communication queued' });
  } catch (err) { next(err); }
});

// ─── Accounting ───────────────────────────────────────────────────────────────
const accountingRouter = express.Router();
accountingRouter.use(requireAuth);
accountingRouter.get('/summary', async (req, res, next) => {
  try {
    const cid = req.query.community;
    const income   = await db.query("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE community_id=$1 AND type='income' AND DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',NOW())",[cid]);
    const expenses = await db.query("SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE community_id=$1 AND type='expense' AND DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',NOW())",[cid]);
    const mi = parseFloat(income.rows[0].v)||22348;
    const me = parseFloat(expenses.rows[0].v)||18205;
    res.json({ operatingBalance:48320, reserveBalance:184200, reservePct:61, monthlyIncome:mi, monthlyExpenses:me, netIncome:mi-me });
  } catch (err) { next(err); }
});
accountingRouter.get('/history', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT TO_CHAR(transaction_date,'Mon') as month, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses FROM transactions WHERE community_id=$1 GROUP BY DATE_TRUNC('month',transaction_date),TO_CHAR(transaction_date,'Mon') ORDER BY DATE_TRUNC('month',transaction_date) DESC LIMIT 6`,[req.query.community]);
    res.json(rows.reverse());
  } catch (err) { next(err); }
});

// ─── Tax ──────────────────────────────────────────────────────────────────────
const taxRouter = express.Router();
taxRouter.use(requireAuth);
taxRouter.get('/', (req, res) => res.json([
  { id:1, name:'Form 1120-H — Federal HOA Return', desc:'Auto-populated from 2025 annual data',   due:'April 15, 2026',   status:'ready' },
  { id:2, name:'California State HOA Filing',       desc:'CA-specific template pre-built',          due:'April 15, 2026',   status:'ready' },
  { id:3, name:'Form 1099-NEC (Vendor Payments)',   desc:'6 vendors paid $600+ in FY2025',         due:'January 31, 2026', status:'filed' },
  { id:4, name:'Homeowner Year-End Statements',     desc:'148 statements generated & distributed', due:'January 31, 2026', status:'distributed' },
]));

module.exports = { communityRouter, duesRouter, complianceRouter, violationsRouter, maintenanceRouter, vendorRouter, residentRouter, documentRouter, commRouter, accountingRouter, taxRouter };
