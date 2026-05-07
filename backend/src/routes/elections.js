const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function buildElection(row, candidates, notices, receipts, auditLog) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    stage: row.stage,
    seatsAvailable: row.seats_available,
    votingMethod: row.voting_method,
    quorumRequired: row.quorum_required,
    quorumPct: row.quorum_pct,
    totalEligible: row.total_eligible,
    ballotsDistributed: row.ballots_distributed,
    ballotsReceived: row.ballots_received,
    description: row.description,
    ballotInstructions: row.ballot_instructions,
    dates: {
      nominationsOpen:    row.nom_open,
      nominationReminder: row.nom_reminder,
      nominationsClose:   row.nom_close,
      optInDeadline:      row.opt_in_deadline,
      preBallotNotice:    row.pre_ballot_notice,
      ballotDistribution: row.ballot_dist_date,
      votingDeadline:     row.voting_deadline,
      countingMeeting:    row.counting_meeting_date,
      retentionExpiry:    row.retention_expiry,
    },
    inspector: row.inspector_name ? {
      name:            row.inspector_name,
      firm:            row.inspector_firm,
      contact:         row.inspector_contact,
      assignedDate:    row.inspector_assigned_date,
      conflictChecked: row.inspector_conflict_checked,
      declaration:     '',
    } : null,
    acclamationDeclared: row.acclamation_declared,
    quorumMet:           row.quorum_met,
    results:             row.results,
    certifiedDate:       row.certified_date,
    retentionStatus:     row.retention_status,
    destroyDate:         row.destroy_date,
    candidates: (candidates || []).map(c => ({
      id:             c.id,
      name:           c.name,
      unit:           c.unit,
      email:          c.email,
      phone:          c.phone,
      bio:            c.bio || '',
      nominatedDate:  c.nominated_date,
      disqReasons:    c.disq_reasons || [],
      disqualified:   c.disqualified,
      eligible:       c.eligible,
      overrideReason: c.override_reason,
      statement:      c.statement || '',
      votes:          c.votes || 0,
      elected:        c.elected || false,
    })),
    notices: (notices || []).map(n => ({
      id:             `n${n.id}`,
      type:           n.type,
      sentDate:       n.sent_date,
      recipientCount: n.recipient_count,
      method:         n.method,
      status:         n.status,
    })),
    ballotReceiptLog: (receipts || []).map(r => ({
      id:       r.id,
      unit:     r.unit,
      received: r.received_date,
    })),
    countingMeeting:    { date: row.counting_meeting_date || '', time: '', location: '', observers: [] },
    inspectionRequests: [],
    adjournedMeeting:   null,
    auditLog: (auditLog || []).map(a => ({
      id:      `a${a.id}`,
      ts:      a.ts,
      action:  a.action,
      details: a.details,
      by:      a.by_user,
      variant: a.variant || 'gray',
    })),
  };
}

async function fetchElectionFull(id) {
  const [eRow, cands, notices, receipts, audit] = await Promise.all([
    db.query('SELECT * FROM elections WHERE id=$1', [id]),
    db.query('SELECT * FROM election_candidates WHERE election_id=$1 ORDER BY created_at', [id]),
    db.query('SELECT * FROM election_notices WHERE election_id=$1 ORDER BY created_at DESC', [id]),
    db.query('SELECT * FROM ballot_receipts WHERE election_id=$1 ORDER BY created_at', [id]),
    db.query('SELECT * FROM election_audit_log WHERE election_id=$1 ORDER BY created_at DESC', [id]),
  ]);
  if (!eRow.rows[0]) return null;
  return buildElection(eRow.rows[0], cands.rows, notices.rows, receipts.rows, audit.rows);
}

// GET /api/elections?community=:id
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM elections WHERE community_id=$1 ORDER BY created_at DESC',
      [req.query.community]
    );
    const result = await Promise.all(rows.map(e => fetchElectionFull(e.id)));
    res.json(result.filter(Boolean));
  } catch (err) { next(err); }
});

