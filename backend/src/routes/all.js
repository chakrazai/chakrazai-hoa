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

duesRouter.get('/accounts', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id as resident_id, r.unit, r.owner_name as owner, r.email, r.auto_pay,
              da.id, da.balance, da.monthly_amount, da.status, da.last_paid_at,
              CASE WHEN da.last_paid_at IS NOT NULL THEN EXTRACT(DAY FROM NOW() - da.last_paid_at)::INTEGER ELSE NULL END as days_past_due
       FROM residents r
       LEFT JOIN dues_accounts da ON da.resident_id = r.id
       WHERE r.community_id = $1
       ORDER BY r.unit`,
      [req.query.community]
    );
    res.json(rows.map(r => ({ ...r, balance: parseFloat(r.balance || 0), monthly_amount: parseFloat(r.monthly_amount || 150) })));
  } catch (err) { next(err); }
});

duesRouter.get('/delinquent', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT da.*, r.unit, r.owner_name as owner, r.email, r.auto_pay,
              CASE WHEN da.last_paid_at IS NOT NULL THEN EXTRACT(DAY FROM NOW() - da.last_paid_at)::INTEGER ELSE 0 END as days_past_due
       FROM dues_accounts da
       JOIN residents r ON da.resident_id = r.id
       WHERE da.community_id = $1 AND da.status != 'current'
       ORDER BY da.balance DESC`,
      [req.query.community]
    );
    res.json(rows.map(r => ({ ...r, balance: parseFloat(r.balance), amount: parseFloat(r.balance) })));
  } catch (err) { next(err); }
});

