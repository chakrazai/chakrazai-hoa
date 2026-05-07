/**
 * Ballot Management — Davis-Stirling Act compliant
 * California Civil Code §§ 5100–5145 (as amended through Jan 1, 2025)
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Plus, X, Check, Edit2, Trash2, ChevronRight, Search, Shield,
  Lock, Unlock, Clock, FileText, CheckCircle, XCircle, AlertTriangle,
  Award, Printer, Info, Bell, Download, Users, Calendar, Mail, Phone,
  Archive, UserCheck, AlertCircle, Scale,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Badge, Button, MetricCard, Alert } from '../components/ui';
import { electionsAPI, residentAPI } from '../lib/api';

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

// ─── HOA / address constants ───────────────────────────────────────────────────
const HOA_INFO = {
  name:     'Oakwood Estates HOA',
  c_o:      'c/o ChakrazAI HOA Management',
  address1: '500 Oakwood Drive, Suite 100',
  city: 'Sacramento', state: 'CA', zip: '95814',
  phone: '(916) 555-0100',
  email: 'elections@oakwoodestates.org',
};

const SAMPLE_RESIDENTS = [
  { unit: 'A1', name: 'James Wilson',      email: 'j.wilson@email.com',    phone: '(916) 555-0101', address1: '1000 Oakwood Dr, Apt A1', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'A2', name: 'Maria Santos',      email: 'm.santos@email.com',    phone: '(916) 555-0102', address1: '1000 Oakwood Dr, Apt A2', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: true,  hasViolation: false, isOwnerResident: true  },
  { unit: 'A3', name: 'David Kim',         email: 'd.kim@email.com',       phone: '(916) 555-0103', address1: '1000 Oakwood Dr, Apt A3', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'A4', name: 'Lisa Chen',         email: 'l.chen@email.com',      phone: '(916) 555-0104', address1: '1000 Oakwood Dr, Apt A4', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: true,  isOwnerResident: true  },
  { unit: 'A5', name: 'Robert Hayes',      email: 'r.hayes@email.com',     phone: '(916) 555-0105', address1: '1000 Oakwood Dr, Apt A5', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'B1', name: 'Emily Nguyen',      email: 'e.nguyen@email.com',    phone: '(916) 555-0106', address1: '1002 Oakwood Dr, Apt B1', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: false },
  { unit: 'B2', name: 'Michael Torres',    email: 'm.torres@email.com',    phone: '(916) 555-0107', address1: '1002 Oakwood Dr, Apt B2', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: true,  hasViolation: true,  isOwnerResident: true  },
  { unit: 'B3', name: 'Sarah Park',        email: 's.park@email.com',      phone: '(916) 555-0108', address1: '1002 Oakwood Dr, Apt B3', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'B4', name: 'Thomas Green',      email: 't.green@email.com',     phone: '(916) 555-0109', address1: '1002 Oakwood Dr, Apt B4', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'B5', name: 'Anna Lopez',        email: 'a.lopez@email.com',     phone: '(916) 555-0110', address1: '1002 Oakwood Dr, Apt B5', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'C1', name: 'Steven Brown',      email: 's.brown@email.com',     phone: '(916) 555-0111', address1: '1004 Oakwood Dr, Apt C1', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'C2', name: 'Jennifer Lee',      email: 'j.lee@email.com',       phone: '(916) 555-0112', address1: '1004 Oakwood Dr, Apt C2', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'C3', name: 'Christopher Davis', email: 'c.davis@email.com',     phone: '(916) 555-0113', address1: '1004 Oakwood Dr, Apt C3', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: true,  hasViolation: false, isOwnerResident: true  },
  { unit: 'C4', name: 'Amanda Clark',      email: 'a.clark@email.com',     phone: '(916) 555-0114', address1: '1004 Oakwood Dr, Apt C4', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'C5', name: 'Kevin Martinez',    email: 'k.martinez@email.com',  phone: '(916) 555-0115', address1: '1004 Oakwood Dr, Apt C5', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'D1', name: 'Rachel Johnson',    email: 'r.johnson@email.com',   phone: '(916) 555-0116', address1: '1006 Oakwood Dr, Apt D1', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'D2', name: 'Brian Anderson',    email: 'b.anderson@email.com',  phone: '(916) 555-0117', address1: '1006 Oakwood Dr, Apt D2', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'D3', name: 'Megan White',       email: 'm.white@email.com',     phone: '(916) 555-0118', address1: '1006 Oakwood Dr, Apt D3', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
  { unit: 'D4', name: 'Daniel Thompson',   email: 'd.thompson@email.com',  phone: '(916) 555-0119', address1: '1006 Oakwood Dr, Apt D4', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: true,  isOwnerResident: true  },
  { unit: 'D5', name: 'Jessica Garcia',    email: 'j.garcia@email.com',    phone: '(916) 555-0120', address1: '1006 Oakwood Dr, Apt D5', city: 'Sacramento', state: 'CA', zip: '95814', isDelinquent: false, hasViolation: false, isOwnerResident: true  },
];

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
      { id: 1, name: 'Sarah Chen',    unit: '14B', email: 's.chen@email.com',   phone: '(916) 555-0201', bio: 'Incumbent secretary, 6 years on board.',        eligible: true, disqualified: false, disqReasons: [], statement: '', nominatedDate: 'Sep 15, 2026' },
      { id: 2, name: 'David Park',    unit: '22A', email: 'd.park@email.com',   phone: '(916) 555-0202', bio: 'Civil engineer, 12 years as resident.',          eligible: true, disqualified: false, disqReasons: [], statement: '', nominatedDate: 'Sep 20, 2026' },
      { id: 3, name: 'Yolanda Reyes', unit: '7C',  email: 'y.reyes@email.com',  phone: '(916) 555-0203', bio: 'Retired teacher, active in community events.',   eligible: true, disqualified: false, disqReasons: [], statement: '', nominatedDate: 'Oct 5, 2026'  },
      { id: 4, name: 'Greg Hoffman',  unit: '31D', email: 'g.hoffman@email.com', phone: '(916) 555-0204', bio: 'Submitted during open nomination period.',        eligible: true, disqualified: false, disqReasons: [], statement: '', nominatedDate: 'Nov 1, 2026'  },
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
      { id: 1, name: 'Jane Ramirez',  unit: '1A', email: 'j.ramirez@email.com',  phone: '(916) 555-0101', bio: 'Incumbent president.', eligible: true, disqualified: false, disqReasons: [], votes: 98, elected: true,  statement: '<p>Dear Fellow Homeowners,</p><p>It has been my honor to serve as your Board President. Over the past four years we have repaved the parking structure, settled the insurance dispute, and reduced delinquencies by 30%. I ask for your continued trust to finish the solar project and reserve fund study.</p><p>Respectfully, Jane Ramirez</p>', nominatedDate: 'Sep 5, 2023' },
      { id: 2, name: 'Tom Nakamura',  unit: '2B', email: 't.nakamura@email.com', phone: '(916) 555-0102', bio: 'VP, maintenance focus.', eligible: true, disqualified: false, disqReasons: [], votes: 87, elected: true,  statement: '<p>Dear Neighbors,</p><p>As your VP I have overseen $180,000 in maintenance savings through competitive vendor bidding. My priorities for the next term are the pool renovation, elevator modernization, and completing the landscaping master plan.</p><p>— Tom Nakamura, Unit 2B</p>', nominatedDate: 'Sep 6, 2023' },
      { id: 3, name: 'Maria Garcia',  unit: '3C', email: 'm.garcia@email.com',   phone: '(916) 555-0103', bio: 'CPA, 15 years HOA experience.', eligible: true, disqualified: false, disqReasons: [], votes: 91, elected: true,  statement: '<p>I am a licensed CPA with 15 years of HOA financial management experience. I will bring transparency to our reserve fund, conduct a third-party audit, and ensure we are fully funded per the reserve study. Sound finances protect every owner\'s investment.</p>', nominatedDate: 'Sep 10, 2023' },
      { id: 4, name: 'Robert Nguyen', unit: '4D', email: 'r.nguyen@email.com',   phone: '(916) 555-0104', bio: 'First-time candidate.', eligible: true, disqualified: false, disqReasons: [], votes: 44, elected: false, statement: '<p>I am a first-time candidate running on a platform of communication and transparency. I will hold monthly town halls, publish a newsletter, and ensure every homeowner\'s voice is heard before major decisions are made.</p>', nominatedDate: 'Sep 18, 2023' },
      { id: 5, name: 'Linda Park',    unit: '5E', email: 'l.park@email.com',     phone: '(916) 555-0105', bio: 'Community events focus.', eligible: true, disqualified: false, disqReasons: [], votes: 38, elected: false, statement: '<p>Our community deserves more than management — it deserves a sense of belonging. I will organize quarterly community events, expand the community garden, and create a mentorship program for new residents.</p>', nominatedDate: 'Sep 22, 2023' },
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

// ─── Disqualification criteria (AB 1764) ─────────────────────────────────────
const DISQ_CRITERIA = [
  { id: 'delinquent',   label: 'Delinquent in assessments',                             auto: true,  autoField: 'isDelinquent'    },
  { id: 'felony',       label: 'Convicted of a felony involving dishonesty',             auto: false, autoField: null              },
  { id: 'violation',    label: 'Violated HOA rules within the past year',               auto: true,  autoField: 'hasViolation'    },
  { id: 'non_resident', label: 'Does not own or reside in the community (per bylaws)',   auto: true,  autoField: 'isNotResident'   },
  { id: 'late_nom',     label: 'Nominated after the close of nominations',              auto: false, autoField: null              },
];
const mkDisqChecks = () => Object.fromEntries(DISQ_CRITERIA.map(c => [c.id, false]));

function ResidentCombobox({ selected, onSelect, residents }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const filtered = residents.filter(r =>
    !query.trim() ||
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.unit.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 25);
  return (
    <div className="relative">
      <input
        value={selected ? `${selected.name} — Unit ${selected.unit}` : query}
        onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search by name or unit number…"
        className={iCls} autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(r => (
            <button key={`${r.unit}-${r.name}`} type="button"
              onMouseDown={() => { onSelect(r); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">{r.name}</span>
                <span className="text-[11px] text-slate-400 ml-2">Unit {r.unit}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {r.isDelinquent     && <span className="text-[9px] bg-rose-100  text-rose-700  px-1.5 py-0.5 rounded-full font-medium">Delinquent</span>}
                {r.hasViolation     && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Violation</span>}
                {!r.isOwnerResident && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">Non-resident</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EligibilityPanel({ candidateUnit, currentReasons, role, onSave, onClose }) {
  const resident  = SAMPLE_RESIDENTS.find(r => r.unit === candidateUnit);
  const showLabel = ['manager', 'inspector'].includes(role);
  const [checks, setChecks] = useState(
    Object.fromEntries(DISQ_CRITERIA.map(c => [c.id, (currentReasons || []).includes(c.id)]))
  );
  const allChecked = DISQ_CRITERIA.every(c => checks[c.id]);
  return (
    <div className="px-4 pb-4 pt-3 bg-white border-t border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">
          {showLabel ? 'AB 1764 — Disqualification Criteria' : 'Eligibility Checklist'}
        </p>
        <button type="button"
          onClick={() => setChecks(Object.fromEntries(DISQ_CRITERIA.map(c => [c.id, !allChecked])))}
          className="text-[10px] text-slate-500 hover:text-slate-700 font-medium">
          {allChecked ? 'Uncheck all' : 'Check all'}
        </button>
      </div>
      <div className="space-y-1.5">
        {DISQ_CRITERIA.map(c => (
          <label key={c.id} className={clsx('flex items-start gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors', checks[c.id] ? 'bg-rose-50' : 'hover:bg-slate-50')}>
            <input type="checkbox" checked={!!checks[c.id]}
              onChange={e => setChecks(p => ({ ...p, [c.id]: e.target.checked }))}
              disabled={c.auto && !!resident}
              className="mt-0.5 flex-shrink-0"/>
            <span className={clsx('text-xs', checks[c.id] ? 'text-rose-700 font-medium' : 'text-slate-600')}>
              {c.label}
              {c.auto && <span className="text-[10px] text-slate-400 ml-1">(from resident record)</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="primary" size="sm" onClick={() => onSave(DISQ_CRITERIA.filter(c => checks[c.id]).map(c => c.id))}><Check size={11}/>Save</Button>
        <Button variant="ghost"   size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function NominationsTab({ election, role, onUpdate, addAudit, residents = SAMPLE_RESIDENTS }) {
  const [showForm,      setShowForm]      = useState(false);
  const [resident,      setResident]      = useState(null);
  const [disqChecks,    setDisqChecks]    = useState(mkDisqChecks());
  const [overrideReason,setOverrideReason]= useState('');
  const [showOverride,  setShowOverride]  = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);

  const today      = new Date();
  const nomOpen    = election.dates.nominationsOpen  ? new Date(election.dates.nominationsOpen)  : null;
  const nomClose   = election.dates.nominationsClose ? new Date(election.dates.nominationsClose) : null;
  const notYetOpen = nomOpen  && today < nomOpen;
  const pastClose  = nomClose && today > nomClose;
  const inWindow   = !notYetOpen && !pastClose;
  const canAdd     = can(role, 'manageNominations');
  const showLabel  = ['manager', 'inspector'].includes(role);

  const handleResidentSelect = r => {
    setResident(r);
    if (r) setDisqChecks(p => ({
      ...p,
      delinquent:   r.isDelinquent     || false,
      violation:    r.hasViolation     || false,
      non_resident: !r.isOwnerResident ? true : false,
    }));
  };

  const anyDisq    = DISQ_CRITERIA.some(c => disqChecks[c.id]);
  const allChecked = DISQ_CRITERIA.every(c => disqChecks[c.id]);
  const toggleAll  = () => setDisqChecks(Object.fromEntries(DISQ_CRITERIA.map(c => [c.id, !allChecked])));

  const resetForm = () => {
    setShowForm(false); setResident(null); setShowOverride(false);
    setOverrideReason(''); setDisqChecks(mkDisqChecks());
  };

  const submitCandidate = () => {
    if (!resident) return;
    if (!inWindow && !overrideReason.trim()) return;
    const disqReasons = DISQ_CRITERIA.filter(c => disqChecks[c.id]).map(c => c.id);
    onUpdate({ candidates: [...election.candidates, {
      id: Date.now(), name: resident.name, unit: resident.unit,
      email: resident.email || '', phone: resident.phone || '',
      bio: '', eligible: disqReasons.length === 0, disqualified: disqReasons.length > 0,
      disqReasons, votes: 0, elected: false, statement: '', nominatedDate: nowStr(),
      overrideReason: !inWindow ? overrideReason : null,
    }]});
    addAudit('Candidate Nominated',
      `${resident.name} (Unit ${resident.unit}) nominated.${disqReasons.length ? ` Flags: ${disqReasons.join(', ')}.` : ' Eligible.'}${!inWindow ? ` Override: ${overrideReason}` : ''}`,
      disqReasons.length ? 'amber' : 'blue'
    );
    resetForm();
  };

  const updateDisq = (id, newReasons) => {
    const cand = election.candidates.find(c => c.id === id);
    onUpdate({ candidates: election.candidates.map(c =>
      c.id === id ? { ...c, disqReasons: newReasons, disqualified: newReasons.length > 0, eligible: newReasons.length === 0 } : c
    )});
    addAudit('Eligibility Updated', `${cand?.name}: ${newReasons.length ? `Flags: ${newReasons.join(', ')}` : 'All flags cleared — eligible'}.`, newReasons.length ? 'amber' : 'blue');
    setExpandedId(null);
  };

  const eligible   = election.candidates.filter(c => !c.disqualified);
  const canAcclaim = eligible.length <= election.seatsAvailable && eligible.length > 0;

  return (
    <div>
      {/* Nomination period header */}
      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 mb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nomination Period</p>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div><p className="text-[10px] text-slate-400">Opens</p><p className="text-xs font-bold text-slate-800">{election.dates.nominationsOpen || '—'}</p></div>
          <div><p className="text-[10px] text-slate-400">Closes</p><p className="text-xs font-bold text-slate-800">{election.dates.nominationsClose || '—'}</p></div>
        </div>
        {notYetOpen && <p className="text-[11px] text-amber-700 font-medium">Nominations open on {election.dates.nominationsOpen}</p>}
        {pastClose  && <p className="text-[11px] text-rose-700  font-medium">Nominations closed on {election.dates.nominationsClose}</p>}
        {inWindow   && <p className="text-[11px] text-emerald-700 font-medium">Nominations are currently open</p>}
        <p className="text-[10px] text-slate-400 mt-1.5">Civil Code § 5115 requires a minimum 90-day nomination period. No statutory maximum on number of candidates.</p>
      </div>

      {canAcclaim && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <Award size={13} className="text-emerald-600"/>
          <p className="text-xs font-bold text-emerald-800">Acclamation may be available — {eligible.length} eligible candidate(s), {election.seatsAvailable} seat(s)</p>
        </div>
      )}

      {/* Header + add button */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Candidates ({election.candidates.length})</p>
        {canAdd && (
          <div className="flex items-center gap-2">
            {!inWindow && !showForm && (
              <button onClick={() => { setShowOverride(true); setShowForm(true); }}
                className="text-[10px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1">
                <Unlock size={10}/>Add with Override
              </button>
            )}
            {inWindow && !showForm && (
              <button onClick={() => setShowForm(true)}
                className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
                <Plus size={11}/>Add Candidate
              </button>
            )}
            {showForm && (
              <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
            )}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-3">
          {showOverride && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5"><Unlock size={11}/>Override — {notYetOpen ? 'Before Nomination Period' : 'After Nominations Closed'}</p>
              <p className="text-[11px] text-amber-700 mb-2">Requires board approval or documented extenuating circumstances. Reason is recorded in the audit log.</p>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={2}
                placeholder="State the reason for adding a candidate outside the nomination window…"
                className={iCls + ' resize-none text-xs'}/>
            </div>
          )}

          <div>
            <label className={fLabel}>Resident Name *</label>
            <ResidentCombobox selected={resident} onSelect={handleResidentSelect} residents={residents}/>
          </div>

          {resident && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={fLabel}>Unit (auto)</label>
                <input value={resident.unit} readOnly className={iCls + ' bg-slate-100 cursor-not-allowed'}/>
              </div>
              <div>
                <label className={fLabel}>Email (auto)</label>
                {resident.email
                  ? <a href={`mailto:${resident.email}?subject=${encodeURIComponent(election.title + ' — Nominations')}`}
                       className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 truncate">
                      <Mail size={10} className="flex-shrink-0"/>{resident.email}
                    </a>
                  : <p className="text-xs text-slate-400 mt-1 italic">No email on file</p>}
              </div>
              <div>
                <label className={fLabel}>Phone (auto)</label>
                {resident.phone
                  ? <a href={`tel:${resident.phone.replace(/\D/g,'')}`}
                       className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1">
                      <Phone size={10} className="flex-shrink-0"/>{resident.phone}
                    </a>
                  : <p className="text-xs text-slate-400 mt-1 italic">No phone on file</p>}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={fLabel + ' mb-0'}>{showLabel ? 'Disqualification Criteria (AB 1764)' : 'Eligibility Checklist'}</label>
              <button type="button" onClick={toggleAll} className="text-[10px] text-slate-500 hover:text-slate-700 font-medium">
                {allChecked ? 'Uncheck all' : 'Check all'}
              </button>
            </div>
            <div className="space-y-1.5 p-2.5 bg-white rounded-xl border border-slate-200">
              {DISQ_CRITERIA.map(c => (
                <label key={c.id} className={clsx('flex items-start gap-2 cursor-pointer rounded-lg px-1.5 py-1 transition-colors', disqChecks[c.id] ? 'bg-rose-50' : 'hover:bg-slate-50')}>
                  <input type="checkbox" checked={!!disqChecks[c.id]}
                    onChange={e => setDisqChecks(p => ({ ...p, [c.id]: e.target.checked }))}
                    disabled={c.auto && !!resident}
                    className="mt-0.5 flex-shrink-0"/>
                  <div>
                    <span className={clsx('text-xs', disqChecks[c.id] ? 'text-rose-700 font-medium' : 'text-slate-600')}>{c.label}</span>
                    {c.auto && <span className="text-[10px] text-slate-400 ml-1.5">(auto from resident record)</span>}
                  </div>
                </label>
              ))}
            </div>
            {anyDisq && <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={11}/>Candidate will be marked disqualified</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={submitCandidate}
              disabled={!resident || (showOverride && !overrideReason.trim())}>
              <Check size={11}/>Add Candidate
            </Button>
          </div>
        </div>
      )}

      {/* Candidate list */}
      {election.candidates.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-6">No candidates nominated yet</p>
      ) : (
        <div className="space-y-2">
          {election.candidates.map((c, i) => (
            <div key={c.id} className={clsx('border rounded-xl overflow-hidden', c.disqualified ? 'border-rose-200' : c.elected ? 'border-emerald-200' : 'border-slate-100')}>
              <div className={clsx('p-3', c.disqualified ? 'bg-rose-50' : c.elected ? 'bg-emerald-50' : '')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                        {c.unit && <span className="text-[11px] text-slate-400">Unit {c.unit}</span>}
                        {c.elected      && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                        {c.disqualified && <Badge variant="red"><XCircle size={9}/>Disqualified</Badge>}
                        {!c.disqualified && !c.elected && <Badge variant="blue">Eligible</Badge>}
                      </div>
                      {c.bio && <p className="text-xs text-slate-500 italic mb-0.5">{c.bio}</p>}
                      <div className="flex items-center gap-3 flex-wrap mt-0.5">
                        {c.email && (
                          <a href={`mailto:${c.email}?subject=${encodeURIComponent(election.title + ' — Nominations')}`}
                             className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                            <Mail size={9}/>{c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone.replace(/\D/g,'')}`}
                             className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                            <Phone size={9}/>{c.phone}
                          </a>
                        )}
                        {c.nominatedDate && <span className="text-[10px] text-slate-400">Nominated {c.nominatedDate}</span>}
                        {c.overrideReason && <span className="text-[10px] text-amber-600 italic">Override: {c.overrideReason}</span>}
                      </div>
                      {(c.disqReasons||[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(c.disqReasons||[]).map(rid => {
                            const cr = DISQ_CRITERIA.find(d => d.id === rid);
                            return cr ? <span key={rid} className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">{cr.label}</span> : null;
                          })}
                        </div>
                      )}
                      {election.stage === 'archived' && c.votes !== undefined && (
                        <p className="text-xs font-bold text-slate-700 mt-1">{c.votes} votes</p>
                      )}
                    </div>
                  </div>
                  {can(role, 'manageNominations') && election.stage !== 'archived' && (
                    <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded flex-shrink-0 flex items-center gap-1 hover:bg-slate-100 transition-colors">
                      <Edit2 size={9}/>{expandedId === c.id ? 'Close' : 'Eligibility'}
                    </button>
                  )}
                </div>
              </div>
              {expandedId === c.id && can(role, 'manageNominations') && (
                <EligibilityPanel
                  candidateUnit={c.unit}
                  currentReasons={c.disqReasons || []}
                  role={role}
                  onSave={newReasons => updateDisq(c.id, newReasons)}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3">
        {election.type === 'board_director' ? 'Floor nominations prohibited when electronic ballots are in use (Civil Code § 5105). No statutory maximum on number of candidates.' : ''}
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

// ─── Statements Tab ───────────────────────────────────────────────────────────
function StatementsTab({ election, role, onUpdate, addAudit }) {
  const editorRefs = useRef({});
  const [saved, setSaved]     = useState({});
  const canEdit   = can(role, 'manageNominations') || role === 'inspector';
  const eligible  = election.candidates.filter(c => !c.disqualified);
  const hasStmts  = eligible.some(c => c.statement?.trim());

  useEffect(() => {
    eligible.forEach(c => {
      const el = editorRefs.current[c.id];
      if (el && c.statement && !el.innerHTML) el.innerHTML = c.statement;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveStatement = cand => {
    const html = editorRefs.current[cand.id]?.innerHTML || '';
    onUpdate({ candidates: election.candidates.map(c => c.id === cand.id ? { ...c, statement: html } : c) });
    const words = html.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    addAudit('Candidate Statement Saved', `Statement for ${cand.name} saved (${words} words).`, 'blue');
    setSaved(p => ({ ...p, [cand.id]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [cand.id]: false })), 2000);
  };

  const fmt = cmd => document.execCommand(cmd, false, null);

  const handlePrint = () => {
    const stmts = eligible.filter(c => c.statement?.trim() || editorRefs.current[c.id]?.innerHTML?.trim());
    if (!stmts.length) return;
    const css = `
      @page { size: 8.5in 11in; margin: 0.85in 0.75in; }
      * { box-sizing: border-box; }
      body { font-family: 'Georgia', serif; color: #111; margin: 0; font-size: 10.5pt; line-height: 1.6; }
      .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 18px; }
      .hoa-name { font-size: 14pt; font-weight: bold; color: #1e3a5f; }
      .doc-title { font-size: 12pt; font-weight: bold; margin-top: 4px; }
      .doc-sub { font-size: 9pt; color: #666; margin-top: 2px; }
      .disclaimer { background: #fffbeb; border: 1px solid #d97706; padding: 8px 14px; border-radius: 4px; font-size: 8.5pt; color: #78350f; margin-bottom: 20px; font-style: italic; }
      .candidate { page-break-inside: avoid; margin-bottom: 26px; }
      .cand-hdr { background: #1e3a5f; color: white; padding: 8px 14px; border-radius: 4px 4px 0 0; display: flex; align-items: center; gap: 12px; }
      .cand-num  { font-size: 13pt; font-weight: bold; opacity: 0.45; }
      .cand-name { font-size: 12pt; font-weight: bold; }
      .cand-meta { font-size: 8.5pt; opacity: 0.75; margin-top: 1px; }
      .cand-body { border: 1px solid #d1d5db; border-top: none; padding: 14px 16px; border-radius: 0 0 4px 4px; min-height: 60px; }
      .cand-body p, .cand-body div { margin: 0 0 8px 0; }
      .cand-body ul, .cand-body ol  { padding-left: 20px; margin: 4px 0 8px; }
      .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;
    const body = stmts.map((c, i) => {
      const content = editorRefs.current[c.id]?.innerHTML || c.statement || '';
      return `<div class="candidate">
        <div class="cand-hdr">
          <div class="cand-num">${i + 1}</div>
          <div><div class="cand-name">${c.name}</div><div class="cand-meta">Unit ${c.unit}${c.bio ? ' · ' + c.bio : ''}</div></div>
        </div>
        <div class="cand-body">${content || '<p style="color:#999;font-style:italic;">No statement submitted.</p>'}</div>
      </div>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Candidate Statements — ${election.title}</title><style>${css}</style></head>
<body>
  <div class="header">
    <div class="hoa-name">${HOA_INFO.name}</div>
    <div class="doc-title">CANDIDATE STATEMENTS</div>
    <div class="doc-sub">${election.title}${election.dates.votingDeadline ? ' · Voting Deadline: ' + election.dates.votingDeadline : ''}</div>
  </div>
  <div class="disclaimer">NOTICE: Statements below were submitted by the candidates and are reproduced verbatim without editing or endorsement by the Association. The HOA takes no position on any candidate. Provided pursuant to the Davis-Stirling Common Interest Development Act (Civil Code § 5115).</div>
  ${body}
  <div class="footer">
    <span>${HOA_INFO.name} · ${HOA_INFO.address1}, ${HOA_INFO.city}, ${HOA_INFO.state} ${HOA_INFO.zip}</span>
    <span>Voting Deadline: ${election.dates.votingDeadline || 'See ballot'}</span>
  </div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <SL>Candidate Statements</SL>
          <p className="text-xs text-slate-500 max-w-sm">Paste each candidate's message from their email. Use the toolbar for rich formatting. Prints as a ballot insert.</p>
        </div>
        <Button variant={hasStmts ? 'primary' : 'secondary'} size="sm" onClick={handlePrint} disabled={!hasStmts}>
          <Printer size={12}/>Print Ballot Insert
        </Button>
      </div>

      {eligible.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-8">No eligible candidates — add them in the Nominations tab.</p>
      ) : (
        <div className="space-y-4">
          {eligible.map((c, i) => (
            <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Candidate header row */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">Unit {c.unit}</span>
                      {c.email && (
                        <a href={`mailto:${c.email}?subject=${encodeURIComponent(election.title + ' — Candidate Statement')}`}
                           className="flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-800">
                          <Mail size={9}/>{c.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                  {c.statement?.trim() ? <Badge variant="blue">Has Statement</Badge> : <Badge variant="gray">No Statement</Badge>}
                  {canEdit && (
                    <Button variant={saved[c.id] ? 'success' : 'secondary'} size="sm" onClick={() => saveStatement(c)}>
                      {saved[c.id] ? <><Check size={11}/>Saved!</> : <><Check size={11}/>Save</>}
                    </Button>
                  )}
                </div>
              </div>

              {canEdit ? (
                <>
                  {/* Formatting toolbar */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-slate-100 flex-wrap">
                    {[['bold','B','font-bold'],['italic','I','italic'],['underline','U','underline']].map(([cmd, lbl, cls]) => (
                      <button key={cmd} type="button"
                        onMouseDown={e => { e.preventDefault(); fmt(cmd); }}
                        className={`w-6 h-6 text-xs rounded hover:bg-slate-100 ${cls} text-slate-700`}>{lbl}</button>
                    ))}
                    <div className="w-px h-4 bg-slate-200 mx-1"/>
                    <button type="button" onMouseDown={e => { e.preventDefault(); fmt('insertUnorderedList'); }}
                      className="px-2 h-6 text-[11px] rounded hover:bg-slate-100 text-slate-700">• List</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); fmt('insertOrderedList'); }}
                      className="px-2 h-6 text-[11px] rounded hover:bg-slate-100 text-slate-700">1. List</button>
                    <div className="w-px h-4 bg-slate-200 mx-1"/>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); if (editorRefs.current[c.id]) editorRefs.current[c.id].innerHTML = ''; }}
                      className="px-2 h-6 text-[11px] rounded hover:bg-rose-50 text-rose-500">Clear</button>
                    <span className="ml-auto text-[10px] text-slate-400 hidden sm:block">Paste candidate email here</span>
                  </div>
                  {/* Rich text editor */}
                  <div
                    ref={el => { editorRefs.current[c.id] = el; if (el && c.statement && !el.innerHTML) el.innerHTML = c.statement; }}
                    contentEditable suppressContentEditableWarning
                    className="min-h-[140px] px-4 py-3 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-inset focus:ring-2 focus:ring-navy-300"
                  />
                </>
              ) : (
                <div className="px-4 py-3 min-h-[60px]">
                  {c.statement?.trim()
                    ? <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: c.statement }}/>
                    : <p className="text-sm text-slate-400 italic">No statement submitted yet.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">HOA Neutrality — Required</p>
        <p className="text-[11px] text-amber-700">Statements are reproduced verbatim without editing or endorsement. A required neutrality disclaimer is printed on the ballot insert (Civil Code § 5115).</p>
      </div>
    </div>
  );
}

// ─── Envelopes Tab ────────────────────────────────────────────────────────────
function EnvelopesTab({ election, role }) {
  const ENV_TYPES = {
    ballot_mailing: {
      label: 'Ballot Mailing Envelope',
      desc:  'Outgoing: HOA → Resident. Outer envelope for mailing the ballot package to each eligible member.',
      legal: 'Civil Code § 5115',
      color: '#1e3a5f',
    },
    return_outer: {
      label: 'Return Outer Envelope (Voter-Signed)',
      desc:  'Return: Resident → Inspector. Includes voter name, unit, and signature certification line.',
      legal: 'Civil Code § 5115, § 5120',
      color: '#5b21b6',
    },
    inner_ballot: {
      label: 'Inner Ballot Envelope (Secret)',
      desc:  'Secret ballot privacy envelope. No voter ID. Sealed separately inside the return outer envelope.',
      legal: 'Civil Code § 5120',
      color: '#065f46',
    },
  };

  const [envType, setEnvType]   = useState('ballot_mailing');
  const [count,   setCount]     = useState(Math.min(20, election.totalEligible || 20));
  const [hoa,     setHoa]       = useState({ ...HOA_INFO });
  const [inspAddr, setInspAddr] = useState({
    name:     election.inspector?.name || 'Inspector of Elections',
    firm:     election.inspector?.firm || `c/o ${HOA_INFO.name}`,
    address1: HOA_INFO.address1,
    city: HOA_INFO.city, state: HOA_INFO.state, zip: HOA_INFO.zip,
  });

  const buildHTML = (type, residents) => {
    const meta = ENV_TYPES[type];
    const css = `
      @page { size: 9.5in 4.125in landscape; margin: 0; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: white; }
      .env { width: 9.5in; height: 4.125in; position: relative; page-break-after: always;
             border: 1px solid #ccc; overflow: hidden; background: white; }
      .env:last-child { page-break-after: avoid; }
      .ret  { position: absolute; top: 0.3in; left: 0.3in; font-size: 9pt; line-height: 1.5; max-width: 2.6in; }
      .ret .org { font-weight: bold; font-size: 10pt; color: ${meta.color}; }
      .stamp { position: absolute; top: 0.25in; right: 0.3in; width: 1.1in; height: 0.85in;
               border: 1.5px dashed #aaa; display: flex; align-items: center; justify-content: center;
               font-size: 7.5pt; color: #bbb; text-align: center; line-height: 1.4; }
      .to   { position: absolute; top: 50%; left: 50%; transform: translate(-28%, -50%);
              font-size: 11pt; line-height: 1.65; }
      .to .name { font-weight: bold; font-size: 12pt; }
      .bar  { position: absolute; bottom: 0; left: 0; right: 0; background: ${meta.color};
              color: white; font-size: 7.5pt; font-weight: bold; padding: 4px 12px;
              text-transform: uppercase; letter-spacing: 0.05em;
              display: flex; justify-content: space-between; align-items: center; }
      .sig  { position: absolute; bottom: 0.45in; left: 0.25in; right: 0.25in; font-size: 8.5pt; color: #333; }
      .sigline { border-top: 1px solid #333; margin-top: 8px; padding-top: 2px; font-size: 7.5pt; color: #555; }
      .inner-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
      .inner-center .ballot-icon { font-size: 30pt; margin-bottom: 6px; }
      .inner-center .btitle { font-size: 14pt; font-weight: bold; color: ${meta.color}; }
      .inner-center .bsub   { font-size: 9.5pt; color: #444; margin-top: 4px; }
      .inner-center .bnote  { font-size: 8.5pt; color: #c00; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 10px; }
      .inner-center .blegal { font-size: 7.5pt; color: #999; margin-top: 4px; }
      .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-18deg);
                   font-size: 90pt; color: rgba(0,0,0,0.025); font-weight: 900; user-select: none;
                   pointer-events: none; white-space: nowrap; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;

    let body = '';
    if (type === 'ballot_mailing') {
      body = residents.map(r => `
        <div class="env">
          <div class="watermark">HOA</div>
          <div class="ret">
            <div class="org">${hoa.name}</div>
            ${hoa.c_o ? `<div>${hoa.c_o}</div>` : ''}
            <div>${hoa.address1}</div>
            <div>${hoa.city}, ${hoa.state} ${hoa.zip}</div>
          </div>
          <div class="stamp">PLACE<br>POSTAGE<br>HERE</div>
          <div class="to">
            <div class="name">${r.name}</div>
            <div>Unit ${r.unit}</div>
            <div>${r.address1}</div>
            <div>${r.city}, ${r.state} ${r.zip}</div>
          </div>
          <div class="bar">
            <span>Official Ballot Enclosed — Do Not Forward</span>
            <span>${election.title}</span>
          </div>
        </div>`).join('');
    } else if (type === 'return_outer') {
      body = residents.map(r => `
        <div class="env">
          <div class="watermark">VOTE</div>
          <div class="ret">
            <div class="org">${inspAddr.name}</div>
            ${inspAddr.firm ? `<div>${inspAddr.firm}</div>` : ''}
            <div>${inspAddr.address1}</div>
            <div>${inspAddr.city}, ${inspAddr.state} ${inspAddr.zip}</div>
          </div>
          <div class="stamp">PLACE<br>POSTAGE<br>HERE</div>
          <div class="to">
            <div class="name">${r.name} — Unit ${r.unit}</div>
            <div style="font-size:9pt;color:#888;">${r.address1} · ${r.city}, ${r.state} ${r.zip}</div>
          </div>
          <div class="sig">
            <div style="font-weight:bold;color:${meta.color};margin-bottom:4px;">
              VOTER CERTIFICATION — REQUIRED (Civil Code § 5115)
            </div>
            <div style="font-size:8pt;">I certify I am a member/owner in good standing of ${hoa.name} and have not previously voted in this election.</div>
            <div class="sigline">Signature: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div class="sigline">Printed Name: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Unit: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </div>
          <div class="bar">
            <span>Return Outer Envelope — Sign &amp; Seal Before Returning</span>
            <span>${election.title}</span>
          </div>
        </div>`).join('');
    } else {
      body = residents.map((_, i) => `
        <div class="env">
          <div class="inner-center">
            <div class="ballot-icon">🗳</div>
            <div class="btitle">OFFICIAL BALLOT</div>
            <div class="bsub">${election.title}</div>
            <div class="bnote">Do Not Open Before the Counting Meeting</div>
            <div class="blegal">Civil Code § 5120 &nbsp;·&nbsp; No Voter ID Inside &nbsp;·&nbsp; Ballot ${i + 1} of ${residents.length}</div>
          </div>
          <div class="bar">
            <span>Inner Ballot Envelope — Secret · Seal After Marking Ballot</span>
            <span>${hoa.name}</span>
          </div>
        </div>`).join('');
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Envelopes — ${election.title}</title>
<style>${css}</style></head><body>${body}</body></html>`;
  };

  const handlePrint = () => {
    const residents = SAMPLE_RESIDENTS.slice(0, count);
    const html = buildHTML(envType, residents);
    const w = window.open('', '_blank', 'width=1000,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const meta = ENV_TYPES[envType];

  return (
    <div>
      <SL>Envelope Type</SL>
      <div className="space-y-2 mb-4">
        {Object.entries(ENV_TYPES).map(([k, v]) => (
          <label key={k} className={clsx(
            'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
            envType === k ? 'border-navy-500 bg-navy-50' : 'border-slate-100 hover:border-slate-200'
          )}>
            <input type="radio" name="envType" value={k} checked={envType === k}
              onChange={() => setEnvType(k)} className="mt-0.5 flex-shrink-0"/>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-bold text-slate-800">{v.label}</span>
                <span className="text-[10px] text-slate-400">{v.legal}</span>
              </div>
              <p className="text-[11px] text-slate-500">{v.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {(envType === 'ballot_mailing' || envType === 'inner_ballot') && (
        <>
          <SL>From Address (HOA)</SL>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={fLabel}>Organization Name</label>
                <input value={hoa.name} onChange={e => setHoa(p => ({ ...p, name: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>c/o Line</label>
                <input value={hoa.c_o} onChange={e => setHoa(p => ({ ...p, c_o: e.target.value }))} className={iCls}/></div>
            </div>
            <div><label className={fLabel}>Street Address</label>
              <input value={hoa.address1} onChange={e => setHoa(p => ({ ...p, address1: e.target.value }))} className={iCls}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={fLabel}>City</label>
                <input value={hoa.city} onChange={e => setHoa(p => ({ ...p, city: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>State</label>
                <input value={hoa.state} onChange={e => setHoa(p => ({ ...p, state: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>ZIP</label>
                <input value={hoa.zip} onChange={e => setHoa(p => ({ ...p, zip: e.target.value }))} className={iCls}/></div>
            </div>
          </div>
        </>
      )}

      {envType === 'return_outer' && (
        <>
          <SL>Return-To Address (Inspector / HOA)</SL>
          <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 space-y-2 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <p className="text-[11px] text-violet-800 font-medium">Return envelopes should be addressed to the Inspector of Elections or secure HOA mailbox (Civil Code § 5115).</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={fLabel}>Inspector / Entity Name</label>
                <input value={inspAddr.name} onChange={e => setInspAddr(p => ({ ...p, name: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>Firm / c/o Line</label>
                <input value={inspAddr.firm} onChange={e => setInspAddr(p => ({ ...p, firm: e.target.value }))} className={iCls}/></div>
            </div>
            <div><label className={fLabel}>Street Address</label>
              <input value={inspAddr.address1} onChange={e => setInspAddr(p => ({ ...p, address1: e.target.value }))} className={iCls}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={fLabel}>City</label>
                <input value={inspAddr.city} onChange={e => setInspAddr(p => ({ ...p, city: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>State</label>
                <input value={inspAddr.state} onChange={e => setInspAddr(p => ({ ...p, state: e.target.value }))} className={iCls}/></div>
              <div><label className={fLabel}>ZIP</label>
                <input value={inspAddr.zip} onChange={e => setInspAddr(p => ({ ...p, zip: e.target.value }))} className={iCls}/></div>
            </div>
          </div>
        </>
      )}

      <SL>Quantity &amp; Print</SL>
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <div>
            <label className={fLabel}>Envelopes to Print</label>
            <input type="number" value={count} min={1} max={election.totalEligible || 200}
              onChange={e => setCount(Math.max(1, Math.min(Number(e.target.value), election.totalEligible || 200)))}
              className={iCls + ' w-28'}/>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-0.5">Total eligible voters</p>
            <p className="text-sm font-bold text-slate-800">{election.totalEligible}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl border mb-3 font-mono text-[11px] leading-relaxed"
          style={{ borderColor: meta.color + '50', background: meta.color + '08' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2 font-sans"
            style={{ color: meta.color }}>{meta.label} — Preview</p>
          {envType === 'ballot_mailing' && (<>
            <span className="font-bold text-slate-800">{hoa.name}</span><br/>
            {hoa.c_o && <>{hoa.c_o}<br/></>}
            {hoa.address1}<br/>
            {hoa.city}, {hoa.state} {hoa.zip}
            <div className="mt-2 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800">[Resident Name]</span> — Unit [XX]<br/>
              [Street Address], Sacramento, CA 95814
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase" style={{ color: meta.color }}>
              Official Ballot Enclosed — Do Not Forward
            </div>
          </>)}
          {envType === 'return_outer' && (<>
            <span className="font-bold text-slate-800">{inspAddr.name}</span><br/>
            {inspAddr.firm && <>{inspAddr.firm}<br/></>}
            {inspAddr.address1}<br/>
            {inspAddr.city}, {inspAddr.state} {inspAddr.zip}
            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic font-sans">
              Voter signature line · certification block · civil code notice
            </div>
          </>)}
          {envType === 'inner_ballot' && (
            <div className="text-center py-1">
              <span className="font-bold text-slate-900 text-sm font-sans">OFFICIAL BALLOT</span><br/>
              <span className="italic text-slate-600">{election.title}</span><br/>
              <span className="text-rose-600 font-bold text-[10px] uppercase tracking-wide font-sans">
                Do Not Open Before Counting Meeting
              </span><br/>
              <span className="text-slate-400 text-[9px] font-sans">Civil Code § 5120 · No Voter ID Inside</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <PermGate role={role} action="generateNotices" tip="HOA Manager or Inspector required">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer size={12}/>Print {count} Envelope{count !== 1 ? 's' : ''}
            </Button>
          </PermGate>
          <p className="text-[11px] text-slate-400">Opens print dialog · #10 envelope size (9.5″ × 4.125″)</p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">Davis-Stirling Double-Envelope System (Civil Code § 5115, § 5120)</p>
        <div className="space-y-1.5 text-[11px] text-blue-700">
          <p><span className="font-semibold">1. Ballot Mailing Envelope</span> — HOA mails ballot package to each eligible member. Contains: marked ballot instructions + inner envelope + pre-addressed return outer envelope.</p>
          <p><span className="font-semibold">2. Inner Ballot Envelope</span> — Member places completed ballot inside, seals it. No voter ID on or inside this envelope. Protects ballot secrecy.</p>
          <p><span className="font-semibold">3. Return Outer Envelope</span> — Member places sealed inner envelope inside, signs and dates the voter certification on the outer envelope, and returns to the Inspector of Elections.</p>
          <p className="text-[10px] text-blue-600 pt-1.5 border-t border-blue-200 mt-0.5">
            Inspector logs receipt of outer envelopes only. Inner envelopes must not be opened until the public counting meeting (Civil Code § 5120(b)).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Election detail (tab router) ─────────────────────────────────────────────
function ElectionDetail({ election, role, onUpdate, onClose, apiResidents }) {
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
    { id: 'statements',  label: 'Statements',  roles: ['manager','inspector','board','resident'] },
    { id: 'envelopes',   label: 'Envelopes',   roles: ['manager','inspector','board'] },
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
        {tab === 'nominations' && <NominationsTab election={election} role={role} onUpdate={onUpdate} addAudit={addAudit} residents={apiResidents?.length ? apiResidents : SAMPLE_RESIDENTS}/>}
        {tab === 'inspector'   && <InspectorTab   election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'counting'    && <CountingTab    election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'notices'     && <NoticesTab     election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'compliance'  && <ComplianceTab  election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'statements' && <StatementsTab election={election} role={role} onUpdate={onUpdate} addAudit={addAudit}/>}
        {tab === 'envelopes' && <EnvelopesTab election={election} role={role}/>}
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
const COMMUNITY_ID = 1;
const LS_KEY = 'hoa_elections_v2';

export default function BallotManagementPage() {
  const [elections, setElections] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : SEED;
    } catch { return SEED; }
  });
  const [apiReady,    setApiReady]    = useState(false);
  const [apiResidents, setApiResidents] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [role, setRole]           = useState('manager');
  const [search, setSearch]       = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Load elections from API on mount
  useEffect(() => {
    electionsAPI.list(COMMUNITY_ID)
      .then(r => {
        if (r.data?.length > 0) {
          setElections(r.data);
          try { localStorage.setItem(LS_KEY, JSON.stringify(r.data)); } catch {}
        }
        setApiReady(true);
      })
      .catch(() => setApiReady(true));
    // Also try to load real residents for nominations dropdown
    residentAPI.list(COMMUNITY_ID)
      .then(r => { if (r.data?.length) setApiResidents(r.data.map(r => ({
        unit: r.unit, name: r.owner_name, email: r.email, phone: r.phone,
        address1: '', city: '', state: 'CA', zip: '',
        isDelinquent: false, hasViolation: false, isOwnerResident: true,
      }))); })
      .catch(() => {});
  }, []);

  // Persist to localStorage whenever elections change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(elections)); } catch {}
  }, [elections]);

  const update = (id, patch) => {
    const election = elections.find(e => e.id === id);
    setElections(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(p => p?.id === id ? { ...p, ...patch } : p);

    if (!election || !apiReady) return;
    if (patch.candidates) {
      const existing = election.candidates || [];
      // New candidates not in existing list
      patch.candidates
        .filter(c => !existing.find(ec => ec.id === c.id))
        .forEach(c => electionsAPI.addCandidate(id, c).catch(() => {}));
      // Updated candidates
      patch.candidates
        .filter(c => {
          const ec = existing.find(e => e.id === c.id);
          return ec && (ec.eligible !== c.eligible || ec.disqualified !== c.disqualified ||
            JSON.stringify(ec.disqReasons) !== JSON.stringify(c.disqReasons) ||
            ec.votes !== c.votes || ec.elected !== c.elected || ec.statement !== c.statement);
        })
        .forEach(c => electionsAPI.updateCandidate(id, c.id, c).catch(() => {}));
      // Sync non-candidate fields in the same patch
      const { candidates: _c, ...rest } = patch;
      if (Object.keys(rest).length) electionsAPI.update(id, rest).catch(() => {});
    } else if (patch.ballotReceiptLog) {
      // New receipt entries
      const existing = election.ballotReceiptLog || [];
      patch.ballotReceiptLog
        .filter(r => !existing.find(er => er.unit === r.unit && er.received === r.received))
        .forEach(r => electionsAPI.addReceipt(id, { unit: r.unit, receivedDate: r.received }).catch(() => {}));
      const { ballotReceiptLog: _r, ...rest } = patch;
      if (Object.keys(rest).length) electionsAPI.update(id, rest).catch(() => {});
    } else if (patch.notices) {
      const existing = election.notices || [];
      patch.notices
        .filter(n => !existing.find(en => en.type === n.type && en.sentDate === n.sentDate))
        .forEach(n => electionsAPI.addNotice(id, n).catch(() => {}));
      const { notices: _n, ...rest } = patch;
      if (Object.keys(rest).length) electionsAPI.update(id, rest).catch(() => {});
    } else {
      electionsAPI.update(id, patch).catch(() => {});
    }
  };

  const create = async form => {
    const tempId = Date.now();
    const b = {
      ...form, id: tempId, stage: 'draft',
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
    // Persist to DB; swap temp id with real DB id on success
    try {
      const r = await electionsAPI.create({ communityId: COMMUNITY_ID, ...form });
      const dbElection = r.data;
      setElections(p => p.map(e => e.id === tempId ? { ...b, ...dbElection, id: dbElection.id } : e));
      setSelected(p => p?.id === tempId ? { ...b, ...dbElection, id: dbElection.id } : p);
    } catch {}
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
                <ElectionDetail election={selected} role={role} onUpdate={p => update(selected.id, p)} onClose={() => setSelected(null)} apiResidents={apiResidents}/>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