// POST /api/elections
router.post('/', async (req, res, next) => {
  try {
    const { communityId, title, type, seatsAvailable, votingMethod, quorumRequired, quorumPct, totalEligible, description } = req.body;
    const { rows } = await db.query(
      `INSERT INTO elections (community_id,title,type,seats_available,voting_method,quorum_required,quorum_pct,total_eligible,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [communityId, title, type || 'board_director', seatsAvailable || 3, votingMethod || 'hybrid',
       quorumRequired !== false, quorumPct || 25, totalEligible || 0, description || '']
    );
    const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    await db.query(
      'INSERT INTO election_audit_log (election_id,ts,action,details,by_user,variant) VALUES ($1,$2,$3,$4,$5,$6)',
      [rows[0].id, ts, 'Election Created',
       `${title} created. Type: ${type}. Method: ${votingMethod || 'hybrid'}. Seats: ${seatsAvailable || 3}.`,
       req.user?.name || req.user?.email || 'HOA Manager', 'gray']
    );
    const full = await fetchElectionFull(rows[0].id);
    res.status(201).json(full);
  } catch (err) { next(err); }
});

// PATCH /api/elections/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const id  = req.params.id;
    const body = req.body;

    const fieldMap = {
      title: 'title', type: 'type', stage: 'stage',
      seatsAvailable: 'seats_available', votingMethod: 'voting_method',
      quorumRequired: 'quorum_required', quorumPct: 'quorum_pct',
      totalEligible: 'total_eligible', ballotsDistributed: 'ballots_distributed',
      ballotsReceived: 'ballots_received', description: 'description',
      ballotInstructions: 'ballot_instructions',
      acclamationDeclared: 'acclamation_declared', quorumMet: 'quorum_met',
      certifiedDate: 'certified_date', retentionStatus: 'retention_status',
      destroyDate: 'destroy_date',
    };

    const sets = [];
    const vals = [];
    let idx   = 1;

    for (const [fk, dbk] of Object.entries(fieldMap)) {
      if (fk in body) {
        sets.push(`${dbk}=$${idx++}`);
        vals.push(body[fk]);
      }
    }
    if (body.results !== undefined) {
      sets.push(`results=$${idx++}`);
      vals.push(body.results ? JSON.stringify(body.results) : null);
    }
    if (body.dates) {
      const dm = {
        nominationsOpen: 'nom_open', nominationReminder: 'nom_reminder',
        nominationsClose: 'nom_close', optInDeadline: 'opt_in_deadline',
        preBallotNotice: 'pre_ballot_notice', ballotDistribution: 'ballot_dist_date',
        votingDeadline: 'voting_deadline', countingMeeting: 'counting_meeting_date',
        retentionExpiry: 'retention_expiry',
      };
      for (const [fk, dbk] of Object.entries(dm)) {
        if (fk in body.dates) { sets.push(`${dbk}=$${idx++}`); vals.push(body.dates[fk]); }
      }
    }
    if (body.inspector !== undefined) {
      if (body.inspector === null) {
        sets.push(`inspector_name=$${idx++}`,`inspector_firm=$${idx++}`,`inspector_contact=$${idx++}`,`inspector_assigned_date=$${idx++}`,`inspector_conflict_checked=$${idx++}`);
        vals.push(null, null, null, null, false);
      } else {
        const ins = body.inspector;
        if ('name'            in ins) { sets.push(`inspector_name=$${idx++}`);             vals.push(ins.name); }
        if ('firm'            in ins) { sets.push(`inspector_firm=$${idx++}`);             vals.push(ins.firm); }
        if ('contact'         in ins) { sets.push(`inspector_contact=$${idx++}`);          vals.push(ins.contact); }
        if ('assignedDate'    in ins) { sets.push(`inspector_assigned_date=$${idx++}`);    vals.push(ins.assignedDate); }
        if ('conflictChecked' in ins) { sets.push(`inspector_conflict_checked=$${idx++}`); vals.push(ins.conflictChecked); }
      }
    }
    if (!sets.length) return res.json({ message: 'Nothing to update' });

    sets.push(`updated_at=NOW()`);
    vals.push(id);
    await db.query(`UPDATE elections SET ${sets.join(',')} WHERE id=$${idx}`, vals);

    const full = await fetchElectionFull(id);
    res.json(full || { error: 'Election not found' });
  } catch (err) { next(err); }
});

// POST /api/elections/:id/candidates
router.post('/:id/candidates', async (req, res, next) => {
  try {
    const { name, unit, email, phone, bio, nominatedDate, disqReasons, disqualified, eligible, overrideReason, statement } = req.body;
    const { rows } = await db.query(
      `INSERT INTO election_candidates (election_id,name,unit,email,phone,bio,nominated_date,disq_reasons,disqualified,eligible,override_reason,statement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.params.id, name, unit, email, phone, bio || '', nominatedDate,
       disqReasons || [], disqualified || false, eligible !== false, overrideReason || null, statement || '']
    );
    const c = rows[0];
    res.status(201).json({
      id: c.id, name: c.name, unit: c.unit, email: c.email, phone: c.phone,
      bio: c.bio, nominatedDate: c.nominated_date, disqReasons: c.disq_reasons || [],
      disqualified: c.disqualified, eligible: c.eligible,
      overrideReason: c.override_reason, statement: c.statement || '',
      votes: c.votes || 0, elected: c.elected || false,
    });
  } catch (err) { next(err); }
});