duesRouter.get('/payments', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, r.unit, r.owner_name as owner
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE p.community_id = $1
       ORDER BY p.paid_at DESC LIMIT 50`,
      [req.query.community]
    );
    res.json(rows.map(p => ({
      ...p,
      amount: parseFloat(p.amount),
      date: new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    })));
  } catch (err) { next(err); }
});

duesRouter.post('/payment', async (req, res, next) => {
  try {
    const { residentId, communityId, amount, method, note } = req.body;
    const { rows } = await db.query(
      'INSERT INTO payments (resident_id,community_id,amount,method,status,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [residentId, communityId, amount, method, 'cleared', note || null]
    );
    await db.query(
      'UPDATE dues_accounts SET balance=GREATEST(0,balance-$1),last_paid_at=NOW(),updated_at=NOW() WHERE resident_id=$2',
      [amount, residentId]
    );
    const { rows: acc } = await db.query('SELECT balance FROM dues_accounts WHERE resident_id=$1', [residentId]);
    if (acc.length) {
      const bal = parseFloat(acc[0].balance);
      const st = bal <= 0 ? 'current' : bal >= 900 ? 'collections' : bal >= 300 ? 'delinquent' : 'late';
      await db.query('UPDATE dues_accounts SET status=$1,updated_at=NOW() WHERE resident_id=$2', [st, residentId]);
    }
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

duesRouter.post('/charge', async (req, res, next) => {
  try {
    const { communityId, residentId, amount, description } = req.body;
    await db.query(
      `UPDATE dues_accounts SET balance = balance + $1, updated_at = NOW() WHERE community_id=$2 AND resident_id=$3`,
      [amount, communityId, residentId]
    );
    const { rows: acc } = await db.query(
      'SELECT balance FROM dues_accounts WHERE community_id=$1 AND resident_id=$2',
      [communityId, residentId]
    );
    if (acc.length) {
      const bal = parseFloat(acc[0].balance);
      const st = bal <= 0 ? 'current' : bal >= 900 ? 'collections' : bal >= 300 ? 'delinquent' : 'late';
      await db.query('UPDATE dues_accounts SET status=$1, updated_at=NOW() WHERE community_id=$2 AND resident_id=$3', [st, communityId, residentId]);
    }
    await db.query(
      `INSERT INTO payments (resident_id, community_id, amount, method, status, note, paid_at)
       VALUES ($1,$2,$3,'Charge','charge',$4,NOW())`,
      [residentId, communityId, Math.abs(amount), description]
    );
    await db.query(
      `INSERT INTO transactions (community_id, type, category, amount, description, transaction_date)
       VALUES ($1,'income','Fob/Access Fees',$2,$3,CURRENT_DATE)`,
      [communityId, Math.abs(amount), description]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});
duesRouter.post('/:accountId/reminder', async (req, res, next) => {
  try {
    res.json({ message: 'Reminder sent', accountId: req.params.accountId });
  } catch (err) { next(err); }
});

duesRouter.post('/reminders/all', requireAuth, (req, res) => res.json({ message: 'All reminders queued' }));

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
    const { rows } = await db.query(
      `SELECT v.id, v.type, v.description, v.fine, v.status, v.hearing_date,
              TO_CHAR(v.issued_date, 'Mon FMDD') AS "issuedDate",
              r.unit, r.owner_name AS owner
       FROM violations v
       JOIN residents r ON v.resident_id = r.id
       WHERE v.community_id = $1
       ORDER BY v.issued_date DESC`,
      [req.query.community]);
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
            guestParkingTags,garageFobs,garageFobLog,commonAreaFobs,commonAreaFobLog,commonAreaCodes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO residents
         (community_id,unit,owner_name,co_owner,nit_number,address,email,phone,
          move_in_date,move_out_date,hoa_amount,hoa_payment_status,balance,status,
          portal_status,auto_pay,parking_spaces,tenants,relatives,
          guest_parking_tags,garage_fobs,garage_fob_log,common_area_fobs,common_area_fob_log,common_area_codes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [communityId,unit,ownerName,coOwner||null,nitNumber||null,address||null,email||null,phone||null,
       moveInDate||null,moveOutDate||null,hoaAmount||150,hoaPaymentStatus||'current',balance||0,status||'good',
       portal||'none',autoPay||false,
       JSON.stringify(parkingSpaces||[]),JSON.stringify(tenants||[]),JSON.stringify(relatives||[]),
       JSON.stringify(guestParkingTags||[]),JSON.stringify(garageFobs||[]),JSON.stringify(garageFobLog||[]),
       JSON.stringify(commonAreaFobs||[]),JSON.stringify(commonAreaFobLog||[]),JSON.stringify(commonAreaCodes||[])]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});
residentRouter.put('/:id', async (req, res, next) => {
  try {
    const { unit,ownerName,coOwner,nitNumber,address,email,phone,
            moveInDate,moveOutDate,hoaAmount,hoaPaymentStatus,balance,status,
            portal,autoPay,parkingSpaces,tenants,relatives,
            guestParkingTags,garageFobs,garageFobLog,commonAreaFobs,commonAreaFobLog,commonAreaCodes,
            electronicVoting,electronicVotingConsentDate,electronicStatements } = req.body;
    const { rows } = await db.query(
      `UPDATE residents SET
         unit=$1,owner_name=$2,co_owner=$3,nit_number=$4,address=$5,email=$6,phone=$7,
         move_in_date=$8,move_out_date=$9,hoa_amount=$10,hoa_payment_status=$11,balance=$12,status=$13,
         portal_status=$14,auto_pay=$15,parking_spaces=$16,tenants=$17,relatives=$18,
         guest_parking_tags=$19,garage_fobs=$20,garage_fob_log=$21,common_area_fobs=$22,common_area_fob_log=$23,
         common_area_codes=$24,electronic_voting_consent=$25,electronic_voting_consent_date=$26,electronic_statements=$27
       WHERE id=$28 RETURNING *`,
      [unit,ownerName,coOwner||null,nitNumber||null,address||null,email||null,phone||null,
       moveInDate||null,moveOutDate||null,hoaAmount||150,hoaPaymentStatus||'current',balance||0,status||'good',
       portal||'none',autoPay||false,
       JSON.stringify(parkingSpaces||[]),JSON.stringify(tenants||[]),JSON.stringify(relatives||[]),
       JSON.stringify(guestParkingTags||[]),JSON.stringify(garageFobs||[]),JSON.stringify(garageFobLog||[]),
       JSON.stringify(commonAreaFobs||[]),JSON.stringify(commonAreaFobLog||[]),JSON.stringify(commonAreaCodes||[]),
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

// ─── Vendor Invoices ──────────────────────────────────────────────────────────
const invoiceRouter = express.Router();
invoiceRouter.use(requireAuth);

invoiceRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT vi.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ip.id,
                'date', ip.pay_date,
                'amount', ip.amount::float,
                'method', ip.method,
                'ref', ip.reference,
                'note', ip.note
              ) ORDER BY ip.created_at
            ) FILTER (WHERE ip.id IS NOT NULL),
            '[]'
          ) as payments
       FROM vendor_invoices vi
       LEFT JOIN invoice_payments ip ON ip.invoice_id = vi.id
       WHERE vi.community_id = $1
       GROUP BY vi.id
       ORDER BY vi.created_at DESC`,
      [req.query.community]
    );
    res.json(rows.map(r => ({
      id: `DB-${r.id}`,
      dbId: r.id,
      vendor: r.vendor_name,
      category: r.category,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.invoice_date,
      dueDate: r.due_date,
      amount: parseFloat(r.amount),
      description: r.description,
      status: r.status,
      payments: (r.payments || []).map(p => ({ ...p, amount: parseFloat(p.amount) })),
    })));
  } catch (err) { next(err); }
});

