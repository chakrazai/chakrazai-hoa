import { useState, useMemo, useCallback } from 'react';
import {
  Plus, X, Check, Edit2, Trash2, ChevronRight, Search,
  Shield, Lock, Unlock, Clock, FileText, CheckCircle,
  AlertTriangle, Award, Printer, Info, Bell, Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  Card, Badge, Button, SectionHeader, Tabs,
  Table, Th, Td, Tr, MetricCard,
} from '../components/ui';

// ─── RBAC ─────────────────────────────────────────────────────────────────────

const ROLES = {
  admin:     { label: 'Admin',        color: 'bg-rose-700' },
  board:     { label: 'Board Member', color: 'bg-navy-700' },
  secretary: { label: 'Secretary',    color: 'bg-violet-700' },
  resident:  { label: 'Resident',     color: 'bg-slate-500' },
};

const PERMISSIONS = {
  createBallot:    ['admin', 'secretary'],
  editBallot:      ['admin', 'secretary'],
  addCandidate:    ['admin', 'secretary'],
  openVoting:      ['admin', 'board', 'secretary'],
  closeVoting:     ['admin', 'board', 'secretary'],
  enterResults:    ['admin', 'secretary'],
  certify:         ['admin', 'board'],
  manageRetention: ['admin', 'secretary'],
  viewAuditLog:    ['admin', 'secretary'],
};

function can(role, action) {
  return (PERMISSIONS[action] || []).includes(role);
}

// ─── Retention ────────────────────────────────────────────────────────────────

const RETENTION_YEARS = { Board: 7, Bylaw: 7, Special: 5, Committee: 3 };
const RETENTION_BASIS = {
  Board:     'State HOA Act §5200 — ballot & voting records, 7 years',
  Bylaw:     'State HOA Act §5200 — governing document records, 7 years',
  Special:   "Robert's Rules of Order — special vote records, 5 years",
  Committee: 'HOA Bylaws Article 9 — committee records, 3 years',
};

function addYears(dateStr, years) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    d.setFullYear(d.getFullYear() + years);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function daysUntil(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return Math.ceil((d - new Date()) / 86400000);
  } catch { return null; }
}

// ─── Audit helpers ────────────────────────────────────────────────────────────

function makeEntry(action, details, by = 'System', variant = 'gray') {
  return {
    id: `${Date.now()}-${Math.random()}`,
    ts: new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }),
    action, details, by, variant,
  };
}

// ─── Shared style constants ───────────────────────────────────────────────────

const iCls = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const fLabel = 'block text-xs font-medium text-slate-500 mb-1';