// PATCH /api/elections/:electionId/candidates/:candidateId
router.patch('/:electionId/candidates/:candidateId', async (req, res, next) => {
  try {
    const { disqReasons, disqualified, eligible, votes, elected, statement } = req.body;
    const sets = []; const vals = []; let idx = 1;
    if (disqReasons  !== undefined) { sets.push(`disq_reasons=$${idx++}`);  vals.push(disqReasons); }
    if (disqualified !== undefined) { sets.push(`disqualified=$${idx++}`);  vals.push(disqualified); }
    if (eligible     !== undefined) { sets.push(`eligible=$${idx++}`);      vals.push(eligible); }
    if (votes        !== undefined) { sets.push(`votes=$${idx++}`);         vals.push(votes); }
    if (elected      !== undefined) { sets.push(`elected=$${idx++}`);       vals.push(elected); }
    if (statement    !== undefined) { sets.push(`statement=$${idx++}`);     vals.push(statement); }
    if (!sets.length) return res.json({ message: 'Nothing to update' });
    vals.push(req.params.candidateId, req.params.electionId);
    const { rows } = await db.query(
      `UPDATE election_candidates SET ${sets.join(',')} WHERE id=$${idx++} AND election_id=$${idx} RETURNING *`,
      vals
    );
    res.json(rows[0] || { error: 'Candidate not found' });
  } catch (err) { next(err); }
});

// POST /api/elections/:id/audit
router.post('/:id/audit', async (req, res, next) => {
  try {
    const { ts, action, details, by, variant } = req.body;
    await db.query(
      'INSERT INTO election_audit_log (election_id,ts,action,details,by_user,variant) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, ts, action, details, by, variant || 'gray']
    );
    res.status(201).json({ message: 'Logged' });
  } catch (err) { next(err); }
});

// POST /api/elections/:id/notices
router.post('/:id/notices', async (req, res, next) => {
  try {
    const { type, sentDate, recipientCount, method, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO election_notices (election_id,type,sent_date,recipient_count,method,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.params.id, type, sentDate, recipientCount || 0, method, status || 'sent']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/elections/:id/receipts
router.post('/:id/receipts', async (req, res, next) => {
  try {
    const { unit, receivedDate } = req.body;
    const { rows } = await db.query(
      'INSERT INTO ballot_receipts (election_id,unit,received_date) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, unit, receivedDate]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