invoiceRouter.post('/', async (req, res, next) => {
  try {
    const { communityId, vendor, category, invoiceNumber, invoiceDate, dueDate, amount, description } = req.body;
    const { rows } = await db.query(
      `INSERT INTO vendor_invoices (community_id, vendor_name, category, invoice_number, invoice_date, due_date, amount, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'unpaid')
       ON CONFLICT (community_id, invoice_number) DO UPDATE SET
         vendor_name=EXCLUDED.vendor_name, category=EXCLUDED.category,
         invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date,
         amount=EXCLUDED.amount, description=EXCLUDED.description, updated_at=NOW()
       RETURNING *`,
      [communityId, vendor, category, invoiceNumber, invoiceDate, dueDate, amount, description]
    );
    res.status(201).json({ id: `DB-${rows[0].id}`, dbId: rows[0].id, vendor: rows[0].vendor_name, category: rows[0].category, invoiceNumber: rows[0].invoice_number, invoiceDate: rows[0].invoice_date, dueDate: rows[0].due_date, amount: parseFloat(rows[0].amount), description: rows[0].description, status: rows[0].status, payments: [] });
  } catch (err) { next(err); }
});

invoiceRouter.post('/:id/payments', async (req, res, next) => {
  try {
    const dbId = req.params.id;
    const { communityId, date, amount, method, ref, note } = req.body;
    const { rows } = await db.query(
      `INSERT INTO invoice_payments (invoice_id, community_id, pay_date, amount, method, reference, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [dbId, communityId, date, amount, method, ref || null, note || null]
    );
    const { rows: sumRows } = await db.query(
      'SELECT COALESCE(SUM(amount),0) as total, vi.amount as inv_amount FROM invoice_payments ip JOIN vendor_invoices vi ON vi.id=ip.invoice_id WHERE ip.invoice_id=$1 GROUP BY vi.amount',
      [dbId]
    );
    if (sumRows.length) {
      const paid = parseFloat(sumRows[0].total);
      const total = parseFloat(sumRows[0].inv_amount);
      const newStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
      await db.query('UPDATE vendor_invoices SET status=$1, updated_at=NOW() WHERE id=$2', [newStatus, dbId]);
    }
    const p = rows[0];
    res.status(201).json({ id: `PAY-DB-${p.id}`, date: p.pay_date, amount: parseFloat(p.amount), method: p.method, ref: p.reference, note: p.note });
  } catch (err) { next(err); }
});

module.exports = { communityRouter, duesRouter, complianceRouter, violationsRouter, maintenanceRouter, vendorRouter, residentRouter, documentRouter, commRouter, accountingRouter, taxRouter, invoiceRouter };
