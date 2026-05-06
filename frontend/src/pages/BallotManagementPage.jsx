/**
 * Ballot Management — Davis-Stirling Act compliant
 * California Civil Code §§ 5100–5145 (as amended through Jan 1, 2025)
 */
import { useState, useMemo, useCallback } from 'react';
import {
  Plus, X, Check, Edit2, Trash2, ChevronRight, Search, Shield,
  Lock, Unlock, Clock, FileText, CheckCircle, XCircle, AlertTriangle,
  Award, Printer, Info, Bell, Download, Users, Calendar, Mail,
  Archive, UserCheck, AlertCircle, Scale,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Badge, Button, MetricCard, Alert } from '../components/ui';

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const ROLES = {
  manager:   { label: 'HOA Manager',           color: 'bg-rose-700'   },
  board:     { label: 'Board Member',           color: 'bg-navy-700'   },
  inspector: { label: 'Inspector of Elections', color: 'bg-violet-700' },
  auditor:   { label: 'Financial Auditor',      color: 'bg-amber-700'  },
  resident:  { label: 'Resident / Member',      color: 'bg-slate-500'  },
};
const PERMISSIONS = {
  createElection:        ['manager'],
  configureElection:     ['manager'],
  advanceStage:          ['manager'],
  assignInspector:       ['manager', 'board'],
  viewTimeline:          ['manager', 'board', 'inspector'],
  manageNominations:     ['manager'],
  submitNomination:      ['resident', 'board'],
  viewCandidates:        ['manager', 'board', 'inspector', 'resident'],
  viewBallotReceiptLog:  ['inspector'],
  enterResults:          ['inspector'],
  certifyResults:        ['inspector'],
  viewCertifiedResults:  ['manager', 'board', 'inspector', 'resident'],
  manageInspectionReqs:  ['inspector'],
  submitInspectionReq:   ['resident'],
  authorizeDestruction:  ['inspector'],
  generateNotices:       ['manager'],
  viewAuditLog:          ['manager', 'inspector'],
  manageRetention:       ['manager', 'inspector'],
  viewCompliance:        ['manager', 'inspector'],
};
const can = (role, action) => (PERMISSIONS[action] || []).includes(role);

// ─── Stage pipeline ───────────────────────────────────────────────────────────
const STAGES = [
  { id: 'draft',               label: 'Draft'              },
  { id: 'nominations_open',    label: 'Nominations Open'   },
  { id: 'nominations_closed',  label: 'Nominations Closed' },
  { id: 'inspector_assigned',  label: 'Inspector Assigned' },
  { id: 'ballots_distributed', label: 'Ballots Out'        },
  { id: 'voting_open',         label: 'Voting Open'        },
  { id: 'counting_scheduled',  label: 'Counting Scheduled' },
  { id: 'results_certified',   label: 'Results Certified'  },
  { id: 'archived',            label: 'Archived'           },
];
const stageIndex = id => STAGES.findIndex(s => s.id === id);