function SL({ children }) {
  return (
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2">
      {children}
    </p>
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED = [
  {
    id: 1,
    title: 'Board of Directors Election 2024',
    type: 'Board', status: 'certified', votingStatus: 'closed',
    startDate: 'Nov 1, 2023', endDate: 'Nov 30, 2023',
    certifiedDate: 'Dec 3, 2023', certifiedBy: ['Jane Ramirez', 'Tom Nakamura'],
    totalEligible: 148, votesCast: 112, seatsAvailable: 3,
    votingMethod: 'Mail-in & Online',
    ballotInstructions: 'Vote for up to 3 candidates. Mark the oval completely. Ballots with more than 3 selections will be voided. Return by Nov 30, 2023.',
    description: 'Annual election for 3 open board seats. Candidates submitted bios in October.',
    retentionYears: 7, retentionBasis: RETENTION_BASIS.Board,
    destroyDate: 'Nov 30, 2030', retentionStatus: 'active', retentionNotes: '',
    candidates: [
      { id:1, name:'Jane Ramirez',  bio:'Incumbent president seeking second term.',    eligible:true, votes:98, elected:true  },
      { id:2, name:'Tom Nakamura',  bio:'VP focused on maintenance and vendors.',       eligible:true, votes:87, elected:true  },
      { id:3, name:'Maria Garcia',  bio:'CPA, 15 years HOA finance experience.',       eligible:true, votes:91, elected:true  },
      { id:4, name:'Robert Nguyen', bio:'Local contractor, first-time candidate.',     eligible:true, votes:44, elected:false },
      { id:5, name:'Linda Park',    bio:'Resident since 2010, community events focus.',eligible:true, votes:38, elected:false },
    ],
    auditLog: [
      { id:'a6', ts:'Dec 3, 2023 10:14 AM',  action:'Results Certified',   details:'Ramirez (98), Garcia (91), Nakamura (87) elected. 2 board members approved.', by:'Jane Ramirez', variant:'green' },
      { id:'a5', ts:'Dec 1, 2023 9:00 AM',   action:'Results Entered',     details:'Vote tallies entered for all 5 candidates. Total ballots: 112.',               by:'Sarah Chen',   variant:'blue'  },
      { id:'a4', ts:'Nov 30, 2023 11:59 PM', action:'Voting Closed',       details:'112 of 148 eligible residents voted (75.7% turnout).',                        by:'System',       variant:'gray'  },
      { id:'a3', ts:'Nov 1, 2023 8:00 AM',   action:'Voting Opened',       details:'Online portal and mail-in ballots activated.',                                by:'System',       variant:'blue'  },
      { id:'a2', ts:'Oct 15, 2023 2:30 PM',  action:'Candidates Locked',   details:'5 candidates approved and ballot finalized.',                                  by:'Sarah Chen',   variant:'amber' },
      { id:'a1', ts:'Sep 30, 2023 11:00 AM', action:'Ballot Created',      details:'Election created. 3 seats. Method: Mail-in & Online.',                        by:'Sarah Chen',   variant:'gray'  },
    ],
  },
  {
    id: 2,
    title: 'Bylaw Amendment Vote 2024',
    type: 'Bylaw', status: 'certified', votingStatus: 'closed',
    startDate: 'Mar 1, 2024', endDate: 'Mar 15, 2024',
    certifiedDate: 'Mar 17, 2024', certifiedBy: ['Jane Ramirez', 'Maria Garcia'],
    totalEligible: 148, votesCast: 89, seatsAvailable: 1,
    votingMethod: 'Mail-in',
    ballotInstructions: 'Vote YES or NO on the proposed amendment. A two-thirds supermajority of votes cast is required for passage. Return ballot by Mar 15, 2024.',
    description: 'Amendment to Section 4.2 — Rental Restrictions. Max rental period: 30 → 90 days.',
    retentionYears: 7, retentionBasis: RETENTION_BASIS.Bylaw,
    destroyDate: 'Mar 15, 2031', retentionStatus: 'active', retentionNotes: '',
    candidates: [
      { id:1, name:'Yes — Approve Amendment', bio:'', eligible:true, votes:61, elected:true  },
      { id:2, name:'No — Reject Amendment',   bio:'', eligible:true, votes:28, elected:false },
    ],
    auditLog: [
      { id:'b4', ts:'Mar 17, 2024 3:00 PM',  action:'Results Certified', details:'Amendment passed 61-28 (68.5% yes, exceeded ⅔ threshold).', by:'Jane Ramirez', variant:'green' },
      { id:'b3', ts:'Mar 16, 2024 9:00 AM',  action:'Results Entered',   details:'Final tally: Yes 61, No 28. 89 ballots counted.',           by:'Sarah Chen',   variant:'blue'  },
      { id:'b2', ts:'Mar 15, 2024 11:59 PM', action:'Voting Closed',     details:'89 of 148 ballots returned (60.1% turnout).',               by:'System',       variant:'gray'  },
      { id:'b1', ts:'Mar 1, 2024 8:00 AM',   action:'Voting Opened',     details:'Mail-in ballots dispatched to all 148 units.',              by:'System',       variant:'blue'  },
    ],
  },
  {
    id: 3,
    title: 'Board of Directors Election 2026',
    type: 'Board', status: 'draft', votingStatus: 'pending',
    startDate: 'Nov 1, 2026', endDate: 'Nov 30, 2026',
    certifiedDate: null, certifiedBy: [],
    totalEligible: 148, votesCast: 0, seatsAvailable: 3,
    votingMethod: 'Mail-in & Online',
    ballotInstructions: 'Vote for up to 3 candidates. Mark the oval completely next to your choice(s). Ballots with more than 3 selections will be voided.',
    description: 'Upcoming election for 3 board seats. Nominations open Sep 1 – Oct 15.',
    retentionYears: 7, retentionBasis: RETENTION_BASIS.Board,
    destroyDate: 'Nov 30, 2033', retentionStatus: 'active', retentionNotes: '',
    candidates: [],
    auditLog: [
      { id:'c1', ts:'May 1, 2026 10:00 AM', action:'Ballot Created', details:'2026 board election created. Nominations open Sep 1.', by:'Sarah Chen', variant:'gray' },
    ],
  },
];

// ─── Small shared components ──────────────────────────────────────────────────

function RolePill({ role }) {
  const r = ROLES[role] || { label: role, color: 'bg-slate-500' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white', r.color)}>
      <Shield size={8}/>{r.label}
    </span>
  );
}

// Shows children only if role has permission; otherwise renders a faded,
// non-interactive wrapper with a tooltip explaining why.
function PermGate({ role, action, tip, children }) {
  if (can(role, action)) return children;
  const needs = (PERMISSIONS[action] || []).map(r => ROLES[r]?.label || r).join(' or ');
  return (
    <div className="relative group inline-flex">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
        <Lock size={7} className="inline mr-1"/>{tip || `Requires ${needs}`}
      </div>
    </div>
  );
}

function AuditRow({ entry }) {
  const colors = {
    green: 'bg-emerald-100 text-emerald-700',
    blue:  'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-rose-100 text-rose-700',
    gray:  'bg-slate-100 text-slate-600',
  };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', colors[entry.variant] || colors.gray)}>
            {entry.action}
          </span>
          <span className="text-[11px] text-slate-400">{entry.ts}</span>
          <span className="text-[11px] text-slate-500">by {entry.by}</span>
        </div>
        <p className="text-xs text-slate-600">{entry.details}</p>
      </div>
    </div>
  );
}

// ─── Detail tabs ──────────────────────────────────────────────────────────────

function OverviewTab({ ballot }) {
  const retDays = daysUntil(ballot.destroyDate);
  const retAlert = retDays !== null && retDays < 180;

  return (
    <div>
      <SL>Election Details</SL>
      <div className="grid grid-cols-2 gap-2 mb-1">
        {[
          ['Type',            ballot.type],
          ['Voting Method',   ballot.votingMethod || '—'],
          ['Seats / Choices', ballot.seatsAvailable],
          ['Candidates',      ballot.candidates.length],
          ['Start Date',      ballot.startDate],
          ['End Date',        ballot.endDate],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{l}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <SL>Turnout</SL>
      <div className="grid grid-cols-3 gap-2 mb-1">
        {[
          ['Eligible', ballot.totalEligible],
          ['Cast',     ballot.votesCast],
          ['Turnout',  ballot.totalEligible ? `${Math.round(ballot.votesCast / ballot.totalEligible * 100)}%` : '—'],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{v}</p>
            <p className="text-[10px] text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      {ballot.certifiedDate && (
        <>
          <SL>Certification</SL>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={13} className="text-emerald-600"/>
              <span className="text-xs font-bold text-emerald-800">Certified {ballot.certifiedDate}</span>
            </div>
            <p className="text-[11px] text-emerald-700">Approved by: {ballot.certifiedBy.join(', ')}</p>
          </div>
        </>
      )}

      {ballot.status === 'certified' && ballot.candidates.length > 0 && (
        <>
          <SL>Final Results</SL>
          <div className="space-y-1.5">
            {[...ballot.candidates].sort((a, b) => b.votes - a.votes).map((c, i) => {
              const tot = ballot.candidates.reduce((s, x) => s + x.votes, 0);
              const pct = tot > 0 ? Math.round(c.votes / tot * 100) : 0;
              return (
                <div key={c.id} className={clsx('flex items-center gap-3 p-2.5 rounded-xl', c.elected ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50')}>
                  <span className="text-xs font-bold text-slate-400 w-4 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                      {c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-1">
                        <div className={clsx('h-1 rounded-full', c.elected ? 'bg-emerald-500' : 'bg-navy-500')} style={{ width: `${pct}%` }}/>
                      </div>
                      <span className="text-[11px] text-slate-500 flex-shrink-0 w-20 text-right">{c.votes} ({pct}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <SL>Retention Summary</SL>
      <div className={clsx('p-3 rounded-xl border', retAlert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Destroy by: <span className={retAlert ? 'text-amber-700 font-bold' : ''}>{ballot.destroyDate}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{ballot.retentionYears}-year retention · {ballot.retentionBasis}</p>
          </div>
          {retAlert && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0"/>}
        </div>
        {retDays !== null && (
          <p className={clsx('text-[11px] font-medium mt-1.5', retAlert ? 'text-amber-700' : 'text-slate-500')}>
            {retDays > 0 ? `${retDays} days remaining` : 'Past retention date — review required'}
          </p>
        )}
      </div>
    </div>
  );
}

function BallotPreviewTab({ ballot, role, onUpdate }) {
  const [editingInstr, setEditingInstr] = useState(false);
  const [instrDraft, setInstrDraft] = useState(ballot.ballotInstructions || '');

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=700,height=900');
    const cands = ballot.candidates
      .filter(c => c.eligible)
      .map(c => `
        <div class="cand">
          <div class="bubble"></div>
          <div>
            <div class="cname">${c.name}</div>
            ${c.bio ? `<div class="cbio">${c.bio}</div>` : ''}
          </div>
        </div>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>${ballot.title} — Official Ballot</title>
      <style>
        body{font-family:Georgia,serif;max-width:580px;margin:40px auto;padding:20px;color:#1e293b}
        .hdr{background:#1e293b;color:#fff;padding:20px 24px;text-align:center;border-radius:4px 4px 0 0}
        .hdr .sup{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8}
        .hdr h1{font-size:13px;margin:3px 0;color:#e2e8f0}
        .hdr h2{font-size:16px;font-weight:900;margin:3px 0}
        .hdr .dt{font-size:10px;color:#94a3b8;margin-top:4px}
        .inst{background:#fffbeb;border-bottom:2px solid #f59e0b;padding:12px 24px}
        .inst .lbl{font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#92400e}
        .inst p{font-size:11px;color:#78350f;margin:4px 0 0;line-height:1.5}
        .body{padding:20px 24px;border:2px solid #1e293b;border-top:none}
        .slbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}
        .cand{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px dotted #cbd5e1}
        .cand:last-child{border-bottom:none}
        .bubble{width:20px;height:20px;border-radius:50%;border:2px solid #1e293b;flex-shrink:0;margin-top:2px;background:#fff}
        .cname{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
        .cbio{font-size:10px;color:#64748b;font-style:italic;margin-top:3px}
        .writein .bubble{border-color:#94a3b8}
        .writein span{font-size:11px;color:#94a3b8;font-style:italic}
        .ftr{background:#f8fafc;border:2px solid #1e293b;border-top:none;border-radius:0 0 4px 4px;padding:12px 24px}
        .dash{border-top:2px dashed #94a3b8;padding-top:10px;text-align:center}
        .dash .off{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8}
        .fields{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:8px}
        .sig{font-size:10px;color:#94a3b8;margin-top:6px;text-align:center}
        @media print{body{margin:0}}
      </style></head><body>
      <div class="hdr">
        <div class="sup">Official Ballot — Confidential</div>
        <h1>Oakwood Estates Homeowners Association</h1>
        <h2>${ballot.title}</h2>
        <div class="dt">Voting Period: ${ballot.startDate} – ${ballot.endDate}</div>
      </div>
      <div class="inst">
        <div class="lbl">Voting Instructions</div>
        <p>${ballot.ballotInstructions || `Vote for up to ${ballot.seatsAvailable} candidate(s).`}</p>
      </div>
      <div class="body">
        <div class="slbl">${ballot.type === 'Board' ? `Board of Directors — Vote for up to ${ballot.seatsAvailable}` : ballot.type === 'Bylaw' ? 'Ballot Measure — Vote Yes or No' : ballot.type}</div>
        ${cands}
        <div class="cand writein">
          <div class="bubble"></div>
          <span>Write-in candidate: _________________________________</span>
        </div>
      </div>
      <div class="ftr">
        <div class="dash">
          <div class="off">— Do not mark below this line — Official use only —</div>
          <div class="fields">
            <span>Ballot #: ___________</span>
            <span>Unit #: ___________</span>
            <span>Received: ___________</span>
          </div>
          <div class="sig">Voter Signature: _________________________________________________ Date: ___________</div>
        </div>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const saveInstr = () => {
    onUpdate({ ballotInstructions: instrDraft });
    setEditingInstr(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SL>Official Ballot Preview</SL>
        <div className="flex items-center gap-2 mb-[-4px]">
          <PermGate role={role} action="editBallot">
            {ballot.status === 'draft' && (
              <button onClick={() => { setInstrDraft(ballot.ballotInstructions || ''); setEditingInstr(v => !v); }}
                className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
                <Edit2 size={11}/>{editingInstr ? 'Cancel' : 'Edit Instructions'}
              </button>
            )}
          </PermGate>
          <button onClick={handlePrint}
            className="text-xs text-slate-700 font-medium flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <Printer size={11}/>Print
          </button>
        </div>
      </div>

      {editingInstr && (
        <div className="mb-3 p-3 bg-slate-50 rounded-xl space-y-2">
          <label className={fLabel}>Voting Instructions (printed on ballot)</label>
          <textarea value={instrDraft} onChange={e => setInstrDraft(e.target.value)} rows={3} className={iCls}/>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={saveInstr}><Check size={11}/>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingInstr(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Ballot preview card */}
      <div className="border-2 border-slate-700 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-800 text-white px-5 py-3.5 text-center">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-400">Official Ballot — Confidential</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Oakwood Estates Homeowners Association</p>
          <p className="text-sm font-black mt-0.5">{ballot.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{ballot.startDate} – {ballot.endDate}</p>
        </div>

        <div className="px-5 py-2.5 bg-amber-50 border-b-2 border-amber-300">
          <p className="text-[9px] font-black text-amber-900 uppercase tracking-[0.2em]">Voting Instructions</p>
          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
            {ballot.ballotInstructions || `Vote for up to ${ballot.seatsAvailable} candidate(s).`}
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-3">
            {ballot.type === 'Board'
              ? `Board of Directors — Vote for up to ${ballot.seatsAvailable} Candidate${ballot.seatsAvailable > 1 ? 's' : ''}`
              : ballot.type === 'Bylaw' ? 'Ballot Measure — Vote Yes or No' : ballot.type}
          </p>
          {ballot.candidates.filter(c => c.eligible).length === 0
            ? <p className="text-xs text-slate-400 italic text-center py-4">No eligible candidates added yet</p>
            : (
              <div className="space-y-3">
                {ballot.candidates.filter(c => c.eligible).map(c => (
                  <div key={c.id} className="flex items-start gap-3.5">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex-shrink-0 mt-0.5 bg-white"/>
                    <div className="flex-1 border-b border-dotted border-slate-200 pb-2.5">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{c.name}</p>
                      {c.bio && <p className="text-[11px] text-slate-500 italic mt-0.5">{c.bio}</p>}
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-400 flex-shrink-0 mt-0.5 bg-white"/>
                  <p className="text-[11px] text-slate-400 italic pb-2.5 border-b border-dotted border-slate-200 flex-1">
                    Write-in candidate: _________________________________
                  </p>
                </div>
              </div>
            )
          }
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t-2 border-slate-200">
          <div className="border-t-2 border-dashed border-slate-300 pt-2.5 text-center">
            <p className="text-[8px] text-slate-400 uppercase tracking-[0.2em]">— Do not mark below this line — Official use only —</p>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>Ballot #: __________</span>
              <span>Unit #: __________</span>
              <span>Received: __________</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Voter Signature: _________________________________ Date: __________
            </p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 text-center">
        Voting method: <span className="font-medium">{ballot.votingMethod || 'Not specified'}</span>
        {ballot.candidates.some(c => !c.eligible) && (
          <span className="text-amber-600"> · {ballot.candidates.filter(c => !c.eligible).length} ineligible candidate(s) hidden</span>
        )}
      </p>
    </div>
  );
}

function CandidatesTab({ ballot, role, onUpdate, addAudit }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', bio: '', eligible: true });

  const add = () => {
    if (!draft.name.trim()) return;
    const c = { ...draft, id: Date.now(), votes: 0, elected: false };
    onUpdate({ candidates: [...ballot.candidates, c] });
    addAudit('Candidate Added', `"${draft.name}" added to ballot${!draft.eligible ? ' (marked ineligible)' : ''}.`, 'blue');
    setDraft({ name: '', bio: '', eligible: true });
    setShowForm(false);
  };

  const remove = id => {
    const c = ballot.candidates.find(x => x.id === id);
    onUpdate({ candidates: ballot.candidates.filter(x => x.id !== id) });
    addAudit('Candidate Removed', `"${c?.name}" removed from ballot.`, 'amber');
  };

  const toggleEligible = id => {
    const c = ballot.candidates.find(x => x.id === id);
    onUpdate({ candidates: ballot.candidates.map(x => x.id === id ? { ...x, eligible: !x.eligible } : x) });
    addAudit('Eligibility Updated', `"${c?.name}" marked ${c?.eligible ? 'ineligible' : 'eligible'}.`, 'amber');
  };

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SL>Candidates / Ballot Options ({ballot.candidates.length})</SL>
        <PermGate role={role} action="addCandidate">
          {ballot.status === 'draft' && (
            <button onClick={() => setShowForm(v => !v)}
              className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mb-[-4px]">
              <Plus size={11}/>Add
            </button>
          )}
        </PermGate>
      </div>

      {showForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div>
            <label className={fLabel}>Name *</label>
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              className={iCls} placeholder="Full name or ballot option"/>
          </div>
          <div>
            <label className={fLabel}>Bio / Statement</label>
            <textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
              rows={2} className={iCls} placeholder="Candidate statement (optional)"/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.eligible} onChange={e => setDraft(d => ({ ...d, eligible: e.target.checked }))}
              className="rounded border-slate-300"/>
            <span className="text-xs text-slate-600">Eligibility verified</span>
          </label>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={add}><Check size={11}/>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {ballot.candidates.length === 0 && !showForm
        ? <p className="text-sm text-slate-400 italic text-center py-8">No candidates added yet</p>
        : (
          <div className="space-y-2">
            {ballot.candidates.map((c, i) => (
              <div key={c.id}
                className={clsx('p-3 border rounded-xl transition-colors',
                  c.elected ? 'border-emerald-200 bg-emerald-50'
                    : !c.eligible ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-100')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                        {c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                        {!c.eligible && <Badge variant="amber"><AlertTriangle size={9}/>Ineligible</Badge>}
                        {c.eligible && !c.elected && ballot.status === 'draft' && <Badge variant="blue">Eligible</Badge>}
                      </div>
                      {c.bio && <p className="text-xs text-slate-500">{c.bio}</p>}
                      {ballot.status === 'certified' && (
                        <p className="text-xs font-bold text-slate-700 mt-1">{c.votes} votes</p>
                      )}
                    </div>
                  </div>
                  {ballot.status === 'draft' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleEligible(c.id)}
                        className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors',
                          c.eligible ? 'text-amber-600 hover:bg-amber-100' : 'text-emerald-600 hover:bg-emerald-100')}>
                        {c.eligible ? 'Mark Ineligible' : 'Mark Eligible'}
                      </button>
                      <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {ballot.candidates.some(c => !c.eligible) && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle size={11}/>Ineligible candidates are hidden on the printed ballot.
        </p>
      )}
    </div>
  );
}

function VotingTab({ ballot, role, onUpdate, addAudit }) {
  const eligible = ballot.candidates.filter(c => c.eligible);
  const ready = eligible.length > 0 && ballot.ballotInstructions?.trim();
  const pct = ballot.totalEligible ? Math.round(ballot.votesCast / ballot.totalEligible * 100) : 0;

  const openVoting = () => {
    onUpdate({ votingStatus: 'open', status: 'active' });
    addAudit('Voting Opened', `Voting period activated. ${ballot.totalEligible} eligible voters. Method: ${ballot.votingMethod}.`, 'blue');
  };

  const closeVoting = () => {
    onUpdate({ votingStatus: 'closed' });
    addAudit('Voting Closed', `Voting period ended. ${ballot.votesCast} ballots received (${pct}% turnout). Results entry now unlocked.`, 'gray');
  };

  const updateCast = val => onUpdate({ votesCast: Math.max(0, Math.min(ballot.totalEligible, Number(val) || 0)) });

  return (
    <div>
      <SL>Voting Period</SL>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className={fLabel}>Scheduled Start</p>
          <p className="text-sm font-semibold text-slate-800">{ballot.startDate}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className={fLabel}>Scheduled End</p>
          <p className="text-sm font-semibold text-slate-800">{ballot.endDate}</p>
        </div>
      </div>

      <div className="p-4 border-2 rounded-xl mb-4 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Current Status</p>
            <p className="text-xs text-slate-400 mt-0.5">{ballot.votingMethod}</p>
          </div>
          <Badge variant={ballot.votingStatus === 'open' ? 'green' : ballot.votingStatus === 'closed' ? 'gray' : 'blue'}>
            {ballot.votingStatus === 'open' ? <Unlock size={10}/> : <Lock size={10}/>}
            {ballot.votingStatus === 'open' ? 'Voting Open' : ballot.votingStatus === 'closed' ? 'Closed' : 'Pending'}
          </Badge>
        </div>

        {ballot.votingStatus !== 'pending' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Ballots received</span>
              <span>{ballot.votesCast} / {ballot.totalEligible} ({pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-navy-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }}/>
            </div>
            {ballot.votingStatus === 'open' && (
              <div className="mt-2">
                <label className={fLabel}>Update Ballots Received</label>
                <input type="number" value={ballot.votesCast} onChange={e => updateCast(e.target.value)}
                  className={iCls} min="0" max={ballot.totalEligible}/>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <PermGate role={role} action="openVoting">
            <Button variant="primary" size="sm" onClick={openVoting}
              disabled={ballot.votingStatus !== 'pending' || !ready}>
              <Unlock size={11}/>Open Voting
            </Button>
          </PermGate>
          <PermGate role={role} action="closeVoting">
            <Button variant="secondary" size="sm" onClick={closeVoting}
              disabled={ballot.votingStatus !== 'open'}>
              <Lock size={11}/>Close Voting
            </Button>
          </PermGate>
        </div>

        {!ready && ballot.votingStatus === 'pending' && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle size={11}/>Add eligible candidates and ballot instructions before opening.
          </p>
        )}
      </div>

      <SL>Ballot Tracker</SL>
      {ballot.votingStatus === 'pending'
        ? <p className="text-sm text-slate-400 italic">Tracking begins once voting is opened.</p>
        : (
          <div className="space-y-2">
            {[
              { label: 'Ballots Distributed', value: ballot.totalEligible, icon: FileText },
              { label: 'Returned',            value: ballot.votesCast,     icon: CheckCircle },
              { label: 'Outstanding',          value: ballot.totalEligible - ballot.votesCast, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
                  <Icon size={14} className="text-slate-500"/>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800">{label}</p>
                </div>
                <span className="text-base font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function ResultsTab({ ballot, role, onUpdate, addAudit }) {
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(ballot.candidates.map(c => [c.id, c.votes || 0]))
  );
  const [totalCast, setTotalCast] = useState(ballot.votesCast || 0);
  const [saved, setSaved] = useState(false);
  const [certStep, setCertStep] = useState(0);
  const [approvals, setApprovals] = useState(ballot.certifiedBy || []);
  const [approverName, setApproverName] = useState('');

  const seats = ballot.seatsAvailable || 1;
  const totalEntered = Object.values(votes).reduce((s, v) => s + Number(v || 0), 0);
  const canEnter = can(role, 'enterResults') && ballot.votingStatus === 'closed' && ballot.status !== 'certified';
  const sorted = [...ballot.candidates].sort((a, b) => Number(votes[b.id] || 0) - Number(votes[a.id] || 0));

  const saveDraft = () => {
    const updated = ballot.candidates.map(c => ({ ...c, votes: Number(votes[c.id] || 0) }));
    onUpdate({ candidates: updated, votesCast: Number(totalCast) });
    addAudit('Results Saved (Draft)', `Draft tallies saved. Total votes entered: ${totalEntered}. Ballots cast: ${totalCast}.`, 'blue');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addApproval = () => {
    if (!approverName.trim() || approvals.includes(approverName.trim())) return;
    const next = [...approvals, approverName.trim()];
    setApprovals(next);
    setApproverName('');
  };

  const certify = () => {
    const electedIds = new Set(sorted.slice(0, seats).map(c => c.id));
    const updated = ballot.candidates.map(c => ({
      ...c, votes: Number(votes[c.id] || 0), elected: electedIds.has(c.id),
    }));
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    onUpdate({
      candidates: updated, votesCast: Number(totalCast),
      status: 'certified', votingStatus: 'closed',
      certifiedDate: now, certifiedBy: approvals,
    });
    addAudit(
      'Results Certified',
      `Certified by ${approvals.join(' & ')}. Top ${seats} elected: ${sorted.slice(0, seats).map(c => c.name).join(', ')}.`,
      'green'
    );
    setCertStep(0);
  };

  if (ballot.status === 'certified') {
    const tot = ballot.candidates.reduce((s, c) => s + c.votes, 0);
    return (
      <div>
        <div className="flex items-center justify-between mt-1">
          <SL>Final Results</SL>
          <Badge variant="green"><CheckCircle size={10}/>Certified {ballot.certifiedDate}</Badge>
        </div>
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
          Certified by: <strong>{ballot.certifiedBy?.join(', ') || '—'}</strong>
        </div>
        <div className="space-y-2">
          {[...ballot.candidates].sort((a, b) => b.votes - a.votes).map((c, rank) => {
            const pct = tot > 0 ? Math.round(c.votes / tot * 100) : 0;
            return (
              <div key={c.id} className={clsx('p-3 border rounded-xl', c.elected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100')}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400">#{rank + 1}</span>
                    <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                    {c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {c.votes} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={clsx('h-1.5 rounded-full', c.elected ? 'bg-emerald-500' : 'bg-navy-500')}
                    style={{ width: `${pct}%` }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SL>Enter Vote Tallies</SL>
        {ballot.votingStatus !== 'closed' && <Badge variant="amber">Voting still open</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-3 bg-slate-50 rounded-xl">
          <label className={fLabel}>Total Ballots Cast</label>
          <input type="number" value={totalCast} onChange={e => setTotalCast(e.target.value)}
            className={iCls + ' mt-1'} disabled={!canEnter} min="0"/>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className={fLabel}>Turnout</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {ballot.totalEligible ? `${Math.round(Number(totalCast) / ballot.totalEligible * 100)}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-400">{totalCast} of {ballot.totalEligible}</p>
        </div>
      </div>

      {ballot.candidates.length === 0
        ? <p className="text-sm text-slate-400 italic mb-4">Add candidates before entering results.</p>
        : (
          <div className="space-y-2 mb-4">
            {sorted.map((c, rank) => {
              const v = Number(votes[c.id] || 0);
              const pct = totalEntered > 0 ? Math.round(v / totalEntered * 100) : 0;
              return (
                <div key={c.id} className="p-3 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">#{rank + 1}</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                      {totalEntered > 0 && rank < seats && <Badge variant="blue">On track</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      <input type="number" value={votes[c.id] ?? ''} min="0"
                        onChange={e => setVotes(p => ({ ...p, [c.id]: e.target.value }))}
                        disabled={!canEnter}
                        className="w-20 px-2 py-1 text-sm text-center bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="0"/>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-navy-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      <div className="flex gap-2 mb-4 flex-wrap">
        <PermGate role={role} action="enterResults">
          <Button variant="secondary" onClick={saveDraft}
            disabled={ballot.candidates.length === 0 || ballot.votingStatus !== 'closed'}>
            {saved ? <><Check size={12}/>Saved!</> : 'Save Draft'}
          </Button>
        </PermGate>
        <PermGate role={role} action="certify">
          <Button variant="primary" onClick={() => setCertStep(1)}
            disabled={ballot.candidates.length === 0 || ballot.votingStatus !== 'closed'}>
            <Award size={12}/>Certify Results
          </Button>
        </PermGate>
      </div>

      {/* Two-step certification workflow */}
      {certStep === 1 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-600"/>
            <p className="text-sm font-bold text-amber-900">Certification requires 2 board member approvals</p>
          </div>
          <p className="text-xs text-amber-700">
            Enter the names of two board members who have reviewed and approved the results.
            Top {seats} vote-getter{seats > 1 ? 's' : ''} will be marked elected.
          </p>
          {approvals.map(a => (
            <div key={a} className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle size={11}/>{a}
            </div>
          ))}
          {approvals.length < 2 && (
            <div className="flex gap-2">
              <input value={approverName} onChange={e => setApproverName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addApproval()}
                placeholder="Board member name" className={iCls + ' text-xs py-1.5'}/>
              <Button variant="primary" size="sm" onClick={addApproval}>Add</Button>
            </div>
          )}
          <p className="text-[11px] text-amber-600">
            {approvals.length < 2
              ? `${2 - approvals.length} more approval${2 - approvals.length > 1 ? 's' : ''} needed`
              : 'Both approvals collected — ready to certify.'}
          </p>
          {approvals.length >= 2 && (
            <div className="flex gap-2 pt-1">
              <Button variant="primary" onClick={certify}><Award size={12}/>Confirm & Certify</Button>
              <Button variant="ghost" size="sm" onClick={() => { setCertStep(0); setApprovals([]); }}>Cancel</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RetentionTab({ ballot, role, onUpdate, addAudit }) {
  const [editing, setEditing] = useState(false);
  const [destroyDraft, setDestroyDraft] = useState(ballot.destroyDate || '');
  const [statusDraft, setStatusDraft] = useState(ballot.retentionStatus || 'active');
  const [notesDraft, setNotesDraft] = useState(ballot.retentionNotes || '');

  const retDays = daysUntil(ballot.destroyDate);
  const retAlert = retDays !== null && retDays < 180;

  const save = () => {
    onUpdate({ destroyDate: destroyDraft, retentionStatus: statusDraft, retentionNotes: notesDraft });
    addAudit('Retention Updated', `Destroy date: ${destroyDraft}. Status: ${statusLabels[statusDraft] || statusDraft}.`, 'amber');
    setEditing(false);
  };

  const statusColors = {
    active:                   'green',
    pending_review:           'amber',
    approved_for_destruction: 'red',
    destroyed:                'gray',
  };
  const statusLabels = {
    active:                   'Active (In Retention)',
    pending_review:           'Pending Destruction Review',
    approved_for_destruction: 'Approved for Destruction',
    destroyed:                'Destroyed',
  };

  const checklist = [
    { l: 'Original ballots / digital ballot records',         done: ballot.votesCast > 0 },
    { l: 'Candidate eligibility verifications on file',       done: ballot.candidates.every(c => c.eligible) && ballot.candidates.length > 0 },
    { l: 'Voter eligibility list (all eligible units)',        done: ballot.totalEligible > 0 },
    { l: 'Vote tally sheet / results record',                 done: ballot.status === 'certified' },
    { l: 'Certification signatures (2 board members)',        done: (ballot.certifiedBy || []).length >= 2 },
    { l: 'Board meeting minutes referencing results',         done: false },
  ];

  return (
    <div>
      <SL>Retention Schedule</SL>

      <div className={clsx('p-4 rounded-xl border-2 mb-4', retAlert ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-bold text-slate-700">Scheduled Destruction Date</p>
            <p className={clsx('text-lg font-black mt-0.5', retAlert ? 'text-amber-700' : 'text-slate-900')}>
              {ballot.destroyDate || '—'}
            </p>
          </div>
          {retAlert && (
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              <AlertTriangle size={12}/><span className="text-xs font-bold">Action Required</span>
            </div>
          )}
        </div>
        {retDays !== null && ballot.destroyDate && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
              <div className={clsx('h-1.5 rounded-full transition-all', retAlert ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.max(0, Math.min(100, (1 - retDays / (ballot.retentionYears * 365)) * 100))}%` }}/>
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {retDays > 0 ? `${retDays} days remaining` : 'Past date'}
            </span>
          </div>
        )}
        <Badge variant={statusColors[ballot.retentionStatus] || 'gray'}>
          {statusLabels[ballot.retentionStatus] || ballot.retentionStatus}
        </Badge>
      </div>

      <div className="space-y-0 mb-4">
        {[
          ['Retention Period', `${ballot.retentionYears} years`],
          ['Legal Basis',      ballot.retentionBasis],
          ['Election Closed',  ballot.endDate],
          ['Certified Date',   ballot.certifiedDate || 'Not yet certified'],
        ].map(([l, v]) => (
          <div key={l} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
            <p className="text-xs text-slate-400 w-28 flex-shrink-0">{l}</p>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">{v}</p>
          </div>
        ))}
        {ballot.retentionNotes && (
          <div className="flex gap-3 py-2">
            <p className="text-xs text-slate-400 w-28 flex-shrink-0">Notes</p>
            <p className="text-xs text-slate-700">{ballot.retentionNotes}</p>
          </div>
        )}
      </div>

      <PermGate role={role} action="manageRetention">
        {!editing
          ? <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 size={11}/>Edit Retention Settings</Button>
          : (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200 mb-4">
              <p className="text-xs font-bold text-slate-700">Edit Retention Settings</p>
              <div>
                <label className={fLabel}>Scheduled Destruction Date</label>
                <input value={destroyDraft} onChange={e => setDestroyDraft(e.target.value)}
                  placeholder="Nov 30, 2030" className={iCls}/>
              </div>
              <div>
                <label className={fLabel}>Retention Status</label>
                <select value={statusDraft} onChange={e => setStatusDraft(e.target.value)} className={iCls}>
                  <option value="active">Active (In Retention)</option>
                  <option value="pending_review">Pending Destruction Review</option>
                  <option value="approved_for_destruction">Approved for Destruction</option>
                  <option value="destroyed">Destroyed</option>
                </select>
              </div>
              <div>
                <label className={fLabel}>Notes</label>
                <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={2}
                  className={iCls} placeholder="e.g. Board approved destruction at Jun 2030 meeting"/>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={save}><Check size={11}/>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          )
        }
      </PermGate>

      <SL>Retention Checklist</SL>
      <div className="space-y-1">
        {checklist.map(({ l, done }) => (
          <div key={l} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50">
            <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors', done ? 'bg-emerald-500' : 'bg-slate-200')}>
              {done && <Check size={10} className="text-white"/>}
            </div>
            <span className={clsx('text-xs', done ? 'text-slate-700' : 'text-slate-400')}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ballot detail panel ──────────────────────────────────────────────────────

function BallotDetail({ ballot, role, onUpdate, onClose }) {
  const [tab, setTab] = useState('overview');

  const addAudit = useCallback((action, details, variant = 'gray') => {
    const by = ROLES[role]?.label || role;
    const entry = makeEntry(action, details, by, variant);
    onUpdate({ auditLog: [entry, ...(ballot.auditLog || [])] });
  }, [ballot.auditLog, onUpdate, role]);

  const tabs = [
    { id: 'overview',   label: 'Overview'    },
    { id: 'ballot',     label: 'Ballot'      },
    { id: 'candidates', label: 'Candidates'  },
    { id: 'voting',     label: 'Voting'      },
    { id: 'results',    label: 'Results'     },
    { id: 'retention',  label: 'Retention'   },
    ...(can(role, 'viewAuditLog') ? [{ id: 'audit', label: 'Audit Log' }] : []),
  ];

  const statusMap = {
    draft:     { l: 'Draft',        c: 'gray'  },
    active:    { l: 'Voting Open',  c: 'green' },
    certified: { l: 'Certified',    c: 'blue'  },
    archived:  { l: 'Archived',     c: 'gray'  },
  };
  const st = statusMap[ballot.status] || { l: ballot.status, c: 'gray' };

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-sm font-bold text-slate-900 leading-snug">{ballot.title}</h2>
              <Badge variant={st.c}>{st.l}</Badge>
              <Badge variant="blue">{ballot.type}</Badge>
            </div>
            <p className="text-xs text-slate-400">{ballot.startDate} – {ballot.endDate} · {ballot.votingMethod}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0">
            <X size={14}/>
          </button>
        </div>
      </div>

      {/* Tab nav — scrollable so all 7 tabs fit */}
      <div className="px-5 pt-3 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-5 min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('py-1.5 px-2.5 text-[11px] font-medium rounded-md transition-all whitespace-nowrap',
                tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview'   && <OverviewTab   ballot={ballot} role={role}/>}
        {tab === 'ballot'     && <BallotPreviewTab ballot={ballot} role={role} onUpdate={onUpdate}/>}
        {tab === 'candidates' && <CandidatesTab ballot={ballot} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'voting'     && <VotingTab     ballot={ballot} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'results'    && <ResultsTab    ballot={ballot} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'retention'  && <RetentionTab  ballot={ballot} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mt-1 mb-1">
              <SL>Audit Trail</SL>
              <button className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 mb-[-4px]">
                <Download size={11}/>Export CSV
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Complete immutable log of all actions on this ballot record. Visible to Admin and Secretary only.
            </p>
            {(ballot.auditLog || []).map(e => <AuditRow key={e.id} entry={e}/>)}
            {!(ballot.auditLog || []).length && (
              <p className="text-sm text-slate-400 italic text-center py-4">No audit entries</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BallotManagementPage() {
  const [ballots, setBallots] = useState(SEED);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState('admin');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'Board', status: 'draft', votingStatus: 'pending',
    startDate: '', endDate: '', description: '',
    totalEligible: 148, votesCast: 0,
    seatsAvailable: 3, votingMethod: 'Mail-in & Online',
    ballotInstructions: '', certifiedDate: null, certifiedBy: [],
    candidates: [], auditLog: [],
    retentionStatus: 'active', retentionNotes: '',
  });

  const update = (id, patch) => {
    setBallots(p => p.map(b => b.id === id ? { ...b, ...patch } : b));
    setSelected(p => p?.id === id ? { ...p, ...patch } : p);
  };

  const create = () => {
    if (!form.title.trim()) return;
    const retYrs = RETENTION_YEARS[form.type] || 7;
    const b = {
      ...form, id: Date.now(),
      retentionYears: retYrs,
      retentionBasis: RETENTION_BASIS[form.type] || '',
      destroyDate: addYears(
        form.endDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        retYrs
      ),
      auditLog: [makeEntry(
        'Ballot Created',
        `"${form.title}" created. Type: ${form.type}. Seats: ${form.seatsAvailable}. Method: ${form.votingMethod}.`,
        ROLES[role]?.label || role,
        'gray'
      )],
    };
    setBallots(p => [b, ...p]);
    setSelected(b);
    setShowCreate(false);
    setForm({
      title: '', type: 'Board', status: 'draft', votingStatus: 'pending',
      startDate: '', endDate: '', description: '',
      totalEligible: 148, votesCast: 0,
      seatsAvailable: 3, votingMethod: 'Mail-in & Online',
      ballotInstructions: '', certifiedDate: null, certifiedBy: [],
      candidates: [], auditLog: [], retentionStatus: 'active', retentionNotes: '',
    });
  };

  const filtered = useMemo(() => ballots.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.type.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || b.status === filterStatus;
    return matchQ && matchS;
  }), [ballots, search, filterStatus]);

  const retAlerts = ballots.filter(b => {
    const d = daysUntil(b.destroyDate);
    return d !== null && d < 180 && d > 0;
  }).length;

  const statusMap = {
    draft:     { l: 'Draft',       c: 'gray'  },
    active:    { l: 'Voting Open', c: 'green' },
    certified: { l: 'Certified',   c: 'blue'  },
    archived:  { l: 'Archived',    c: 'gray'  },
  };

  const counts = { draft: 0, active: 0, certified: 0 };
  ballots.forEach(b => { if (b.status in counts) counts[b.status]++; });

  const fTabs = [
    { id: 'all',       label: `All (${ballots.length})` },
    { id: 'draft',     label: `Draft (${counts.draft})` },
    { id: 'active',    label: `Active (${counts.active})` },
    { id: 'certified', label: `Certified (${counts.certified})` },
  ];

  return (
    <div className="page-enter">
      {/* Create modal */}
      {showCreate && can(role, 'createBallot') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Create Ballot</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              <div>
                <label className={fLabel}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Board Election 2027" className={iCls}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fLabel}>Type</label>
                  <select value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value, seatsAvailable: e.target.value === 'Bylaw' ? 1 : p.seatsAvailable }))}
                    className={iCls}>
                    {['Board', 'Bylaw', 'Special', 'Committee'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={fLabel}>Seats / Choices</label>
                  <input type="number" value={form.seatsAvailable} min="1"
                    onChange={e => setForm(p => ({ ...p, seatsAvailable: Number(e.target.value) }))}
                    className={iCls}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fLabel}>Start Date</label>
                  <input value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    placeholder="Nov 1, 2027" className={iCls}/>
                </div>
                <div>
                  <label className={fLabel}>End Date</label>
                  <input value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                    placeholder="Nov 30, 2027" className={iCls}/>
                </div>
              </div>
              <div>
                <label className={fLabel}>Voting Method</label>
                <select value={form.votingMethod} onChange={e => setForm(p => ({ ...p, votingMethod: e.target.value }))} className={iCls}>
                  {['Mail-in & Online', 'Mail-in Only', 'Online Only', 'In-Person', 'Hybrid'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={fLabel}>Eligible Voters</label>
                <input type="number" value={form.totalEligible}
                  onChange={e => setForm(p => ({ ...p, totalEligible: Number(e.target.value) }))} className={iCls}/>
              </div>
              <div>
                <label className={fLabel}>Ballot Instructions</label>
                <textarea value={form.ballotInstructions}
                  onChange={e => setForm(p => ({ ...p, ballotInstructions: e.target.value }))} rows={2}
                  placeholder={`Vote for up to ${form.seatsAvailable} candidate(s)...`} className={iCls}/>
              </div>
              <div>
                <label className={fLabel}>Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={iCls}/>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-blue-700">
                  <strong>Retention:</strong> {RETENTION_YEARS[form.type] || 7} years · {RETENTION_BASIS[form.type] || ''}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}><Check size={13}/>Create Ballot</Button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-display text-slate-900">Ballot Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Role-based access · Retention tracking · Full audit trail</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {retAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
              <Bell size={11}/>{retAlerts} retention alert{retAlerts > 1 ? 's' : ''}
            </div>
          )}
          {/* Role switcher — demo only */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Shield size={11} className="text-slate-400"/>
            <span className="text-[10px] text-slate-400 font-medium">Role:</span>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="text-xs text-slate-700 font-medium bg-transparent border-none outline-none cursor-pointer">
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <RolePill role={role}/>
          </div>
          <PermGate role={role} action="createBallot" tip="Admin or Secretary role required to create ballots">
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={12}/>Create Ballot
            </Button>
          </PermGate>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Ballots"    value={ballots.length}    sub="All records"/>
        <MetricCard label="Certified"        value={counts.certified}  sub="Results final" subVariant="good"/>
        <MetricCard label="In Retention"     value={counts.certified}  sub="Legally held" subVariant="neutral"/>
        <MetricCard label="Retention Alerts" value={retAlerts}         sub={retAlerts > 0 ? 'Action needed' : 'All clear'} subVariant={retAlerts > 0 ? 'bad' : 'good'}/>
      </div>

      {/* List + detail */}
      <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>

        {/* Left: list panel */}
        <div className={clsx('flex flex-col border-r border-slate-100 flex-shrink-0', selected ? 'w-72' : 'w-full')}
          style={selected ? { height: 'calc(100vh - 290px)' } : {}}>

          <div className="p-3 border-b border-slate-100 flex-shrink-0 space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search ballots..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"/>
            </div>
            {!selected && (
              <div className="flex gap-1">
                {fTabs.map(t => (
                  <button key={t.id} onClick={() => setFilterStatus(t.id)}
                    className={clsx('px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors',
                      filterStatus === t.id ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact list when detail is open */}
          {selected ? (
            <div className="flex-1 overflow-y-auto">
              {filtered.map(b => {
                const st = statusMap[b.status] || { l: b.status, c: 'gray' };
                const retDays = daysUntil(b.destroyDate);
                const retAlert = retDays !== null && retDays < 180;
                return (
                  <button key={b.id} onClick={() => setSelected(b)}
                    className={clsx('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors border-l-[3px]',
                      selected?.id === b.id ? 'bg-navy-50 border-l-navy-600' : 'border-l-transparent')}>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{b.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant={st.c}>{st.l}</Badge>
                          <Badge variant="gray">{b.type}</Badge>
                          {retAlert && <Badge variant="amber"><AlertTriangle size={8}/>Retention</Badge>}
                        </div>
                      </div>
                      <ChevronRight size={11} className={selected?.id === b.id ? 'text-navy-500' : 'text-slate-300'}/>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Full table when no detail open */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Ballot', 'Type', 'Period', 'Turnout', 'Retention', 'Status'].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const st = statusMap[b.status] || { l: b.status, c: 'gray' };
                    const pct = b.totalEligible ? Math.round(b.votesCast / b.totalEligible * 100) : 0;
                    const retDays = daysUntil(b.destroyDate);
                    const retAlert = retDays !== null && retDays < 180;
                    return (
                      <tr key={b.id} onClick={() => setSelected(b)}
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 text-xs">{b.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{b.description}</p>
                        </td>
                        <td className="px-5 py-3"><Badge variant="blue">{b.type}</Badge></td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{b.startDate}<br/>{b.endDate}</td>
                        <td className="px-5 py-3 text-xs text-slate-600">
                          {b.votesCast}/{b.totalEligible}
                          {b.votesCast > 0 && <span className="text-slate-400"> ({pct}%)</span>}
                        </td>
                        <td className="px-5 py-3">
                          <p className={clsx('text-xs font-medium', retAlert ? 'text-amber-600' : 'text-slate-500')}>
                            {retAlert && <AlertTriangle size={10} className="inline mr-1"/>}
                            {b.destroyDate}
                          </p>
                          <p className="text-[11px] text-slate-400">{b.retentionYears}yr retention</p>
                        </td>
                        <td className="px-5 py-3"><Badge variant={st.c}>{st.l}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 290px)' }}>
            <BallotDetail
              ballot={selected}
              role={role}
              onUpdate={p => update(selected.id, p)}
              onClose={() => setSelected(null)}/>
          </div>
        )}
      </Card>
    </div>
  );
}