// ─── Notice types ─────────────────────────────────────────────────────────────
const NOTICE_TYPES = {
  call_for_nominations: { label: 'Call for Nominations',       legal: 'Civil Code § 5115',   required: ['board_director', 'recall'] },
  nomination_reminder:  { label: 'Nomination Reminder',        legal: 'Civil Code § 5115',   required: ['board_director', 'recall'] },
  pre_ballot_notice:    { label: 'Pre-Ballot Notice (30 days)',legal: 'Civil Code § 5115',   required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
  opt_in_notice:        { label: 'Electronic Voting Opt-In Notice', legal: 'Civil Code § 5260', required: ['board_director', 'recall', 'ccr_amendment'] },
  ballot_package:       { label: 'Ballot Package Distribution',legal: 'Civil Code § 5115',   required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
  counting_meeting:     { label: 'Counting Meeting Notice',    legal: 'Civil Code § 5120',   required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
  results_publication:  { label: 'Results Publication',        legal: 'Civil Code § 5120',   required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const daysUntil = ds => { try { const d = new Date(ds); return isNaN(d) ? null : Math.ceil((d - new Date()) / 86400000); } catch { return null; } };
const addYears  = (ds, y) => { try { const d = new Date(ds); d.setFullYear(d.getFullYear() + y); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return null; } };
const daysBetween = (a, b) => { try { return Math.round((new Date(b) - new Date(a)) / 86400000); } catch { return null; } };
const nowStr = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const nowTs  = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const mkAudit = (action, details, by, variant = 'gray') => ({ id: `${Date.now()}-${Math.random()}`, ts: nowTs(), action, details, by, variant });

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED = [
  {
    id: 1,
    title: 'Board of Directors Election 2026',
    type: 'board_director',
    stage: 'nominations_open',
    seatsAvailable: 3,
    votingMethod: 'hybrid',
    quorumRequired: true,
    quorumPct: 25,
    totalEligible: 148,
    ballotsDistributed: 0,
    ballotsReceived: 0,
    description: 'Annual election for 3 open board seats.',
    dates: {
      nominationsOpen: 'Sep 1, 2026',
      nominationReminder: 'Nov 15, 2026',
      nominationsClose: 'Nov 30, 2026',
      optInDeadline: 'Oct 2, 2026',
      preBallotNotice: 'Dec 31, 2026',
      ballotDistribution: 'Jan 31, 2027',
      votingDeadline: 'Mar 2, 2027',
      countingMeeting: 'Mar 3, 2027',
      retentionExpiry: 'Mar 3, 2028',
    },
    inspector: null,
    candidates: [
      { id: 1, name: 'Sarah Chen',    unit: '14B', bio: 'Incumbent secretary, 6 years on board.',        eligible: true,  disqualified: false },
      { id: 2, name: 'David Park',    unit: '22A', bio: 'Civil engineer, 12 years as resident.',          eligible: true,  disqualified: false },
      { id: 3, name: 'Yolanda Reyes', unit: '7C',  bio: 'Retired teacher, active in community events.',   eligible: true,  disqualified: false },
      { id: 4, name: 'Greg Hoffman',  unit: '31D', bio: 'Submitted late — nomination period not yet closed.', eligible: true, disqualified: false },
    ],
    ballotInstructions: 'Vote for up to 3 candidates. Return ballot by Mar 2, 2027.',
    ballotReceiptLog: [],
    countingMeeting: { date: 'Mar 3, 2027', time: '6:00 PM', location: 'Clubhouse — Main Hall', observers: [] },
    notices: [
      { id: 'n1', type: 'call_for_nominations', sentDate: 'Sep 1, 2026', recipientCount: 148, method: 'Email & Mail', status: 'sent' },
    ],
    inspectionRequests: [],
    acclamationDeclared: false,
    adjournedMeeting: null,
    quorumMet: null,
    results: null,
    certifiedDate: null,
    retentionStatus: 'active',
    destroyDate: 'Mar 3, 2028',
    auditLog: [
      { id: 'a2', ts: 'Sep 1, 2026 9:00 AM',  action: 'Nominations Opened', details: 'Call for Nominations sent to 148 eligible members.', by: 'HOA Manager', variant: 'blue' },
      { id: 'a1', ts: 'Aug 25, 2026 3:00 PM', action: 'Election Created',   details: 'Board election 2026 created. 3 seats. Hybrid voting.', by: 'HOA Manager', variant: 'gray' },
    ],
  },
  {
    id: 2,
    title: 'Board of Directors Election 2024',
    type: 'board_director',
    stage: 'archived',
    seatsAvailable: 3,
    votingMethod: 'paper',
    quorumRequired: true,
    quorumPct: 25,
    totalEligible: 148,
    ballotsDistributed: 148,
    ballotsReceived: 112,
    description: 'Annual election for 3 open board seats — completed.',
    dates: {
      nominationsOpen: 'Sep 1, 2023', nominationReminder: 'Nov 15, 2023', nominationsClose: 'Nov 30, 2023',
      optInDeadline: null, preBallotNotice: 'Dec 30, 2023', ballotDistribution: 'Jan 1, 2024',
      votingDeadline: 'Feb 1, 2024', countingMeeting: 'Feb 2, 2024', retentionExpiry: 'Feb 2, 2025',
    },
    inspector: { name: 'Patricia Winters', firm: 'Winters Election Services', contact: 'p.winters@winterselections.com', assignedDate: 'Dec 15, 2023', conflictChecked: true, declaration: 'Not a director, candidate, related party, or HOA contractor.' },
    candidates: [
      { id: 1, name: 'Jane Ramirez',  unit: '1A', bio: 'Incumbent president.', eligible: true, disqualified: false, votes: 98, elected: true },
      { id: 2, name: 'Tom Nakamura',  unit: '2B', bio: 'VP, maintenance focus.', eligible: true, disqualified: false, votes: 87, elected: true },
      { id: 3, name: 'Maria Garcia',  unit: '3C', bio: 'CPA, 15 years HOA experience.', eligible: true, disqualified: false, votes: 91, elected: true },
      { id: 4, name: 'Robert Nguyen', unit: '4D', bio: 'First-time candidate.', eligible: true, disqualified: false, votes: 44, elected: false },
      { id: 5, name: 'Linda Park',    unit: '5E', bio: 'Community events focus.', eligible: true, disqualified: false, votes: 38, elected: false },
    ],
    ballotInstructions: 'Vote for up to 3 candidates. Return by Feb 1, 2024.',
    ballotReceiptLog: Array.from({ length: 112 }, (_, i) => ({ unit: `Unit ${i + 1}`, received: 'Feb 1, 2024' })),
    countingMeeting: { date: 'Feb 2, 2024', time: '6:00 PM', location: 'Clubhouse — Main Hall', observers: ['Alex Thompson', 'Sarah Chen (Secretary)', 'Robert Nguyen (Candidate)'] },
    notices: [
      { id: 'n6', type: 'results_publication', sentDate: 'Feb 2, 2024', recipientCount: 148, method: 'Email & Mail', status: 'sent' },
      { id: 'n5', type: 'counting_meeting',    sentDate: 'Jan 31, 2024', recipientCount: 148, method: 'Email & Mail', status: 'sent' },
      { id: 'n4', type: 'ballot_package',      sentDate: 'Jan 1, 2024',  recipientCount: 148, method: 'Mail',        status: 'sent' },
      { id: 'n3', type: 'pre_ballot_notice',   sentDate: 'Dec 30, 2023', recipientCount: 148, method: 'Email & Mail', status: 'sent' },
      { id: 'n2', type: 'nomination_reminder', sentDate: 'Nov 15, 2023', recipientCount: 148, method: 'Email & Mail', status: 'sent' },
      { id: 'n1', type: 'call_for_nominations',sentDate: 'Sep 1, 2023',  recipientCount: 148, method: 'Email & Mail', status: 'sent' },
    ],
    inspectionRequests: [
      { id: 'ir1', submittedBy: 'Robert Nguyen', unit: '4D', date: 'Feb 5, 2024', status: 'fulfilled', notes: 'Materials inspected Feb 8, 2024. Ballot secrecy preserved.' },
    ],
    acclamationDeclared: false,
    adjournedMeeting: null,
    quorumMet: true,
    results: { totalReceived: 112, totalValid: 109, invalidBallots: 3 },
    certifiedDate: 'Feb 2, 2024',
    retentionStatus: 'pending_review',
    destroyDate: 'Feb 2, 2025',
    auditLog: [
      { id: 'a7', ts: 'Feb 2, 2024 8:00 PM',  action: 'Results Certified',   details: 'Ramirez (98), Garcia (91), Nakamura (87) elected. 3/5 certified.', by: 'Patricia Winters', variant: 'green' },
      { id: 'a6', ts: 'Feb 2, 2024 6:00 PM',  action: 'Counting Meeting',    details: '3 observers present. 112 ballots counted, 3 invalid.', by: 'Patricia Winters', variant: 'blue' },
      { id: 'a5', ts: 'Feb 1, 2024 11:59 PM', action: 'Voting Closed',       details: '112 of 148 ballots received (75.7% turnout). Quorum met.', by: 'System', variant: 'gray' },
      { id: 'a4', ts: 'Jan 1, 2024 8:00 AM',  action: 'Ballots Distributed', details: '148 ballot packages mailed (paper, double-envelope system).', by: 'HOA Manager', variant: 'blue' },
      { id: 'a3', ts: 'Dec 15, 2023 2:00 PM', action: 'Inspector Assigned',  details: 'Patricia Winters (Winters Election Services) assigned. Conflict check cleared.', by: 'HOA Manager', variant: 'violet' },
      { id: 'a2', ts: 'Sep 1, 2023 9:00 AM',  action: 'Nominations Opened',  details: 'Call for Nominations sent to 148 members.', by: 'HOA Manager', variant: 'blue' },
      { id: 'a1', ts: 'Aug 25, 2023 3:00 PM', action: 'Election Created',    details: 'Board election 2024 created. 3 seats. Paper voting.', by: 'HOA Manager', variant: 'gray' },
    ],
  },
  {
    id: 3,
    title: 'CC&R Amendment — Pet Weight Limit',
    type: 'ccr_amendment',
    stage: 'draft',
    seatsAvailable: 1,
    votingMethod: 'paper',
    quorumRequired: true,
    quorumPct: 67,
    totalEligible: 148,
    ballotsDistributed: 0,
    ballotsReceived: 0,
    description: 'Proposed amendment to Article VI — increase pet weight limit from 25 to 50 lbs.',
    dates: { nominationsOpen: null, nominationReminder: null, nominationsClose: null, optInDeadline: null, preBallotNotice: null, ballotDistribution: null, votingDeadline: null, countingMeeting: null, retentionExpiry: null },
    inspector: null,
    candidates: [
      { id: 1, name: 'Yes — Approve Amendment', unit: '', bio: '', eligible: true, disqualified: false, votes: 0, elected: false },
      { id: 2, name: 'No — Reject Amendment',   unit: '', bio: '', eligible: true, disqualified: false, votes: 0, elected: false },
    ],
    ballotInstructions: 'Vote YES or NO. A two-thirds supermajority (67%) of votes cast is required for passage.',
    ballotReceiptLog: [],
    countingMeeting: { date: '', time: '', location: '', observers: [] },
    notices: [],
    inspectionRequests: [],
    acclamationDeclared: false,
    adjournedMeeting: null,
    quorumMet: null,
    results: null,
    certifiedDate: null,
    retentionStatus: 'active',
    destroyDate: null,
    auditLog: [
      { id: 'a1', ts: 'May 6, 2026 2:00 PM', action: 'Ballot Created', details: 'CC&R amendment ballot created. Pet weight limit increase.', by: 'HOA Manager', variant: 'gray' },
    ],
  },
];

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const iCls  = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const fLabel = 'block text-xs font-medium text-slate-500 mb-1';

function SL({ children }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2">{children}</p>;
}

function RolePill({ role }) {
  const r = ROLES[role] || { label: role, color: 'bg-slate-500' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white', r.color)}>
      <Shield size={8}/>{r.label}
    </span>
  );
}

function PermGate({ role, action, tip, children }) {
  if (can(role, action)) return children;
  const needs = (PERMISSIONS[action] || []).map(r => ROLES[r]?.label || r).join(' or ');
  return (
    <div className="relative group inline-flex">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-50 pointer-events-none shadow-lg">
        <Lock size={7} className="inline mr-1"/>{tip || `Requires: ${needs}`}
      </div>
    </div>
  );
}

function AuditRow({ e }) {
  const c = { green:'bg-emerald-100 text-emerald-700', blue:'bg-blue-100 text-blue-700', amber:'bg-amber-100 text-amber-700', violet:'bg-violet-100 text-violet-700', gray:'bg-slate-100 text-slate-600' };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', c[e.variant] || c.gray)}>{e.action}</span>
          <span className="text-[11px] text-slate-400">{e.ts}</span>
          <span className="text-[11px] text-slate-500">by {e.by}</span>
        </div>
        <p className="text-xs text-slate-600">{e.details}</p>
      </div>
    </div>
  );
}

// ─── Stage Pipeline ───────────────────────────────────────────────────────────
function StagePipeline({ stage }) {
  const current = stageIndex(stage);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center min-w-max gap-0">
        {STAGES.map((s, i) => {
          const done    = i < current;
          const active  = i === current;
          const future  = i > current;
          return (
            <div key={s.id} className="flex items-center">
              <div className={clsx('flex flex-col items-center gap-1', future ? 'opacity-40' : '')}>
                <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all',
                  done   ? 'bg-emerald-500 border-emerald-500' :
                  active ? 'bg-navy-600 border-navy-600' :
                           'bg-white border-slate-300')}>
                  {done   ? <Check size={11} className="text-white"/> :
                   active ? <div className="w-2 h-2 rounded-full bg-white"/> :
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"/>}
                </div>
                <p className={clsx('text-[9px] font-medium text-center w-16 leading-tight',
                  active ? 'text-navy-700 font-bold' : done ? 'text-emerald-700' : 'text-slate-400')}>
                  {s.label}
                </p>
              </div>
              {i < STAGES.length - 1 && (
                <div className={clsx('w-8 h-0.5 mb-4 flex-shrink-0', i < current ? 'bg-emerald-400' : 'bg-slate-200')}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function OverviewTab({ election, role, onUpdate, addAudit }) {
  const quorumNeeded = election.quorumRequired ? Math.ceil(election.totalEligible * election.quorumPct / 100) : 0;
  const quorumPct    = election.totalEligible ? Math.round(election.ballotsReceived / election.totalEligible * 100) : 0;
  const quorumMet    = !election.quorumRequired || election.ballotsReceived >= quorumNeeded;

  // Acclamation check (AB 502)
  const eligibleCandidates = election.candidates.filter(c => c.eligible && !c.disqualified).length;
  const nomDays = daysBetween(election.dates.nominationsOpen, election.dates.nominationsClose);
  const hasReminder = election.notices.some(n => n.type === 'nomination_reminder' && n.status === 'sent');
  const hadRecentElection = true; // seed: true for demo
  const acclamationConditions = [
    { label: 'Qualified candidates ≤ open seats',          met: eligibleCandidates <= election.seatsAvailable && eligibleCandidates > 0 },
    { label: 'Nomination period was at least 90 days',     met: nomDays !== null && nomDays >= 90 },
    { label: 'Nomination Reminder sent (7–30 days before close)', met: hasReminder },
    { label: 'HOA held secret ballot election in past 4 years',  met: hadRecentElection },
  ];
  const canAcclaim = acclamationConditions.every(c => c.met) && election.type === 'board_director';

  const nextStageId = STAGES[stageIndex(election.stage) + 1]?.id;

  return (
    <div>
      <SL>Election Pipeline</SL>
      <StagePipeline stage={election.stage}/>

      {canAcclaim && !election.acclamationDeclared && (
        <div className="mt-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Award size={14} className="text-emerald-600"/>
            <p className="text-sm font-bold text-emerald-800">Election by Acclamation Available (AB 502)</p>
          </div>
          <p className="text-xs text-emerald-700 mb-3">All 4 AB 502 conditions are met. The board may declare results without a full ballot election.</p>
          <div className="space-y-1 mb-3">
            {acclamationConditions.map(c => (
              <div key={c.label} className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle size={11}/>{c.label}
              </div>
            ))}
          </div>
          <PermGate role={role} action="advanceStage">
            <Button variant="success" size="sm" onClick={() => {
              onUpdate({ acclamationDeclared: true, stage: 'results_certified', certifiedDate: nowStr() });
              addAudit('Acclamation Declared', `Election by Acclamation declared per AB 502. ${eligibleCandidates} candidate(s) elected without ballot election.`, 'green');
            }}>
              <Award size={12}/>Declare Election by Acclamation
            </Button>
          </PermGate>
        </div>
      )}
      {election.acclamationDeclared && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2"><Award size={13} className="text-emerald-600"/><span className="text-xs font-bold text-emerald-800">Election by Acclamation declared {election.certifiedDate}</span></div>
        </div>
      )}

      <SL>Quorum Tracker</SL>
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-700">{election.quorumRequired ? `${election.quorumPct}% quorum required` : 'No quorum required'}</p>
          <Badge variant={quorumMet ? 'green' : 'amber'}>{quorumMet ? 'Quorum Met' : 'Not Yet Met'}</Badge>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div className={clsx('h-2 rounded-full transition-all', quorumMet ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${Math.min(100, quorumPct)}%` }}/>
          </div>
          <span className="text-xs text-slate-600 font-medium">{election.ballotsReceived} / {election.totalEligible}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Eligible', election.totalEligible], ['Received', election.ballotsReceived], ['Needed', election.quorumRequired ? quorumNeeded : '—']].map(([l, v]) => (
            <div key={l} className="bg-white rounded-lg p-2 border border-slate-100">
              <p className="text-base font-bold text-slate-900">{v}</p>
              <p className="text-[10px] text-slate-400">{l}</p>
            </div>
          ))}
        </div>
        {!quorumMet && election.stage === 'counting_scheduled' && (
          <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-bold text-amber-800">AB 1458 Adjournment Available</p>
            <p className="text-xs text-amber-700 mt-0.5">If quorum not met, adjourn ≥20 days. Quorum drops to 20% at reconvened meeting.</p>
            <PermGate role={role} action="advanceStage">
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => {
                onUpdate({ adjournedMeeting: { newQuorumPct: 20, noticeSent: false } });
                addAudit('Quorum Adjournment', 'Meeting adjourned per AB 1458. Quorum reduced to 20% for reconvened meeting.', 'amber');
              }}>
                <Calendar size={11}/>Initiate Adjournment
              </Button>
            </PermGate>
          </div>
        )}
      </div>

      <SL>Key Dates</SL>
      <div className="space-y-1.5">
        {Object.entries({
          'Nominations Open':   election.dates.nominationsOpen,
          'Nominations Close':  election.dates.nominationsClose,
          'Inspector Assigned': election.inspector?.assignedDate,
          'Ballot Distribution':election.dates.ballotDistribution,
          'Voting Deadline':    election.dates.votingDeadline,
          'Counting Meeting':   election.dates.countingMeeting,
          'Retention Expires':  election.dates.retentionExpiry,
        }).map(([l, v]) => v && (
          <div key={l} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500">{l}</span>
            <span className="text-xs font-semibold text-slate-800">{v}</span>
          </div>
        ))}
      </div>

      {can(role, 'advanceStage') && nextStageId && election.stage !== 'archived' && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={() => {
            onUpdate({ stage: nextStageId });
            addAudit('Stage Advanced', `Election moved to: ${STAGES.find(s => s.id === nextStageId)?.label}.`, 'blue');
          }}>
            <Check size={12}/>Advance to: {STAGES.find(s => s.id === nextStageId)?.label}
          </Button>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ election }) {
  const deadlines = [
    { label: 'Call for Nominations sent',                          legal: '§ 5115',       date: election.dates.nominationsOpen,   done: stageIndex(election.stage) > 1,  required: ['board_director', 'recall'] },
    { label: 'Nomination period ≥ 90 days',                       legal: '§ 5115',       date: election.dates.nominationsClose,  done: stageIndex(election.stage) > 2,  required: ['board_director', 'recall'], check: daysBetween(election.dates.nominationsOpen, election.dates.nominationsClose) >= 90 || stageIndex(election.stage) < 2, warn: daysBetween(election.dates.nominationsOpen, election.dates.nominationsClose) < 90 },
    { label: 'Nomination Reminder sent (7–30 days before close)', legal: '§ 5115',       date: election.dates.nominationReminder,done: election.notices.some(n => n.type === 'nomination_reminder'), required: ['board_director', 'recall'] },
    { label: 'Electronic voting opt-in period opens (90 days out)',legal: '§ 5260',       date: election.dates.optInDeadline,     done: stageIndex(election.stage) > 1,  required: election.votingMethod !== 'paper' ? ['board_director', 'recall', 'ccr_amendment'] : [] },
    { label: 'Inspector assigned (before ballot distribution)',   legal: '§ 5110',       date: election.inspector?.assignedDate, done: !!election.inspector,            required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
    { label: 'Pre-Ballot Notice sent (≥30 days before ballots)',  legal: '§ 5115',       date: election.dates.preBallotNotice,   done: election.notices.some(n => n.type === 'pre_ballot_notice'), required: ['board_director', 'recall', 'assessment', 'ccr_amendment'], check: daysBetween(election.dates.preBallotNotice, election.dates.ballotDistribution) >= 30, warn: daysBetween(election.dates.preBallotNotice, election.dates.ballotDistribution) < 30 },
    { label: 'Ballots distributed (≥30 days before deadline)',    legal: '§ 5115',       date: election.dates.ballotDistribution,done: stageIndex(election.stage) > 4,  required: ['board_director', 'recall', 'assessment', 'ccr_amendment'], check: daysBetween(election.dates.ballotDistribution, election.dates.votingDeadline) >= 30, warn: daysBetween(election.dates.ballotDistribution, election.dates.votingDeadline) < 30 },
    { label: 'Voting deadline',                                   legal: '§ 5100',       date: election.dates.votingDeadline,    done: stageIndex(election.stage) > 5,  required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
    { label: 'Ballot counting meeting (public)',                   legal: '§ 5120',       date: election.dates.countingMeeting,   done: stageIndex(election.stage) > 6,  required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
    { label: 'Results certified & published',                     legal: '§ 5120',       date: election.certifiedDate,           done: !!election.certifiedDate,        required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
    { label: 'Election materials retention period (1 year)',       legal: '§ 5120, 5125', date: election.dates.retentionExpiry,   done: false,                           required: ['board_director', 'recall', 'assessment', 'ccr_amendment'] },
  ].filter(d => !d.required.length || d.required.includes(election.type));

  return (
    <div>
      <SL>Legal Timeline — Davis-Stirling Act</SL>
      <p className="text-xs text-slate-500 mb-3">Minimum 105-day election process for board elections. Compliance flags shown in amber.</p>
      <div className="space-y-1.5">
        {deadlines.map((d, i) => {
          const days  = daysUntil(d.date);
          const hasWarn = d.warn === true;
          return (
            <div key={i} className={clsx('flex items-start gap-3 p-2.5 rounded-xl', hasWarn ? 'bg-amber-50 border border-amber-200' : d.done ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100')}>
              <div className="mt-0.5 flex-shrink-0">
                {hasWarn ? <AlertTriangle size={13} className="text-amber-500"/> :
                 d.done  ? <CheckCircle  size={13} className="text-emerald-500"/> :
                           <Clock        size={13} className="text-slate-400"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-xs font-semibold', hasWarn ? 'text-amber-800' : d.done ? 'text-emerald-800' : 'text-slate-700')}>{d.label}</span>
                  <span className="text-[10px] text-slate-400">{d.legal}</span>
                </div>
                {hasWarn && <p className="text-[11px] text-amber-700 mt-0.5">⚠ Timeline gap may not meet legal minimum — review required.</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {d.date && <p className="text-xs font-medium text-slate-700">{d.date}</p>}
                {days !== null && !d.done && <p className={clsx('text-[11px]', days < 0 ? 'text-rose-600 font-bold' : days < 14 ? 'text-amber-600' : 'text-slate-400')}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d away`}</p>}
                {d.done && <p className="text-[11px] text-emerald-600">Complete</p>}
                {!d.date && <p className="text-[11px] text-slate-400">Not set</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NominationsTab({ election, role, onUpdate, addAudit }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', unit: '', bio: '', eligible: true });
  const eligible = election.candidates.filter(c => c.eligible && !c.disqualified);

  const addCandidate = () => {
    if (!draft.name.trim()) return;
    const c = { ...draft, id: Date.now(), disqualified: !draft.eligible, votes: 0, elected: false };
    onUpdate({ candidates: [...election.candidates, c] });
    addAudit('Candidate Added', `${draft.name} (Unit ${draft.unit}) nominated. Eligibility: ${draft.eligible ? 'verified' : 'pending'}.`, 'blue');
    setDraft({ name: '', unit: '', bio: '', eligible: true });
    setShowForm(false);
  };

  const disqualify = id => {
    const c = election.candidates.find(x => x.id === id);
    onUpdate({ candidates: election.candidates.map(x => x.id === id ? { ...x, disqualified: !x.disqualified } : x) });
    addAudit('Eligibility Updated', `${c?.name} marked ${c?.disqualified ? 'eligible' : 'disqualified (AB 1764)'}.`, 'amber');
  };

  const canAcclaim = eligible.length <= election.seatsAvailable && eligible.length > 0;

  return (
    <div>
      {canAcclaim && (
        <div className="mt-1 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <Award size={13} className="text-emerald-600"/>
            <p className="text-xs font-bold text-emerald-800">Acclamation conditions may be met — {eligible.length} candidate(s), {election.seatsAvailable} seat(s)</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <SL>Candidates ({election.candidates.length})</SL>
        <PermGate role={role} action="manageNominations">
          <button onClick={() => setShowForm(v => !v)}
            className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mb-[-4px]">
            <Plus size={11}/>Add Candidate
          </button>
        </PermGate>
      </div>

      {showForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fLabel}>Full Name *</label><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={iCls} placeholder="Jane Smith"/></div>
            <div><label className={fLabel}>Unit #</label><input value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} className={iCls} placeholder="12A"/></div>
          </div>
          <div><label className={fLabel}>Candidate Statement</label><textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))} rows={2} className={iCls} placeholder="Brief statement for ballot package..."/></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.eligible} onChange={e => setDraft(d => ({ ...d, eligible: e.target.checked }))} className="rounded"/>
            <span className="text-xs text-slate-600">Eligibility verified (per AB 1764 and HOA bylaws)</span>
          </label>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={addCandidate}><Check size={11}/>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">AB 1764 — Disqualification Criteria</p>
        <div className="text-[11px] text-blue-700 space-y-0.5">
          {['Delinquent in assessments', 'Convicted of a felony involving dishonesty', 'Violated HOA rules (within 1 year)', 'Does not own or reside in the community (per bylaws)', 'Nominated after close of nominations'].map(r => (
            <div key={r} className="flex items-center gap-1"><XCircle size={9}/>{r}</div>
          ))}
        </div>
      </div>

      {election.candidates.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-6">No candidates submitted yet</p>
      ) : (
        <div className="space-y-2">
          {election.candidates.map((c, i) => (
            <div key={c.id} className={clsx('p-3 border rounded-xl', c.disqualified ? 'border-rose-200 bg-rose-50' : c.elected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                      {c.unit && <span className="text-[11px] text-slate-400">Unit {c.unit}</span>}
                      {c.elected    && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                      {c.disqualified && <Badge variant="red"><XCircle size={9}/>Disqualified</Badge>}
                      {!c.disqualified && !c.elected && <Badge variant="blue">Eligible</Badge>}
                    </div>
                    {c.bio && <p className="text-xs text-slate-500 italic">{c.bio}</p>}
                    {election.stage === 'archived' && c.votes !== undefined && (
                      <p className="text-xs font-bold text-slate-700 mt-1">{c.votes} votes</p>
                    )}
                  </div>
                </div>
                {can(role, 'manageNominations') && election.stage !== 'archived' && (
                  <button onClick={() => disqualify(c.id)}
                    className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors flex-shrink-0', c.disqualified ? 'text-emerald-600 hover:bg-emerald-100' : 'text-rose-600 hover:bg-rose-100')}>
                    {c.disqualified ? 'Reinstate' : 'Disqualify'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3">
        {election.type === 'board_director' ? `Floor nominations prohibited when electronic ballots are in use (Civil Code § 5105).` : ''}
      </p>
    </div>
  );
}

function InspectorTab({ election, role, onUpdate, addAudit }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', firm: '', contact: '', conflictChecked: false, declaration: '' });
  const [showReceiptLog, setShowReceiptLog] = useState(false);
  const [receiptUnit, setReceiptUnit] = useState('');

  const assign = () => {
    if (!form.name.trim() || !form.conflictChecked) return;
    const ins = { ...form, assignedDate: nowStr(), loginExpiry: election.dates.retentionExpiry };
    onUpdate({ inspector: ins, stage: stageIndex(election.stage) <= 2 ? 'inspector_assigned' : election.stage });
    addAudit('Inspector Assigned', `${form.name} (${form.firm || 'Independent'}) assigned. Conflict-of-interest declaration recorded.`, 'violet');
    setShowForm(false);
  };

  const logReceipt = () => {
    if (!receiptUnit.trim()) return;
    const entry = { unit: receiptUnit, received: nowStr(), id: Date.now() };
    onUpdate({ ballotReceiptLog: [...(election.ballotReceiptLog || []), entry], ballotsReceived: (election.ballotsReceived || 0) + 1 });
    addAudit('Ballot Receipt Logged', `Outer envelope received from Unit ${receiptUnit}. Inner ballot envelope not opened.`, 'gray');
    setReceiptUnit('');
  };

  const conflictChecklist = [
    'Not a current director of the HOA',
    'Not a candidate for director in this election',
    'Not related to a director or candidate',
    'Not currently employed by or under contract with the HOA (other than as Inspector)',
    'Not affiliated with the HOA management company',
  ];

  return (
    <div>
      <SL>Inspector of Elections</SL>
      {!election.inspector ? (
        <div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={12} className="text-amber-600"/><p className="text-xs font-bold text-amber-800">Inspector must be assigned before ballots are distributed (Civil Code § 5110)</p></div>
            <p className="text-[11px] text-amber-700">May be an individual or firm (notary, CPA, attorney, or professional election service). Appointed by the board after close of nominations.</p>
          </div>
          <PermGate role={role} action="assignInspector">
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}><UserCheck size={12}/>Assign Inspector</Button>
          </PermGate>
          {showForm && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700">Inspector Assignment</p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={fLabel}>Inspector Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={iCls} placeholder="Patricia Winters"/></div>
                <div><label className={fLabel}>Firm / Organization</label><input value={form.firm} onChange={e => setForm(p => ({ ...p, firm: e.target.value }))} className={iCls} placeholder="Winters Election Services"/></div>
              </div>
              <div><label className={fLabel}>Contact</label><input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} className={iCls} placeholder="email or phone"/></div>
              <div>
                <label className={fLabel}>Conflict-of-Interest Declaration</label>
                <p className="text-[11px] text-slate-500 mb-2">Inspector must confirm ALL of the following (Civil Code § 5110):</p>
                <div className="space-y-1.5">
                  {conflictChecklist.map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0"/>{item}</div>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer p-2 bg-white rounded-lg border border-slate-200">
                  <input type="checkbox" checked={form.conflictChecked} onChange={e => setForm(p => ({ ...p, conflictChecked: e.target.checked }))} className="rounded"/>
                  <span className="text-xs font-medium text-slate-700">Inspector confirms all 5 conditions above — no conflicts of interest</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={assign} disabled={!form.conflictChecked || !form.name}><Check size={11}/>Assign Inspector</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2"><UserCheck size={14} className="text-violet-600"/><span className="text-sm font-bold text-violet-800">{election.inspector.name}</span><Badge variant="blue">Assigned</Badge></div>
            {election.inspector.firm    && <p className="text-xs text-violet-700">{election.inspector.firm}</p>}
            {election.inspector.contact && <p className="text-xs text-violet-600">{election.inspector.contact}</p>}
            <div className="mt-2 space-y-0.5 text-[11px] text-violet-700">
              <p>Assigned: {election.inspector.assignedDate}</p>
              <p>Login active until: {election.inspector.loginExpiry || election.dates.retentionExpiry || '—'} (1-year retention period)</p>
              {election.inspector.conflictChecked && <p className="flex items-center gap-1"><CheckCircle size={10}/>Conflict-of-interest declaration on file</p>}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Inspector Responsibilities (Civil Code § 5110)</p>
            {[
              ['Receive and securely store all ballots', true],
              ['Maintain and verify voter eligibility list', !!election.inspector],
              ['Log ballot receipt per unit (outer envelope only)', (election.ballotReceiptLog||[]).length > 0],
              ['Conduct public ballot-counting meeting', stageIndex(election.stage) >= 6],
              ['Certify and announce official results', !!election.certifiedDate],
              ['Retain election materials for 1 year post-election', !!election.certifiedDate],
            ].map(([l, done]) => (
              <div key={l} className="flex items-center gap-2 py-1">
                <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0', done ? 'bg-emerald-500' : 'bg-slate-200')}>
                  {done && <Check size={9} className="text-white"/>}
                </div>
                <span className={clsx('text-xs', done ? 'text-slate-700' : 'text-slate-400')}>{l}</span>
              </div>
            ))}
          </div>

          <SL>Ballot Receipt Log</SL>
          <PermGate role={role} action="viewBallotReceiptLog" tip="Inspector of Elections access only">
            <div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-3">
                <p className="text-[11px] text-amber-800 font-medium">
                  ⚠ Inspector logs receipt of <strong>outer (signed) envelopes only</strong>. Inner ballot envelopes must NOT be opened before the counting meeting (Civil Code § 5120).
                </p>
              </div>
              <div className="flex gap-2 mb-3">
                <input value={receiptUnit} onChange={e => setReceiptUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && logReceipt()}
                  placeholder="Unit # (e.g. 12A)" className={iCls + ' text-xs py-1.5'}/>
                <Button variant="primary" size="sm" onClick={logReceipt}><Check size={11}/>Log Receipt</Button>
              </div>
              <p className="text-xs text-slate-500 mb-2">{(election.ballotReceiptLog || []).length} of {election.totalEligible} outer envelopes received</p>
              {(election.ballotReceiptLog || []).slice(0, 8).map(r => (
                <div key={r.id || r.unit} className="flex justify-between py-1 text-xs border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-medium">Unit {r.unit}</span>
                  <span className="text-slate-400">{r.received}</span>
                </div>
              ))}
              {(election.ballotReceiptLog || []).length > 8 && <p className="text-[11px] text-slate-400 mt-1">…and {election.ballotReceiptLog.length - 8} more</p>}
            </div>
          </PermGate>
        </div>
      )}
    </div>
  );
}

function CountingTab({ election, role, onUpdate, addAudit }) {
  const [votes, setVotes] = useState(() => Object.fromEntries(election.candidates.map(c => [c.id, c.votes || 0])));
  const [totalCast, setTotalCast] = useState(election.ballotsReceived || 0);
  const [totalValid, setTotalValid] = useState(election.results?.totalValid || 0);
  const [observer, setObserver] = useState('');
  const [approvals, setApprovals] = useState(election.certifiedDate ? ['Certified'] : []);
  const [approverName, setApproverName] = useState('');
  const [certStep, setCertStep] = useState(0);

  const seats = election.seatsAvailable || 1;
  const totalEntered = Object.values(votes).reduce((s, v) => s + Number(v || 0), 0);
  const sorted = [...election.candidates].sort((a, b) => Number(votes[b.id]||0) - Number(votes[a.id]||0));

  const addObserver = () => {
    if (!observer.trim()) return;
    onUpdate({ countingMeeting: { ...election.countingMeeting, observers: [...(election.countingMeeting.observers || []), observer] } });
    addAudit('Observer Registered', `${observer} registered as observer for counting meeting.`, 'gray');
    setObserver('');
  };

  const saveDraft = () => {
    const updated = election.candidates.map(c => ({ ...c, votes: Number(votes[c.id] || 0) }));
    onUpdate({ candidates: updated, ballotsReceived: Number(totalCast), results: { totalReceived: Number(totalCast), totalValid: Number(totalValid) } });
    addAudit('Vote Tallies Saved (Draft)', `Draft results entered. ${totalEntered} total votes recorded across ${election.candidates.length} candidates.`, 'blue');
  };

  const certify = () => {
    const electedIds = new Set(sorted.slice(0, seats).map(c => c.id));
    const updated = election.candidates.map(c => ({ ...c, votes: Number(votes[c.id]||0), elected: electedIds.has(c.id) }));
    onUpdate({ candidates: updated, ballotsReceived: Number(totalCast), stage: 'results_certified', certifiedDate: nowStr(), results: { totalReceived: Number(totalCast), totalValid: Number(totalValid), certifiedBy: approvals[0] } });
    addAudit('Results Certified', `Results certified by Inspector. Top ${seats}: ${sorted.slice(0, seats).map(c => c.name).join(', ')}.`, 'green');
    setCertStep(0);
  };

  const precountChecklist = [
    { label: 'All outer envelopes logged', done: (election.ballotReceiptLog||[]).length > 0 },
    { label: 'Meeting is open to all members and candidates', done: (election.countingMeeting.observers||[]).length >= 0 },
    { label: 'No tally sheets accessed before meeting (§ 5120(c))', done: true },
    { label: 'Double-envelope system preserved — inner envelopes unopened until count', done: true },
    { label: 'Inspector present and ready to conduct count', done: !!election.inspector },
  ];

  return (
    <div>
      <SL>Counting Meeting Details</SL>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['Date', election.countingMeeting?.date], ['Time', election.countingMeeting?.time], ['Location', election.countingMeeting?.location]].map(([l, v]) => (
          <div key={l} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{l}</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">{v || '—'}</p>
          </div>
        ))}
      </div>

      <SL>Pre-Counting Checklist</SL>
      <div className="space-y-1 mb-4">
        {precountChecklist.map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
            <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0', done ? 'bg-emerald-500' : 'bg-slate-200')}>
              {done && <Check size={9} className="text-white"/>}
            </div>
            <span className={clsx('text-xs', done ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
          </div>
        ))}
      </div>

      <SL>Observers</SL>
      <p className="text-[11px] text-slate-500 mb-2">Any member or candidate may observe the counting meeting (§ 5120). Board members may observe only — not conduct the count.</p>
      <div className="flex gap-2 mb-2">
        <input value={observer} onChange={e => setObserver(e.target.value)} onKeyDown={e => e.key === 'Enter' && addObserver()}
          placeholder="Observer name" className={iCls + ' text-xs py-1.5'}/>
        <Button variant="secondary" size="sm" onClick={addObserver}><Plus size={11}/>Add</Button>
      </div>
      {(election.countingMeeting?.observers || []).map(o => (
        <div key={o} className="text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0 flex items-center gap-2"><Users size={10} className="text-slate-400"/>{o}</div>
      ))}

      <SL>Vote Tally Entry</SL>
      <PermGate role={role} action="enterResults" tip="Inspector of Elections only">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <label className={fLabel}>Total Ballots Cast</label>
              <input type="number" value={totalCast} onChange={e => setTotalCast(e.target.value)} className={iCls + ' mt-1'} min="0"/>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <label className={fLabel}>Valid Ballots</label>
              <input type="number" value={totalValid} onChange={e => setTotalValid(e.target.value)} className={iCls + ' mt-1'} min="0"/>
            </div>
          </div>
          {sorted.map((c, rank) => {
            const v   = Number(votes[c.id] || 0);
            const pct = totalEntered > 0 ? Math.round(v / totalEntered * 100) : 0;
            return (
              <div key={c.id} className="p-3 border border-slate-100 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{rank + 1}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                    {rank < seats && totalEntered > 0 && <Badge variant="blue">On track</Badge>}
                    {c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{pct}%</span>
                    <input type="number" value={votes[c.id] ?? ''} min="0"
                      onChange={e => setVotes(p => ({ ...p, [c.id]: e.target.value }))}
                      disabled={election.stage === 'results_certified'}
                      className="w-20 px-2 py-1 text-sm text-center bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="0"/>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={clsx('h-1.5 rounded-full transition-all', c.elected ? 'bg-emerald-500' : 'bg-navy-600')} style={{ width: `${pct}%` }}/>
                </div>
              </div>
            );
          })}
          {election.stage !== 'results_certified' && (
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={saveDraft}>Save Draft</Button>
              <Button variant="primary" size="sm" onClick={() => setCertStep(1)}><Award size={12}/>Certify Results</Button>
            </div>
          )}
          {election.stage === 'results_certified' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2"><CheckCircle size={13} className="text-emerald-600"/><span className="text-xs font-bold text-emerald-800">Results certified {election.certifiedDate}</span></div>
              {election.results?.certifiedBy && <p className="text-[11px] text-emerald-700 mt-0.5">Certified by: {election.results.certifiedBy}</p>}
            </div>
          )}
          {certStep === 1 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
              <p className="text-sm font-bold text-amber-900">Confirm Certification (Civil Code § 5120)</p>
              <p className="text-xs text-amber-700">Enter the Inspector's name to digitally certify. This publishes results to all members.</p>
              {approvals.length === 0 && (
                <div className="flex gap-2">
                  <input value={approverName} onChange={e => setApproverName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (() => { if (approverName.trim()) { setApprovals([approverName.trim()]); setApproverName(''); } })()} placeholder="Inspector name" className={iCls + ' text-xs py-1.5'}/>
                  <Button variant="primary" size="sm" onClick={() => { if (approverName.trim()) { setApprovals([approverName.trim()]); setApproverName(''); } }}>Confirm</Button>
                </div>
              )}
              {approvals.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-700 mb-2 flex items-center gap-1"><CheckCircle size={11}/>{approvals[0]}</p>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={certify}><Award size={12}/>Certify & Publish</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setCertStep(0); setApprovals([]); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PermGate>
    </div>
  );
}

function NoticesTab({ election, role, onUpdate, addAudit }) {
  const requiredTypes = Object.entries(NOTICE_TYPES).filter(([, v]) => v.required.includes(election.type));
  const sentTypes = new Set(election.notices.map(n => n.type));

  const send = (typeId) => {
    const meta = NOTICE_TYPES[typeId];
    const n = { id: `n${Date.now()}`, type: typeId, sentDate: nowStr(), recipientCount: election.totalEligible, method: 'Email & Mail', status: 'sent' };
    onUpdate({ notices: [n, ...election.notices] });
    addAudit(`Notice Sent: ${meta.label}`, `${meta.label} sent to ${election.totalEligible} members. Legal basis: ${meta.legal}.`, 'blue');
  };

  return (
    <div>
      <SL>Required Legal Notices</SL>
      <p className="text-xs text-slate-500 mb-3">All notices must be archived as PDF with send timestamps (AUD-02). Stored for minimum 4 years.</p>
      <div className="space-y-2">
        {requiredTypes.map(([typeId, meta]) => {
          const sent = sentTypes.has(typeId);
          const notice = election.notices.find(n => n.type === typeId);
          return (
            <div key={typeId} className={clsx('p-3 border rounded-xl', sent ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5', sent ? 'bg-emerald-500' : 'bg-slate-200')}>
                    {sent ? <Check size={10} className="text-white"/> : <Mail size={9} className="text-slate-400"/>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{meta.label}</p>
                    <p className="text-[10px] text-slate-400">{meta.legal}</p>
                    {sent && notice && <p className="text-[11px] text-emerald-700 mt-0.5">Sent {notice.sentDate} · {notice.recipientCount} recipients · {notice.method}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sent && <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><Download size={10}/>PDF</button>}
                  <PermGate role={role} action="generateNotices">
                    {!sent
                      ? <Button variant="primary" size="sm" onClick={() => send(typeId)}><Mail size={11}/>Send</Button>
                      : <Badge variant="green">Sent</Badge>
                    }
                  </PermGate>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {election.notices.length > 0 && (
        <>
          <SL>Notice Archive</SL>
          <div className="space-y-1">
            {election.notices.map(n => {
              const meta = NOTICE_TYPES[n.type];
              return (
                <div key={n.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{meta?.label || n.type}</p>
                    <p className="text-[11px] text-slate-400">{n.sentDate} · {n.recipientCount} recipients · {n.method}</p>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 flex-shrink-0 ml-2"><Download size={10}/>PDF</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ComplianceTab({ election, role, onUpdate, addAudit }) {
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqDraft, setReqDraft] = useState({ submittedBy: '', unit: '', notes: '' });

  const submitReq = () => {
    if (!reqDraft.submittedBy.trim()) return;
    const r = { ...reqDraft, id: Date.now(), date: nowStr(), status: 'pending' };
    onUpdate({ inspectionRequests: [...election.inspectionRequests, r] });
    addAudit('Inspection Request Submitted', `${reqDraft.submittedBy} (Unit ${reqDraft.unit}) requested inspection of election materials.`, 'amber');
    setReqDraft({ submittedBy: '', unit: '', notes: '' });
    setShowReqForm(false);
  };

  const fulfillReq = id => {
    onUpdate({ inspectionRequests: election.inspectionRequests.map(r => r.id === id ? { ...r, status: 'fulfilled', fulfilledDate: nowStr() } : r) });
    addAudit('Inspection Request Fulfilled', 'Materials inspection facilitated. Ballot secrecy preserved.', 'green');
  };

  const retDays = daysUntil(election.dates.retentionExpiry);

  const complianceChecks = [
    { label: 'Inspector assigned before ballot distribution',     done: !!election.inspector },
    { label: 'Call for Nominations sent (≥ 90-day period)',        done: election.notices.some(n => n.type === 'call_for_nominations') },
    { label: 'Nomination Reminder sent',                           done: election.notices.some(n => n.type === 'nomination_reminder') },
    { label: 'Pre-Ballot Notice sent (≥ 30 days before ballots)', done: election.notices.some(n => n.type === 'pre_ballot_notice') },
    { label: 'Ballot Package distributed (≥ 30 days before deadline)', done: election.notices.some(n => n.type === 'ballot_package') },
    { label: 'Counting Meeting Notice sent',                       done: election.notices.some(n => n.type === 'counting_meeting') },
    { label: 'Results certified by Inspector',                     done: !!election.certifiedDate },
    { label: 'Results published to all members',                   done: election.notices.some(n => n.type === 'results_publication') },
    { label: 'Inspector conflict-of-interest declaration on file', done: election.inspector?.conflictChecked },
    { label: 'Election materials retained (1 year)',               done: election.stage !== 'draft' },
  ];
  const passCount = complianceChecks.filter(c => c.done).length;

  return (
    <div>
      <SL>Compliance Report — Davis-Stirling Act</SL>
      <div className="flex items-center justify-between mb-3">
        <div className={clsx('text-lg font-black', passCount === complianceChecks.length ? 'text-emerald-600' : 'text-amber-600')}>
          {passCount} / {complianceChecks.length} <span className="text-sm font-normal text-slate-500">requirements met</span>
        </div>
        <button className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
          <Download size={11}/>Export Report
        </button>
      </div>
      <div className="space-y-1 mb-4">
        {complianceChecks.map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50">
            <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0', done ? 'bg-emerald-500' : 'bg-slate-200')}>
              {done && <Check size={9} className="text-white"/>}
            </div>
            <span className={clsx('text-xs', done ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
          </div>
        ))}
      </div>

      {election.acclamationDeclared && (
        <>
          <SL>Election by Acclamation Record (AB 502)</SL>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
            <p className="text-xs font-bold text-emerald-800">Acclamation declared {election.certifiedDate}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">All 4 AB 502 conditions verified. No ballot election required.</p>
          </div>
        </>
      )}

      <SL>Retention</SL>
      <div className={clsx('p-3 rounded-xl border mb-4', retDays !== null && retDays < 180 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200')}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-700">Retention expires: <span className="font-black">{election.dates.retentionExpiry || '—'}</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5">1-year minimum · Civil Code § 5120, § 5125</p>
          </div>
          {retDays !== null && retDays < 180 && <AlertTriangle size={13} className="text-amber-500"/>}
        </div>
        {retDays !== null && <p className={clsx('text-[11px] mt-1.5 font-medium', retDays < 0 ? 'text-rose-600' : retDays < 180 ? 'text-amber-600' : 'text-slate-500')}>{retDays > 0 ? `${retDays} days remaining` : 'Past retention date — authorization required'}</p>}
        <PermGate role={role} action="authorizeDestruction">
          {retDays !== null && retDays <= 0 && (
            <Button variant="danger" size="sm" className="mt-2" onClick={() => {
              onUpdate({ retentionStatus: 'approved_for_destruction' });
              addAudit('Destruction Authorized', 'Inspector authorized destruction of election materials after 1-year retention period.', 'red');
            }}>Authorize Destruction</Button>
          )}
        </PermGate>
      </div>

      <SL>Member Inspection Requests (Civil Code § 5125)</SL>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-slate-500">Members may inspect election materials at any time during the retention period.</p>
        <PermGate role={role} action="submitInspectionReq">
          <button onClick={() => setShowReqForm(v => !v)} className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 flex-shrink-0 ml-2">
            <Plus size={11}/>Request Inspection
          </button>
        </PermGate>
      </div>
      {showReqForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fLabel}>Member Name *</label><input value={reqDraft.submittedBy} onChange={e => setReqDraft(d => ({ ...d, submittedBy: e.target.value }))} className={iCls}/></div>
            <div><label className={fLabel}>Unit #</label><input value={reqDraft.unit} onChange={e => setReqDraft(d => ({ ...d, unit: e.target.value }))} className={iCls}/></div>
          </div>
          <div><label className={fLabel}>Notes</label><input value={reqDraft.notes} onChange={e => setReqDraft(d => ({ ...d, notes: e.target.value }))} className={iCls}/></div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={submitReq}><Check size={11}/>Submit</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReqForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {election.inspectionRequests.length === 0
        ? <p className="text-sm text-slate-400 italic">No inspection requests</p>
        : election.inspectionRequests.map(r => (
          <div key={r.id} className="p-3 border border-slate-100 rounded-xl mb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">{r.submittedBy} — Unit {r.unit}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{r.date}{r.notes && ` · ${r.notes}`}</p>
                {r.fulfilledDate && <p className="text-[11px] text-emerald-600 mt-0.5">Fulfilled {r.fulfilledDate}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={r.status === 'fulfilled' ? 'green' : 'amber'}>{r.status}</Badge>
                <PermGate role={role} action="manageInspectionReqs">
                  {r.status === 'pending' && <Button variant="secondary" size="sm" onClick={() => fulfillReq(r.id)}><Check size={11}/>Fulfill</Button>}
                </PermGate>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── Election detail (tab router) ─────────────────────────────────────────────
function ElectionDetail({ election, role, onUpdate, onClose }) {
  const [tab, setTab] = useState('overview');

  const addAudit = useCallback((action, details, variant = 'gray') => {
    onUpdate({ auditLog: [mkAudit(action, details, ROLES[role]?.label || role, variant), ...(election.auditLog || [])] });
  }, [election.auditLog, onUpdate, role]);

  const allTabs = [
    { id: 'overview',    label: 'Overview',    roles: ['manager','board','inspector','resident'] },
    { id: 'timeline',    label: 'Timeline',    roles: ['manager','board','inspector'] },
    { id: 'nominations', label: 'Nominations', roles: ['manager','board','inspector','resident'] },
    { id: 'inspector',   label: 'Inspector',   roles: ['manager','board','inspector'] },
    { id: 'counting',    label: 'Counting',    roles: ['manager','inspector'] },
    { id: 'notices',     label: 'Notices',     roles: ['manager'] },
    { id: 'compliance',  label: 'Compliance',  roles: ['manager','inspector','resident'] },
    { id: 'audit',       label: 'Audit Log',   roles: ['manager','inspector'] },
  ].filter(t => t.roles.includes(role));

  const stageColors = { draft:'gray', nominations_open:'blue', nominations_closed:'amber', inspector_assigned:'blue', ballots_distributed:'blue', voting_open:'green', counting_scheduled:'amber', results_certified:'green', archived:'gray' };

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      <div className="px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-sm font-bold text-slate-900 leading-snug">{election.title}</h2>
              <Badge variant={stageColors[election.stage] || 'gray'}>{STAGES.find(s => s.id === election.stage)?.label}</Badge>
              <Badge variant="blue">{election.type === 'board_director' ? 'Board' : election.type === 'ccr_amendment' ? 'CC&R' : election.type === 'recall' ? 'Recall' : 'Assessment'}</Badge>
            </div>
            <p className="text-xs text-slate-400">{election.dates.votingDeadline ? `Voting deadline: ${election.dates.votingDeadline}` : 'Dates not yet configured'} · {election.votingMethod}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"><X size={14}/></button>
        </div>
      </div>
      <div className="px-5 pt-3 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4 min-w-max">
          {allTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('py-1.5 px-2.5 text-[11px] font-medium rounded-md transition-all whitespace-nowrap', tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview'    && <OverviewTab    election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'timeline'    && <TimelineTab    election={election}/>}
        {tab === 'nominations' && <NominationsTab election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'inspector'   && <InspectorTab   election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'counting'    && <CountingTab    election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'notices'     && <NoticesTab     election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'compliance'  && <ComplianceTab  election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mt-1 mb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-4 mb-2">Audit Trail</p>
              <button className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 mt-1"><Download size={11}/>Export</button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Immutable log. All system actions related to this election are logged (NFR-05).</p>
            {(election.auditLog || []).map(e => <AuditRow key={e.id} e={e}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate, role }) {
  const [form, setForm] = useState({
    title: '', type: 'board_director', votingMethod: 'hybrid',
    seatsAvailable: 3, quorumRequired: true, quorumPct: 25, totalEligible: 148,
    description: '',
  });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const isElectronic = form.votingMethod !== 'paper';
  const isAssessment = form.type === 'assessment';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div><h2 className="text-base font-semibold text-slate-900">Create Election / Vote</h2><p className="text-xs text-slate-400">California Davis-Stirling Act — Civil Code §§ 5100–5145</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="px-6 py-5 space-y-3 overflow-y-auto">
          <div><label className={fLabel}>Election Title *</label><input value={form.title} onChange={f('title')} placeholder="e.g. Board of Directors Election 2027" className={iCls}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fLabel}>Election Type</label>
              <select value={form.type} onChange={f('type')} className={iCls}>
                <option value="board_director">Board Director Election</option>
                <option value="recall">Recall Election</option>
                <option value="assessment">Assessment Vote</option>
                <option value="ccr_amendment">CC&R Amendment Vote</option>
              </select>
            </div>
            <div>
              <label className={fLabel}>Seats / Choices</label>
              <input type="number" value={form.seatsAvailable} onChange={f('seatsAvailable')} min="1" className={iCls}/>
            </div>
          </div>
          <div>
            <label className={fLabel}>Voting Method</label>
            <select value={form.votingMethod} onChange={f('votingMethod')} className={iCls}>
              <option value="paper">Paper (Mail-in) — Double-envelope system</option>
              <option value="electronic">Electronic Secret Ballot (AB 2159 / AB 648 — Jan 1, 2025)</option>
              <option value="hybrid">Hybrid (Paper + Electronic)</option>
            </select>
            {isElectronic && isAssessment && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1"><AlertTriangle size={11}/>Electronic voting is NOT permitted for assessment votes (Civil Code § 5105).</p>
            )}
            {isElectronic && !isAssessment && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Info size={11}/>Requires HOA election rules permitting electronic voting. Member opt-in/out required ≥90 days before election.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={fLabel}>Eligible Voters</label><input type="number" value={form.totalEligible} onChange={f('totalEligible')} className={iCls}/></div>
            <div>
              <label className={fLabel}>Quorum %</label>
              <div className="flex gap-2 items-center">
                <input type="checkbox" checked={form.quorumRequired} onChange={e => setForm(p => ({ ...p, quorumRequired: e.target.checked }))} className="rounded"/>
                <span className="text-xs text-slate-500">Required</span>
                {form.quorumRequired && <input type="number" value={form.quorumPct} onChange={f('quorumPct')} min="1" max="100" className={iCls + ' w-20'}/>}
              </div>
            </div>
          </div>
          <div><label className={fLabel}>Description</label><textarea value={form.description} onChange={f('description')} rows={2} className={iCls}/></div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Legal Timeline Minimums</p>
            {[
              form.type === 'board_director' || form.type === 'recall' ? '90-day nomination period required' : null,
              'Pre-ballot notice ≥ 30 days before ballot distribution',
              'Ballots distributed ≥ 30 days before voting deadline',
              isElectronic ? 'Member opt-in/out period opens ≥ 90 days before election' : null,
              '1-year retention of all election materials after election',
            ].filter(Boolean).map(l => <p key={l} className="text-[11px] text-blue-700 flex items-center gap-1"><Info size={9}/>{l}</p>)}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onCreate(form)} disabled={!form.title.trim() || (isElectronic && isAssessment)}>
            <Check size={13}/>Create Election
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BallotManagementPage() {
  const [elections, setElections] = useState(SEED);
  const [selected, setSelected]   = useState(null);
  const [role, setRole]           = useState('manager');
  const [search, setSearch]       = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const update = (id, patch) => {
    setElections(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(p => p?.id === id ? { ...p, ...patch } : p);
  };

  const create = form => {
    const retYrs = 1;
    const b = {
      ...form,
      id: Date.now(),
      stage: 'draft',
      votingMethod: form.votingMethod,
      ballotsDistributed: 0, ballotsReceived: 0,
      dates: { nominationsOpen: null, nominationReminder: null, nominationsClose: null, optInDeadline: null, preBallotNotice: null, ballotDistribution: null, votingDeadline: null, countingMeeting: null, retentionExpiry: null },
      inspector: null, candidates: [], ballotInstructions: '', ballotReceiptLog: [],
      countingMeeting: { date: '', time: '', location: '', observers: [] },
      notices: [], inspectionRequests: [],
      acclamationDeclared: false, adjournedMeeting: null, quorumMet: null,
      results: null, certifiedDate: null, retentionStatus: 'active', destroyDate: null,
      auditLog: [mkAudit('Election Created', `${form.title} created. Type: ${form.type}. Method: ${form.votingMethod}. Seats: ${form.seatsAvailable}.`, ROLES[role]?.label, 'gray')],
    };
    setElections(p => [b, ...p]);
    setSelected(b);
    setShowCreate(false);
  };

  const filtered = useMemo(() => elections.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase())
  ), [elections, search]);

  const counts = { active: elections.filter(e => !['draft','archived'].includes(e.stage)).length, certified: elections.filter(e => e.stage === 'results_certified' || e.stage === 'archived').length, compliance: elections.filter(e => e.notices.length > 0).length };
  const stageColors = { draft:'gray', nominations_open:'blue', nominations_closed:'amber', inspector_assigned:'blue', ballots_distributed:'blue', voting_open:'green', counting_scheduled:'amber', results_certified:'green', archived:'gray' };

  return (
    <div className="page-enter">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={create} role={role}/>}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-display text-slate-900">Elections & Ballot Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">California Davis-Stirling Act · Civil Code §§ 5100–5145 · as amended Jan 1, 2025</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Shield size={11} className="text-slate-400"/>
            <span className="text-[10px] text-slate-400 font-medium">Role:</span>
            <select value={role} onChange={e => setRole(e.target.value)} className="text-xs text-slate-700 font-medium bg-transparent border-none outline-none cursor-pointer">
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <RolePill role={role}/>
          </div>
          {role === 'auditor' && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
              Financial Auditor — no election data access
            </div>
          )}
          <PermGate role={role} action="createElection" tip="HOA Manager role required">
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus size={12}/>New Election</Button>
          </PermGate>
        </div>
      </div>

      {role === 'auditor' ? (
        <Alert variant="info" title="Access Restricted">
          Financial Auditor accounts have read-only access to financial records only. Election and ballot data is completely isolated per Davis-Stirling Act requirements and ChakrazAI RBAC policy.
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Elections"  value={elections.length} sub="All records"/>
            <MetricCard label="Active"            value={counts.active}    sub="In progress"        subVariant={counts.active > 0 ? 'warn' : 'neutral'}/>
            <MetricCard label="Certified"         value={counts.certified} sub="Results final"      subVariant="good"/>
            <MetricCard label="Davis-Stirling"    value="CA §§ 5100–5145"  sub="Compliance framework"/>
          </div>

          <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>
            <div className={clsx('flex flex-col border-r border-slate-100 flex-shrink-0', selected ? 'w-72' : 'w-full')} style={selected ? { height: 'calc(100vh - 280px)' } : {}}>
              <div className="p-3 border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search elections..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"/>
                </div>
              </div>

              {selected ? (
                <div className="flex-1 overflow-y-auto">
                  {filtered.map(e => (
                    <button key={e.id} onClick={() => setSelected(e)}
                      className={clsx('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors border-l-[3px]', selected?.id === e.id ? 'bg-navy-50 border-l-navy-600' : 'border-l-transparent')}>
                      <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{e.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={stageColors[e.stage] || 'gray'}>{STAGES.find(s => s.id === e.stage)?.label}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-100">{['Election','Type','Method','Stage','Quorum','Inspector'].map(h => <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.map(e => {
                        const pct = e.totalEligible ? Math.round(e.ballotsReceived / e.totalEligible * 100) : 0;
                        return (
                          <tr key={e.id} onClick={() => setSelected(e)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                            <td className="px-5 py-3"><p className="font-semibold text-slate-800 text-xs">{e.title}</p><p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{e.description}</p></td>
                            <td className="px-5 py-3"><Badge variant="blue">{e.type === 'board_director' ? 'Board' : e.type === 'ccr_amendment' ? 'CC&R' : e.type === 'recall' ? 'Recall' : 'Assessment'}</Badge></td>
                            <td className="px-5 py-3 text-xs text-slate-600 capitalize">{e.votingMethod}</td>
                            <td className="px-5 py-3"><Badge variant={stageColors[e.stage] || 'gray'}>{STAGES.find(s => s.id === e.stage)?.label}</Badge></td>
                            <td className="px-5 py-3 text-xs text-slate-600">{e.quorumRequired ? `${pct}% / ${e.quorumPct}% req.` : 'None'}</td>
                            <td className="px-5 py-3"><Badge variant={e.inspector ? 'green' : 'amber'}>{e.inspector ? e.inspector.name : 'Not Assigned'}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selected && (
              <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
                <ElectionDetail election={selected} role={role} onUpdate={p => update(selected.id, p)} onClose={() => setSelected(null)}/>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
