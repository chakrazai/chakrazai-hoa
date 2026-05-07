import { useState, useMemo, useEffect } from 'react';
import {
  Users, Vote, CalendarDays, Plus, X, Check, Edit2, Trash2,
  ChevronRight, Phone, Mail, Clock, MapPin, FileText,
  CheckCircle, XCircle, AlertCircle, Activity, Shield,
  Search, BarChart2, User, Printer, Award, ClipboardList, ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Badge, Button, SectionHeader, Tabs, Table, Th, Td, Tr, MetricCard } from '../components/ui';
import { electionsAPI, residentAPI } from '../lib/api';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const iCls = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const selCls = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const fLabel = 'block text-xs font-medium text-slate-500 mb-1';

function SectionLabel({ children }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2">{children}</p>;
}

function Avatar({ name, size = 'md', color = 'bg-navy-700' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={clsx(sz, color, 'rounded-xl flex items-center justify-center flex-shrink-0')}>
      <span className="font-bold text-white">{initials}</span>
    </div>
  );
}

function ActivityLogTable({ log }) {
  if (!log?.length) return <p className="text-sm text-slate-400 italic py-4">No activity recorded</p>;
  return (
    <Table>
      <thead><tr><Th>Date</Th><Th>Action</Th><Th>Details</Th><Th>By</Th></tr></thead>
      <tbody>
        {log.map(e => (
          <Tr key={e.id}>
            <Td className="text-xs text-slate-400 whitespace-nowrap">{e.date}</Td>
            <Td><Badge variant={e.variant || 'gray'}>{e.action}</Badge></Td>
            <Td className="text-xs text-slate-600">{e.details}</Td>
            <Td className="text-xs text-slate-500">{e.by}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BOARD MEMBERS
// ══════════════════════════════════════════════════════════════════════════════

const BOARD_COLORS = ['bg-navy-700','bg-emerald-700','bg-violet-700','bg-amber-700','bg-rose-700','bg-cyan-700','bg-indigo-700'];

const SEED_BOARD = [
  {
    id: 1, name: 'Jane Ramirez', role: 'Board President', email: 'j.ramirez@oakwood.org',
    phone: '(916) 555-0001', termStart: 'Jan 2023', termEnd: 'Dec 2024', status: 'active',
    committees: ['Executive','Finance'], bio: 'Jane has served on the board since 2019 and leads community strategy.',
    activityLog: [
      { id: 1, date: 'May 2, 2026',  action: 'Presided Meeting',  details: 'Annual HOA board meeting Q2',         by: 'System',       variant: 'blue' },
      { id: 2, date: 'Apr 15, 2026', action: 'Vote Cast',         details: 'Approved landscaping budget $12,000', by: 'Jane Ramirez', variant: 'green' },
      { id: 3, date: 'Mar 1, 2026',  action: 'Policy Updated',    details: 'Revised parking enforcement policy',  by: 'Jane Ramirez', variant: 'amber' },
    ],
  },
  {
    id: 2, name: 'Tom Nakamura', role: 'Vice President', email: 't.nakamura@email.com',
    phone: '(916) 555-0883', termStart: 'Jan 2023', termEnd: 'Dec 2024', status: 'active',
    committees: ['Executive','Maintenance'], bio: 'Tom oversees maintenance operations and vendor relations.',
    activityLog: [
      { id: 1, date: 'May 2, 2026',  action: 'Attended Meeting',  details: 'Q2 board meeting — quorum met',        by: 'System',       variant: 'blue' },
      { id: 2, date: 'Apr 10, 2026', action: 'Vendor Approved',   details: 'Greenscape Co. contract renewed',      by: 'Tom Nakamura', variant: 'green' },
    ],
  },
  {
    id: 3, name: 'Maria Garcia', role: 'Treasurer', email: 'm.garcia@email.com',
    phone: '(916) 555-1190', termStart: 'Jan 2024', termEnd: 'Dec 2025', status: 'active',
    committees: ['Finance'], bio: 'Maria manages the HOA budget, dues collection, and financial reporting.',
    activityLog: [
      { id: 1, date: 'May 1, 2026',  action: 'Report Filed',      details: 'Q1 2026 financial statement submitted', by: 'Maria Garcia', variant: 'green' },
      { id: 2, date: 'Apr 5, 2026',  action: 'Delinquent Notice', details: 'Sent notices to 4 delinquent units',    by: 'Maria Garcia', variant: 'amber' },
    ],
  },
  {
    id: 4, name: 'Sarah Chen', role: 'Secretary', email: 's.chen@email.com',
    phone: '(916) 555-0442', termStart: 'Jan 2024', termEnd: 'Dec 2025', status: 'active',
    committees: ['Communications'], bio: 'Sarah maintains meeting minutes, records, and resident communications.',
    activityLog: [
      { id: 1, date: 'May 2, 2026',  action: 'Minutes Filed',     details: 'Q2 board meeting minutes published',    by: 'Sarah Chen',   variant: 'blue' },
      { id: 2, date: 'Mar 20, 2026', action: 'Notice Sent',       details: 'Annual meeting notice to all residents', by: 'Sarah Chen',  variant: 'gray' },
    ],
  },
  {
    id: 5, name: 'Alex Thompson', role: 'Member At Large', email: 'a.thompson@email.com',
    phone: '(916) 555-0101', termStart: 'Jan 2024', termEnd: 'Dec 2025', status: 'active',
    committees: ['Compliance','Maintenance'], bio: 'Alex focuses on compliance enforcement and community standards.',
    activityLog: [
      { id: 1, date: 'Apr 24, 2026', action: 'Inspection',        details: 'Conducted quarterly property inspection', by: 'Alex Thompson', variant: 'blue' },
      { id: 2, date: 'Apr 15, 2026', action: 'Vote Cast',         details: 'Approved violation fine schedule update',  by: 'Alex Thompson', variant: 'green' },
    ],
  },
];

function BoardMemberDetail({ member, color, onUpdate, onClose }) {
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const startEdit = () => { setDraft({ ...member }); setEditing(true); };
  const save = () => { onUpdate(draft); setEditing(false); };
  const d = f => v => setDraft(p => ({ ...p, [f]: v }));

  const tabs = [{ id: 'profile', label: 'Profile' }, { id: 'activity', label: 'Activity Log' }];

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} size="lg" color={color} />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-bold text-slate-900">{member.name}</h2>
                <Badge variant={member.status === 'active' ? 'green' : 'gray'}>{member.status}</Badge>
              </div>
              <p className="text-xs font-medium text-navy-700">{member.role}</p>
              <p className="text-xs text-slate-400">Term: {member.termStart} – {member.termEnd}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={14} /></button>
        </div>
      </div>
      <div className="px-5 pt-3 flex-shrink-0"><Tabs tabs={tabs} activeTab={tab} onChange={setTab} /></div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'profile' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Contact</SectionLabel>
              {editing
                ? <div className="flex gap-1.5"><Button variant="primary" size="sm" onClick={save}><Check size={11}/>Save</Button><Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button></div>
                : <Button variant="ghost" size="sm" onClick={startEdit}><Edit2 size={11}/>Edit</Button>}
            </div>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={fLabel}>Name</label><input value={draft.name} onChange={e => d('name')(e.target.value)} className={iCls}/></div>
                  <div><label className={fLabel}>Role</label>
                    <select value={draft.role} onChange={e => d('role')(e.target.value)} className={selCls}>
                      {['Board President','Vice President','Treasurer','Secretary','Member At Large'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={fLabel}>Email</label><input value={draft.email} onChange={e => d('email')(e.target.value)} className={iCls}/></div>
                <div><label className={fLabel}>Phone</label><input value={draft.phone} onChange={e => d('phone')(e.target.value)} className={iCls}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={fLabel}>Term Start</label><input value={draft.termStart} onChange={e => d('termStart')(e.target.value)} className={iCls}/></div>
                  <div><label className={fLabel}>Term End</label><input value={draft.termEnd} onChange={e => d('termEnd')(e.target.value)} className={iCls}/></div>
                </div>
                <div><label className={fLabel}>Status</label>
                  <select value={draft.status} onChange={e => d('status')(e.target.value)} className={selCls}>
                    <option value="active">Active</option><option value="emeritus">Emeritus</option><option value="resigned">Resigned</option>
                  </select>
                </div>
                <div><label className={fLabel}>Bio</label><textarea value={draft.bio} onChange={e => d('bio')(e.target.value)} rows={3} className={iCls}/></div>
              </div>
            ) : (
              <>
                {[{Icon: Mail, label:'Email', value: member.email},{Icon: Phone, label:'Phone', value: member.phone}].map(({Icon,label,value}) => (
                  <div key={label} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0"><Icon size={13} className="text-slate-400"/></div>
                    <div><p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p><p className="text-sm text-slate-800">{value}</p></div>
                  </div>
                ))}
                <SectionLabel>Committees</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {member.committees.map(c => <Badge key={c} variant="blue">{c}</Badge>)}
                </div>
                <SectionLabel>Bio</SectionLabel>
                <p className="text-sm text-slate-600 leading-relaxed">{member.bio}</p>
              </>
            )}
          </div>
        )}
        {tab === 'activity' && (
          <div className="mt-2"><ActivityLogTable log={member.activityLog} /></div>
        )}
      </div>
    </div>
  );
}

export function BoardMembersPage() {
  const [members, setMembers] = useState(SEED_BOARD);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', role:'Member At Large', email:'', phone:'', termStart:'', termEnd:'', status:'active', committees:[], bio:'' });
  const [search, setSearch] = useState('');

  const update = (id, patch) => {
    setMembers(p => p.map(m => m.id === id ? { ...m, ...patch } : m));
    setSelected(p => p?.id === id ? { ...p, ...patch } : p);
  };
  const remove = id => { setMembers(p => p.filter(m => m.id !== id)); setSelected(null); };
  const add = () => {
    if (!form.name.trim()) return;
    const m = { ...form, id: Date.now(), activityLog: [{ id: 1, date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), action:'Added', details:'Member added to board', by:'Admin', variant:'green' }] };
    setMembers(p => [...p, m]);
    setSelected(m);
    setShowAdd(false);
    setForm({ name:'', role:'Member At Large', email:'', phone:'', termStart:'', termEnd:'', status:'active', committees:[], bio:'' });
  };

  const filtered = useMemo(() => members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  ), [members, search]);

  const activeCount = members.filter(m => m.status === 'active').length;

  return (
    <div className="page-enter">
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Add Board Member</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Name *</label><input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} className={iCls} placeholder="Full name"/></div>
                <div><label className={fLabel}>Role</label>
                  <select value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))} className={selCls}>
                    {['Board President','Vice President','Treasurer','Secretary','Member At Large'].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={fLabel}>Email</label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className={iCls}/></div>
              <div><label className={fLabel}>Phone</label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={iCls}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Term Start</label><input value={form.termStart} onChange={e=>setForm(p=>({...p,termStart:e.target.value}))} placeholder="Jan 2024" className={iCls}/></div>
                <div><label className={fLabel}>Term End</label><input value={form.termEnd} onChange={e=>setForm(p=>({...p,termEnd:e.target.value}))} placeholder="Dec 2025" className={iCls}/></div>
              </div>
              <div><label className={fLabel}>Bio</label><textarea value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} rows={2} className={iCls}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" onClick={add}><Check size={13}/>Add Member</Button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="Board Members" subtitle="Current HOA board, roles, terms and activity"
        action={<Button variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus size={12}/>Add Member</Button>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Members"  value={members.length} sub="Board seats" />
        <MetricCard label="Active"         value={activeCount}    sub="Current term" subVariant="good" />
        <MetricCard label="Terms Expiring" value={members.filter(m=>m.termEnd?.includes('2024')).length} sub="By end of 2024" subVariant="bad" />
        <MetricCard label="Committees"     value={4}              sub="Active committees" />
      </div>

      <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>
        {selected ? (
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100" style={{ height: 'calc(100vh - 260px)' }}>
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((m, i) => (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={clsx('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors border-l-[3px]',
                    selected?.id === m.id ? 'bg-navy-50 border-l-navy-600' : 'border-l-transparent')}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size="sm" color={BOARD_COLORS[i % BOARD_COLORS.length]} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.role}</p>
                    </div>
                    <ChevronRight size={11} className={selected?.id === m.id ? 'text-navy-500' : 'text-slate-300'} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-56"/>
              </div>
            </div>
            <div className="px-5 py-1">
              <Table>
                <thead><tr><Th>Member</Th><Th>Role</Th><Th>Committees</Th><Th>Term</Th><Th>Status</Th><Th></Th></tr></thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <Tr key={m.id} onClick={() => setSelected(m)}>
                      <Td><div className="flex items-center gap-2.5"><Avatar name={m.name} size="sm" color={BOARD_COLORS[i%BOARD_COLORS.length]}/><div><p className="font-semibold text-slate-800 text-xs">{m.name}</p><p className="text-[11px] text-slate-400">{m.email}</p></div></div></Td>
                      <Td className="text-xs text-slate-700 font-medium">{m.role}</Td>
                      <Td><div className="flex flex-wrap gap-1">{m.committees.map(c=><Badge key={c} variant="blue">{c}</Badge>)}</div></Td>
                      <Td className="text-xs text-slate-500">{m.termStart} – {m.termEnd}</Td>
                      <Td><Badge variant={m.status==='active'?'green':'gray'}>{m.status}</Badge></Td>
                      <Td><button onClick={e=>{e.stopPropagation();remove(m.id)}} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={13}/></button></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 260px)' }}>
            <BoardMemberDetail member={selected} color={BOARD_COLORS[members.indexOf(members.find(m=>m.id===selected.id))%BOARD_COLORS.length]}
              onUpdate={p => update(selected.id, p)} onClose={() => setSelected(null)} />
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ELECTIONS
// ══════════════════════════════════════════════════════════════════════════════

const SEED_ELECTIONS = [
  {
    id: 1, title: 'Board of Directors Election 2024', type: 'Board', status: 'closed',
    startDate: 'Nov 1, 2023', endDate: 'Nov 30, 2023', totalEligible: 148, votesCast: 112,
    seatsAvailable: 3, votingMethod: 'Mail-in & Online', certified: true,
    ballotInstructions: 'Vote for up to 3 candidates. Mark the oval completely next to your choice(s). Ballots with more than 3 selections will be voided. Return by November 30, 2023.',
    description: 'Annual election for 3 open board seats. Candidates submitted their bios in October.',
    candidates: [
      { id: 1, name: 'Jane Ramirez',   bio: 'Incumbent president seeking second term.', votes: 98, elected: true },
      { id: 2, name: 'Tom Nakamura',   bio: 'VP focused on maintenance and vendor relations.', votes: 87, elected: true },
      { id: 3, name: 'Maria Garcia',   bio: 'CPA with 15 years of HOA financial experience.', votes: 91, elected: true },
      { id: 4, name: 'Robert Nguyen',  bio: 'Local contractor, first-time candidate.', votes: 44, elected: false },
      { id: 5, name: 'Linda Park',     bio: 'Resident since 2010, focused on community events.', votes: 38, elected: false },
    ],
    activityLog: [
      { id: 1, date: 'Nov 30, 2023', action: 'Election Closed',   details: '112 of 148 eligible residents voted (75.7%)', by: 'System',       variant: 'gray' },
      { id: 2, date: 'Nov 30, 2023', action: 'Results Certified', details: 'Ramirez, Nakamura, Garcia elected',           by: 'Sarah Chen',   variant: 'green' },
      { id: 3, date: 'Nov 1, 2023',  action: 'Voting Opened',     details: 'Online and mail-in ballots accepted',         by: 'System',       variant: 'blue' },
      { id: 4, date: 'Oct 15, 2023', action: 'Candidates Listed', details: '5 candidates approved by elections committee', by: 'Sarah Chen',  variant: 'blue' },
    ],
  },
  {
    id: 2, title: 'Bylaw Amendment Vote 2024', type: 'Bylaw', status: 'closed',
    startDate: 'Mar 1, 2024', endDate: 'Mar 15, 2024', totalEligible: 148, votesCast: 89,
    seatsAvailable: 1, votingMethod: 'Mail-in', certified: true,
    ballotInstructions: 'Vote YES or NO on the proposed bylaw amendment. A two-thirds supermajority of votes cast is required for passage. Return your ballot by March 15, 2024.',
    description: 'Proposed amendment to Section 4.2 — Rental Restrictions. Maximum rental period changed from 30 to 90 days.',
    candidates: [
      { id: 1, name: 'Yes — Approve Amendment', bio: '', votes: 61, elected: true },
      { id: 2, name: 'No — Reject Amendment',   bio: '', votes: 28, elected: false },
    ],
    activityLog: [
      { id: 1, date: 'Mar 15, 2024', action: 'Vote Passed',    details: 'Amendment approved 61-28 (68.5% yes)',    by: 'System',     variant: 'green' },
      { id: 2, date: 'Mar 1, 2024',  action: 'Voting Opened',  details: 'Ballots distributed to all unit owners',  by: 'System',     variant: 'blue' },
      { id: 3, date: 'Feb 20, 2024', action: 'Notice Sent',    details: 'Amendment text mailed to all residents',  by: 'Sarah Chen', variant: 'gray' },
    ],
  },
  {
    id: 3, title: 'Board of Directors Election 2026', type: 'Board', status: 'upcoming',
    startDate: 'Nov 1, 2026', endDate: 'Nov 30, 2026', totalEligible: 148, votesCast: 0,
    seatsAvailable: 3, votingMethod: 'Mail-in & Online', certified: false,
    ballotInstructions: 'Vote for up to 3 candidates. Mark the oval completely next to your choice(s). Ballots with more than 3 selections will be voided.',
    description: 'Upcoming election for 3 board seats. Nominations open September 1 – October 15.',
    candidates: [],
    activityLog: [
      { id: 1, date: 'May 1, 2026', action: 'Election Scheduled', details: 'Annual election dates confirmed by board', by: 'Jane Ramirez', variant: 'blue' },
    ],
  },
];

const electionStatusMap = {
  upcoming: { l: 'Upcoming', c: 'blue' },
  active:   { l: 'Active',   c: 'green' },
  closed:   { l: 'Closed',   c: 'gray' },
};

function BallotView({ election, onUpdate }) {
  const [editingInstr, setEditingInstr] = useState(false);
  const [instrDraft, setInstrDraft] = useState(election.ballotInstructions || '');
  const maxVotes = election.seatsAvailable || 1;

  const handlePrint = () => {
    const content = document.getElementById('ballot-preview-inner');
    if (!content) return;
    const w = window.open('', '_blank', 'width=700,height=900');
    w.document.write(`<!DOCTYPE html><html><head><title>${election.title} — Official Ballot</title>
      <style>
        body{font-family:Georgia,serif;max-width:580px;margin:40px auto;padding:20px;color:#1e293b}
        .ballot-header{background:#1e293b;color:white;padding:20px 24px;text-align:center;border-radius:4px 4px 0 0}
        .ballot-header .super{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8}
        .ballot-header h1{font-size:13px;font-weight:700;margin:4px 0}
        .ballot-header h2{font-size:17px;font-weight:900;margin:2px 0}
        .ballot-header .dates{font-size:10px;color:#94a3b8;margin-top:4px}
        .instructions{background:#fffbeb;border-bottom:2px solid #f59e0b;padding:12px 24px}
        .instructions .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#92400e}
        .instructions p{font-size:11px;color:#78350f;margin:4px 0 0;line-height:1.5}
        .body{padding:20px 24px;border:2px solid #1e293b;border-top:none}
        .section-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}
        .candidate{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px dotted #cbd5e1}
        .bubble{width:20px;height:20px;border-radius:50%;border:2px solid #1e293b;flex-shrink:0;margin-top:2px;background:white}
        .cand-name{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
        .cand-bio{font-size:10px;color:#64748b;font-style:italic;margin-top:3px}
        .writein .bubble{border-color:#94a3b8}
        .writein .label{font-size:11px;color:#94a3b8;font-style:italic}
        .footer{background:#f8fafc;border-top:2px solid #e2e8f0;border:2px solid #1e293b;border-top:none;border-radius:0 0 4px 4px;padding:12px 24px}
        .dashed{border-top:2px dashed #94a3b8;padding-top:10px;text-align:center}
        .dashed .official{font-size:8px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8}
        .dashed .fields{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:#94a3b8}
        .dashed .sig{font-size:10px;color:#94a3b8;margin-top:6px}
        @media print{body{margin:0}}
      </style></head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const saveInstr = () => { onUpdate({ ballotInstructions: instrDraft }); setEditingInstr(false); };

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Official Ballot Preview</SectionLabel>
        <div className="flex items-center gap-3 mb-[-4px]">
          {election.status !== 'closed' && (
            <button onClick={() => { setInstrDraft(election.ballotInstructions || ''); setEditingInstr(v => !v); }}
              className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
              <Edit2 size={11}/>{editingInstr ? 'Cancel' : 'Edit Instructions'}
            </button>
          )}
          <button onClick={handlePrint}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <Printer size={11}/>Print Ballot
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

      <div id="ballot-preview-inner" className="border-2 border-slate-700 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 text-center">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-400">Official Ballot</p>
          <p className="text-xs font-bold mt-1 text-slate-200">Oakwood Estates Homeowners Association</p>
          <p className="text-sm font-black mt-0.5">{election.title}</p>
          <p className="text-[10px] text-slate-400 mt-1">Voting Period: {election.startDate} – {election.endDate}</p>
        </div>

        {/* Instructions */}
        <div className="px-5 py-3 bg-amber-50 border-b-2 border-amber-300">
          <p className="text-[9px] font-black text-amber-900 uppercase tracking-[0.2em]">Voting Instructions</p>
          <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
            {election.ballotInstructions || `Vote for up to ${maxVotes} candidate${maxVotes > 1 ? 's' : ''}. Mark the oval completely next to your choice.`}
          </p>
        </div>

        {/* Ballot body */}
        <div className="px-5 py-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-4">
            {election.type === 'Board'
              ? `Board of Directors — Vote for up to ${maxVotes} Candidate${maxVotes > 1 ? 's' : ''}`
              : election.type === 'Bylaw'
              ? 'Ballot Measure — Vote Yes or No'
              : `${election.type} — ${maxVotes > 1 ? `Vote for up to ${maxVotes}` : 'Vote for one'}`}
          </p>

          {election.candidates.length === 0
            ? <p className="text-sm text-slate-400 italic text-center py-6">No candidates added yet — add candidates in the Candidates tab</p>
            : (
              <div className="space-y-3">
                {election.candidates.map(c => (
                  <div key={c.id} className="flex items-start gap-4">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex-shrink-0 mt-0.5 bg-white" />
                    <div className="flex-1 border-b border-dotted border-slate-200 pb-3">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{c.name}</p>
                      {c.bio && <p className="text-[11px] text-slate-500 mt-0.5 italic">{c.bio}</p>}
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-400 flex-shrink-0 mt-0.5 bg-white" />
                  <div className="flex-1 border-b border-dotted border-slate-200 pb-3">
                    <p className="text-[11px] text-slate-400 italic">Write-in candidate: _________________________________</p>
                  </div>
                </div>
              </div>
            )
          }
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t-2 border-slate-200">
          <div className="border-t-2 border-dashed border-slate-300 pt-3 text-center">
            <p className="text-[8px] text-slate-400 uppercase tracking-[0.2em]">— Do not mark below this line — Official use only —</p>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>Ballot #: ___________</span>
              <span>Unit #: ___________</span>
              <span>Received: ___________</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Voter Signature: _________________________________ Date: ___________</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-2 text-center">
        Voting method: <span className="font-medium">{election.votingMethod || 'Not specified'}</span> · {election.totalEligible} eligible voters
      </p>
    </div>
  );
}

function ResultsEntry({ election, onUpdate }) {
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(election.candidates.map(c => [c.id, c.votes || 0]))
  );
  const [totalCast, setTotalCast] = useState(election.votesCast || 0);
  const [saved, setSaved] = useState(false);

  const totalEntered = Object.values(votes).reduce((s, v) => s + Number(v || 0), 0);
  const seats = election.seatsAvailable || 1;

  const saveDraft = () => {
    const updated = election.candidates.map(c => ({ ...c, votes: Number(votes[c.id] || 0) }));
    onUpdate({ candidates: updated, votesCast: Number(totalCast) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const certify = () => {
    const sorted = [...election.candidates]
      .map(c => ({ ...c, votes: Number(votes[c.id] || 0) }))
      .sort((a, b) => b.votes - a.votes);
    const electedIds = new Set(sorted.slice(0, seats).map(c => c.id));
    const updated = election.candidates.map(c => ({
      ...c, votes: Number(votes[c.id] || 0), elected: electedIds.has(c.id),
    }));
    onUpdate({ candidates: updated, votesCast: Number(totalCast), status: 'closed', certified: true });
  };

  const sorted = [...election.candidates].sort(
    (a, b) => Number(votes[b.id] || 0) - Number(votes[a.id] || 0)
  );

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Enter Vote Tallies</SectionLabel>
        {election.certified && <Badge variant="green"><CheckCircle size={10}/>Certified</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">
          <label className={fLabel}>Total Ballots Cast</label>
          <input type="number" value={totalCast} onChange={e => setTotalCast(e.target.value)}
            className={iCls + ' mt-1'} min="0" max={election.totalEligible} disabled={election.certified}/>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">
          <p className={fLabel}>Turnout</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {election.totalEligible ? `${Math.round(Number(totalCast) / election.totalEligible * 100)}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-400">{totalCast} of {election.totalEligible} eligible</p>
        </div>
      </div>

      {election.candidates.length === 0
        ? <p className="text-sm text-slate-400 italic mb-4">Add candidates in the Candidates tab before entering results.</p>
        : (
          <div className="space-y-2 mb-4">
            {sorted.map((c, rank) => {
              const v = Number(votes[c.id] || 0);
              const pct = totalEntered > 0 ? Math.round(v / totalEntered * 100) : 0;
              const willBeElected = rank < seats;
              return (
                <div key={c.id} className={clsx('p-3 border rounded-xl transition-colors',
                  election.certified && c.elected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-4">#{rank + 1}</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                      {election.certified && c.elected && <Badge variant="green"><Award size={9}/>Elected</Badge>}
                      {!election.certified && totalEntered > 0 && willBeElected && <Badge variant="blue">On track</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      <input type="number" value={votes[c.id] ?? ''} min="0"
                        onChange={e => setVotes(p => ({ ...p, [c.id]: e.target.value }))}
                        disabled={election.certified}
                        className="w-20 px-2 py-1 text-sm text-center bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="0"/>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={clsx('h-1.5 rounded-full transition-all', election.certified && c.elected ? 'bg-emerald-500' : 'bg-navy-600')}
                      style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {!election.certified && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={saveDraft}>
            {saved ? <><Check size={12}/>Saved!</> : 'Save Draft Results'}
          </Button>
          <Button variant="primary" onClick={certify} disabled={election.candidates.length === 0}>
            <Award size={12}/>Certify & Close Election
          </Button>
        </div>
      )}
      {!election.certified && election.candidates.length > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          Certifying will mark the top {seats} vote-getter{seats > 1 ? 's' : ''} as elected and close the election.
        </p>
      )}
    </div>
  );
}

function ElectionDetail({ election, onUpdate, onClose, onBallots, residents = [] }) {
  const [tab, setTab] = useState('overview');
  const [showCandForm, setShowCandForm] = useState(false);
  const [candDraft, setCandDraft] = useState({ name:'', unit:'', email:'', phone:'', bio:'' });
  const existingNames = new Set((election.candidates || []).map(c => c.name));
  const availableResidents = residents.filter(r => !existingNames.has(r.owner_name));

  const selectResident = (ownerName) => {
    const r = residents.find(x => x.owner_name === ownerName);
    setCandDraft(d => ({ ...d, name: ownerName, unit: r?.unit || '', email: r?.email || '', phone: r?.phone || '' }));
  };

  const tabs = [
    { id:'overview',    label:'Overview' },
    { id:'ballot',      label:'Ballot' },
    { id:'candidates',  label:'Candidates' },
    { id:'results',     label:'Results' },
    { id:'activity',    label:'Activity Log' },
  ];
  const totalVotes = election.candidates.reduce((s, c) => s + c.votes, 0);
  const st = electionStatusMap[election.status] || { l: election.status, c: 'gray' };

  const addCandidate = () => {
    if (!candDraft.name.trim()) return;
    onUpdate({ candidates: [...election.candidates, { ...candDraft, id: Date.now(), votes: 0, elected: false }] });
    setCandDraft({ name:'', unit:'', email:'', phone:'', bio:'' });
    setShowCandForm(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><h2 className="text-sm font-bold text-slate-900">{election.title}</h2><Badge variant={st.c}>{st.l}</Badge></div>
            <p className="text-xs text-slate-400">{election.type} · {election.startDate} – {election.endDate}</p>
          </div>
          <div className="flex items-center gap-1">
            {onBallots && <button onClick={onBallots} className="text-xs text-navy-600 hover:text-navy-800 font-medium px-2 py-1 rounded-lg hover:bg-navy-50 transition-colors flex items-center gap-1"><ClipboardList size={11}/>Full Workflow</button>}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={14}/></button>
          </div>
        </div>
      </div>
      <div className="px-5 pt-3 flex-shrink-0"><Tabs tabs={tabs} activeTab={tab} onChange={setTab}/></div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview' && (
          <div>
            <SectionLabel>Description</SectionLabel>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">{election.description}</p>
            <div className="grid grid-cols-2 gap-2 mb-4 mt-3">
              {[
                { label:'Voting Method',   value: election.votingMethod || '—' },
                { label:'Seats Available', value: election.seatsAvailable ?? '—' },
                { label:'Ballot Status',   value: election.certified ? 'Certified' : election.status === 'closed' ? 'Closed' : 'Open' },
                { label:'Candidates',      value: election.candidates.length },
              ].map(({label,value}) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <SectionLabel>Turnout</SectionLabel>
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label:'Eligible Voters', value: election.totalEligible },
                { label:'Votes Cast',      value: election.votesCast },
                { label:'Turnout',         value: election.totalEligible ? `${Math.round(election.votesCast/election.totalEligible*100)}%` : '—' },
              ].map(({label,value}) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {election.status === 'closed' && election.candidates.length > 0 && (
              <>
                <SectionLabel>Final Results</SectionLabel>
                <div className="space-y-2">
                  {[...election.candidates].sort((a,b)=>b.votes-a.votes).map((c,i) => {
                    const tot = election.candidates.reduce((s,x)=>s+x.votes,0);
                    const pct = tot > 0 ? Math.round(c.votes/tot*100) : 0;
                    return (
                      <div key={c.id} className={clsx('flex items-center gap-3 p-2.5 rounded-xl', c.elected ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50')}>
                        <span className="text-xs font-bold text-slate-400 w-4">#{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><span className="text-xs font-semibold text-slate-800">{c.name}</span>{c.elected&&<Badge variant="green"><Award size={9}/>Elected</Badge>}</div>
                          <div className="flex items-center gap-2 mt-1"><div className="flex-1 bg-slate-200 rounded-full h-1"><div className={clsx('h-1 rounded-full',c.elected?'bg-emerald-500':'bg-navy-500')} style={{width:`${pct}%`}}/></div><span className="text-[11px] text-slate-500 flex-shrink-0">{c.votes} ({pct}%)</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
        {tab === 'ballot' && <BallotView election={election} onUpdate={onUpdate}/>}
        {tab === 'results' && <ResultsEntry election={election} onUpdate={onUpdate}/>}
        {tab === 'candidates' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Candidates / Options</SectionLabel>
              {election.status !== 'closed' && (
                <button onClick={() => setShowCandForm(v=>!v)} className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mb-[-4px]">
                  <Plus size={11}/>Add Candidate
                </button>
              )}
            </div>
            {showCandForm && (
              <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
                <div>
                  <label className={fLabel}>Resident</label>
                  {availableResidents.length > 0 ? (
                    <select value={candDraft.name} onChange={e => selectResident(e.target.value)} className={selCls}>
                      <option value="">— Select resident —</option>
                      {availableResidents.map(r => (
                        <option key={r.id} value={r.owner_name}>{r.owner_name} — Unit {r.unit}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={candDraft.name} onChange={e=>setCandDraft(d=>({...d,name:e.target.value}))} className={iCls} placeholder="Full name"/>
                  )}
                </div>
                {candDraft.name && (
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={fLabel}>Unit</label><input value={candDraft.unit} onChange={e=>setCandDraft(d=>({...d,unit:e.target.value}))} className={iCls} placeholder="—"/></div>
                    <div><label className={fLabel}>Email</label><input value={candDraft.email} onChange={e=>setCandDraft(d=>({...d,email:e.target.value}))} className={iCls} placeholder="—"/></div>
                    <div><label className={fLabel}>Phone</label><input value={candDraft.phone} onChange={e=>setCandDraft(d=>({...d,phone:e.target.value}))} className={iCls} placeholder="—"/></div>
                  </div>
                )}
                <div><label className={fLabel}>Bio / Statement</label><textarea value={candDraft.bio} onChange={e=>setCandDraft(d=>({...d,bio:e.target.value}))} rows={2} className={iCls}/></div>
                <div className="flex gap-2"><Button variant="primary" size="sm" onClick={addCandidate}><Check size={11}/>Add</Button><Button variant="ghost" size="sm" onClick={()=>{setShowCandForm(false);setCandDraft({name:'',unit:'',email:'',phone:'',bio:''});}}>Cancel</Button></div>
              </div>
            )}
            <div className="space-y-3">
              {election.candidates.length === 0 && !showCandForm && <p className="text-sm text-slate-400 italic">No candidates yet</p>}
              {election.candidates.map(c => {
                const pct = totalVotes > 0 ? Math.round(c.votes / totalVotes * 100) : 0;
                return (
                  <div key={c.id} className="p-3.5 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        {election.status === 'closed' && c.elected && <Badge variant="green"><CheckCircle size={10}/>Elected</Badge>}
                        {election.status === 'closed' && !c.elected && <Badge variant="gray">Not Elected</Badge>}
                        {election.status !== 'closed' && <Badge variant="blue">Candidate</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      {c.unit  && <span className="text-[11px] text-slate-400">Unit {c.unit}</span>}
                      {c.email && <span className="text-[11px] text-slate-400">{c.email}</span>}
                      {c.phone && <span className="text-[11px] text-slate-400">{c.phone}</span>}
                    </div>
                    {c.bio && <p className="text-xs text-slate-500 mb-2">{c.bio}</p>}
                    {election.status !== 'upcoming' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5"><div className="bg-navy-600 h-1.5 rounded-full transition-all" style={{width:`${pct}%`}}/></div>
                        <span className="text-xs font-semibold text-slate-700 w-16 text-right">{c.votes} votes ({pct}%)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'activity' && <div className="mt-2"><ActivityLogTable log={election.activityLog}/></div>}
      </div>
    </div>
  );
}

const COMMUNITY_ID = 1;
const LS_KEY_GOV = 'hoa_elections_gov_v1';

export function ElectionsPage({ onNavigate }) {
  const [elections, setElections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_GOV)) || SEED_ELECTIONS; } catch { return SEED_ELECTIONS; }
  });
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:'', type:'Board', status:'upcoming', startDate:'', endDate:'', description:'', totalEligible:148, votesCast:0, seatsAvailable:3, votingMethod:'Mail-in & Online', ballotInstructions:'', certified:false, candidates:[], activityLog:[] });
  const [residents, setResidents] = useState([]);

  useEffect(() => {
    residentAPI.list(COMMUNITY_ID).then(res => setResidents(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    electionsAPI.list(COMMUNITY_ID).then(res => {
      const data = res.data.map(e => ({ ...e, activityLog: e.activityLog ?? e.auditLog ?? [] }));
      if (data.length > 0) {
        setElections(data);
        localStorage.setItem(LS_KEY_GOV, JSON.stringify(data));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY_GOV, JSON.stringify(elections));
  }, [elections]);

  const update = async (id, patch) => {
    setElections(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(p => p?.id === id ? { ...p, ...patch } : p);
    try { await electionsAPI.update(id, patch); } catch {}
  };

  const add = async () => {
    if (!form.title.trim()) return;
    const tempId = Date.now();
    const e = { ...form, id: tempId, communityId: COMMUNITY_ID, candidates: [], activityLog: [] };
    setElections(p => [...p, e]);
    setSelected(e);
    setShowAdd(false);
    setForm({ title:'', type:'Board', status:'upcoming', startDate:'', endDate:'', description:'', totalEligible:148, votesCast:0, seatsAvailable:3, votingMethod:'Mail-in & Online', ballotInstructions:'', certified:false, candidates:[], activityLog:[] });
    try {
      const res = await electionsAPI.create({ ...form, communityId: COMMUNITY_ID });
      const created = res.data;
      setElections(p => p.map(el => el.id === tempId ? { ...el, id: created.id } : el));
      setSelected(p => p?.id === tempId ? { ...p, id: created.id } : p);
    } catch {}
  };

  const statusCounts = { upcoming: elections.filter(e=>e.status==='upcoming').length, active: elections.filter(e=>e.status==='active').length, closed: elections.filter(e=>e.status==='closed').length };

  return (
    <div className="page-enter">
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">New Election / Vote</h2>
              <button onClick={()=>setShowAdd(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              <div><label className={fLabel}>Title *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Board Election 2027" className={iCls}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={selCls}>{['Board','Bylaw','Special','Committee'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={fLabel}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={selCls}>{['upcoming','active','closed'].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className={iCls}/></div>
                <div><label className={fLabel}>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} className={iCls}/></div>
              </div>
              <div><label className={fLabel}>Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} className={iCls}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Eligible Voters</label><input type="number" value={form.totalEligible} onChange={e=>setForm(p=>({...p,totalEligible:Number(e.target.value)}))} className={iCls}/></div>
                <div><label className={fLabel}>Seats Available</label><input type="number" value={form.seatsAvailable} onChange={e=>setForm(p=>({...p,seatsAvailable:Number(e.target.value)}))} min="1" className={iCls}/></div>
              </div>
              <div><label className={fLabel}>Voting Method</label>
                <select value={form.votingMethod} onChange={e=>setForm(p=>({...p,votingMethod:e.target.value}))} className={selCls}>
                  {['Mail-in & Online','Mail-in Only','Online Only','In-Person','Hybrid'].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div><label className={fLabel}>Ballot Instructions</label><textarea value={form.ballotInstructions} onChange={e=>setForm(p=>({...p,ballotInstructions:e.target.value}))} rows={2} placeholder={`Vote for up to ${form.seatsAvailable} candidate${form.seatsAvailable>1?'s':''}...`} className={iCls}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" onClick={add}><Check size={13}/>Create</Button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="Elections" subtitle="Board elections, bylaw votes and ballot results"
        action={<Button variant="primary" size="sm" onClick={()=>setShowAdd(true)}><Plus size={12}/>New Election</Button>}/>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Elections" value={elections.length} sub="All time"/>
        <MetricCard label="Upcoming"        value={statusCounts.upcoming} sub="Scheduled" subVariant="good"/>
        <MetricCard label="Active"          value={statusCounts.active}   sub="Voting open" subVariant={statusCounts.active>0?'bad':'good'}/>
        <MetricCard label="Closed"          value={statusCounts.closed}   sub="Completed"/>
      </div>

      <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>
        {selected ? (
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100" style={{ height:'calc(100vh - 260px)' }}>
            <div className="flex-1 overflow-y-auto">
              {elections.map(e => {
                const st = electionStatusMap[e.status] || { l:e.status, c:'gray' };
                return (
                  <button key={e.id} onClick={()=>setSelected(e)}
                    className={clsx('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors border-l-[3px]',
                      selected?.id===e.id ? 'bg-navy-50 border-l-navy-600':'border-l-transparent')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{e.title}</p>
                        <div className="flex items-center gap-1.5 mt-1"><Badge variant={st.c}>{st.l}</Badge><span className="text-[11px] text-slate-400">{e.type}</span></div>
                      </div>
                      <ChevronRight size={11} className={selected?.id===e.id?'text-navy-500':'text-slate-300'}/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Election</Th><Th>Type</Th><Th>Period</Th><Th>Turnout</Th><Th>Status</Th></tr></thead>
              <tbody>
                {elections.map(e => {
                  const st = electionStatusMap[e.status] || { l:e.status, c:'gray' };
                  const pct = e.totalEligible ? Math.round(e.votesCast/e.totalEligible*100) : 0;
                  return (
                    <Tr key={e.id} onClick={()=>setSelected(e)}>
                      <Td><p className="font-semibold text-slate-800 text-xs">{e.title}</p><p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{e.description}</p></Td>
                      <Td><Badge variant="blue">{e.type}</Badge></Td>
                      <Td className="text-xs text-slate-500">{e.startDate} – {e.endDate}</Td>
                      <Td className="text-xs text-slate-600">{e.votesCast} / {e.totalEligible} {e.votesCast>0 && <span className="text-slate-400">({pct}%)</span>}</Td>
                      <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height:'calc(100vh - 260px)' }}>
            <ElectionDetail election={selected} onUpdate={p=>update(selected.id,p)} onClose={()=>setSelected(null)} onBallots={onNavigate ? ()=>onNavigate('ballots') : null} residents={residents}/>
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEETINGS
// ══════════════════════════════════════════════════════════════════════════════

const SEED_MEETINGS = [
  {
    id: 1, title: 'Q2 Board Meeting 2026', type: 'Board', status: 'completed',
    date: 'May 2, 2026', time: '6:00 PM', location: 'Clubhouse — Room A',
    agenda: [
      { id:1, item:'Call to Order', description:'Roll call and quorum confirmation', duration:'5 min' },
      { id:2, item:'Treasurer Report', description:'Q1 financials, dues collection status', duration:'15 min' },
      { id:3, item:'Landscaping Contract Renewal', description:'Review and vote on Greenscape Co. renewal', duration:'20 min' },
      { id:4, item:'Violation Policy Update', description:'Proposed changes to fine schedule', duration:'15 min' },
      { id:5, item:'Open Forum', description:'Resident questions and comments', duration:'20 min' },
    ],
    attendance: [
      { id:1, name:'Jane Ramirez',  role:'Board President',  present:true },
      { id:2, name:'Tom Nakamura',  role:'Vice President',   present:true },
      { id:3, name:'Maria Garcia',  role:'Treasurer',        present:true },
      { id:4, name:'Sarah Chen',    role:'Secretary',        present:true },
      { id:5, name:'Alex Thompson', role:'Member At Large',  present:false },
    ],
    motions: [
      { id:1, motion:'Approve Q1 financial report',           proposedBy:'Maria Garcia', secondedBy:'Tom Nakamura',  result:'Passed' },
      { id:2, motion:'Renew Greenscape Co. contract $12,000', proposedBy:'Tom Nakamura', secondedBy:'Jane Ramirez',  result:'Passed' },
      { id:3, motion:'Adopt updated violation fine schedule',  proposedBy:'Alex Thompson',secondedBy:'Sarah Chen',   result:'Passed' },
    ],
    minutes: 'The Q2 Board Meeting was called to order at 6:05 PM by President Jane Ramirez. Quorum was confirmed with 4 of 5 board members present. The Treasurer presented Q1 financials showing a balanced budget with $42,000 in reserves. All three motions passed unanimously. The meeting was adjourned at 7:48 PM.',
    activityLog: [
      { id:1, date:'May 2, 2026',  action:'Minutes Published', details:'Meeting minutes approved and distributed',   by:'Sarah Chen',   variant:'green' },
      { id:2, date:'May 2, 2026',  action:'Meeting Held',      details:'Quorum met — 4 of 5 members present',       by:'System',       variant:'blue' },
      { id:3, date:'Apr 25, 2026', action:'Notice Sent',       details:'Meeting notice distributed to all residents', by:'Sarah Chen',  variant:'gray' },
      { id:4, date:'Apr 20, 2026', action:'Agenda Published',  details:'Agenda finalized and posted',                by:'Jane Ramirez', variant:'gray' },
    ],
  },
  {
    id: 2, title: 'Annual HOA Meeting 2026', type: 'Annual', status: 'scheduled',
    date: 'Jun 15, 2026', time: '3:00 PM', location: 'Clubhouse — Main Hall',
    agenda: [
      { id:1, item:'Welcome & Roll Call',       description:'Introduction and attendance',           duration:'10 min' },
      { id:2, item:'Annual Financial Report',   description:'Full year budget and reserve fund',      duration:'25 min' },
      { id:3, item:'Community Projects Update', description:'Parking lot resurfacing, pool repairs',  duration:'20 min' },
      { id:4, item:'Resident Q&A',              description:'Open questions from homeowners',         duration:'30 min' },
    ],
    attendance: [
      { id:1, name:'Jane Ramirez',  role:'Board President', present:true },
      { id:2, name:'Tom Nakamura',  role:'Vice President',  present:true },
      { id:3, name:'Maria Garcia',  role:'Treasurer',       present:true },
      { id:4, name:'Sarah Chen',    role:'Secretary',       present:true },
      { id:5, name:'Alex Thompson', role:'Member At Large', present:true },
    ],
    motions: [],
    minutes: '',
    activityLog: [
      { id:1, date:'May 10, 2026', action:'Meeting Scheduled', details:'Annual meeting date confirmed by board', by:'Jane Ramirez', variant:'blue' },
      { id:2, date:'May 12, 2026', action:'Notice Sent',       details:'30-day notice sent to all 148 residents', by:'Sarah Chen', variant:'gray' },
    ],
  },
  {
    id: 3, title: 'Emergency Board Meeting — Roof Repair', type: 'Special', status: 'completed',
    date: 'Mar 18, 2026', time: '7:00 PM', location: 'Virtual (Zoom)',
    agenda: [
      { id:1, item:'Emergency Roof Assessment', description:'Review contractor report on storm damage', duration:'20 min' },
      { id:2, item:'Special Assessment Vote',   description:'Approve $18,000 emergency repair fund',   duration:'25 min' },
    ],
    attendance: [
      { id:1, name:'Jane Ramirez',  role:'Board President', present:true },
      { id:2, name:'Tom Nakamura',  role:'Vice President',  present:true },
      { id:3, name:'Maria Garcia',  role:'Treasurer',       present:true },
      { id:4, name:'Sarah Chen',    role:'Secretary',       present:false },
      { id:5, name:'Alex Thompson', role:'Member At Large', present:true },
    ],
    motions: [
      { id:1, motion:'Approve $18,000 emergency roof repair special assessment', proposedBy:'Jane Ramirez', secondedBy:'Maria Garcia', result:'Passed' },
    ],
    minutes: 'Emergency meeting called to order at 7:08 PM. Board reviewed contractor assessment showing significant storm damage to roofing sections B and C. Special assessment of $18,000 approved 4-0 (Sarah Chen absent). Work to begin within 2 weeks.',
    activityLog: [
      { id:1, date:'Mar 18, 2026', action:'Motion Passed',    details:'$18,000 special assessment approved 4-0',   by:'System',       variant:'green' },
      { id:2, date:'Mar 18, 2026', action:'Meeting Held',     details:'Emergency virtual meeting — 4 of 5 present', by:'System',       variant:'blue' },
      { id:3, date:'Mar 17, 2026', action:'Meeting Called',   details:'Emergency meeting called re: storm damage',   by:'Jane Ramirez', variant:'amber' },
    ],
  },
];

const meetingStatusMap = {
  scheduled:  { l:'Scheduled',  c:'blue' },
  completed:  { l:'Completed',  c:'green' },
  cancelled:  { l:'Cancelled',  c:'red' },
};
const meetingTypeColors = { Board:'blue', Annual:'green', Special:'amber', Committee:'gray' };

function MeetingDetail({ meeting, onUpdate, onClose }) {
  const [tab, setTab] = useState('agenda');
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [showMotionForm, setShowMotionForm] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState({ item:'', description:'', duration:'' });
  const [motionDraft, setMotionDraft] = useState({ motion:'', proposedBy:'', secondedBy:'', result:'Passed' });
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState(meeting.minutes);

  const tabs = [
    { id:'agenda', label:'Agenda' },
    { id:'attendance', label:'Attendance' },
    { id:'motions', label:'Motions' },
    { id:'minutes', label:'Minutes' },
    { id:'activity', label:'Activity Log' },
  ];

  const st = meetingStatusMap[meeting.status] || { l:meeting.status, c:'gray' };
  const presentCount = meeting.attendance.filter(a=>a.present).length;

  const addAgendaItem = () => {
    if (!agendaDraft.item.trim()) return;
    onUpdate({ agenda: [...meeting.agenda, { ...agendaDraft, id:Date.now() }] });
    setAgendaDraft({ item:'', description:'', duration:'' });
    setShowAgendaForm(false);
  };
  const addMotion = () => {
    if (!motionDraft.motion.trim()) return;
    onUpdate({ motions: [...meeting.motions, { ...motionDraft, id:Date.now() }] });
    setMotionDraft({ motion:'', proposedBy:'', secondedBy:'', result:'Passed' });
    setShowMotionForm(false);
  };
  const toggleAttendance = id => onUpdate({ attendance: meeting.attendance.map(a => a.id===id ? { ...a, present:!a.present } : a) });
  const saveMinutes = () => { onUpdate({ minutes:minutesDraft }); setEditingMinutes(false); };

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-slate-900">{meeting.title}</h2>
              <Badge variant={st.c}>{st.l}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><CalendarDays size={11}/>{meeting.date}</span>
              <span className="flex items-center gap-1"><Clock size={11}/>{meeting.time}</span>
              <span className="flex items-center gap-1"><MapPin size={11}/>{meeting.location}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={14}/></button>
        </div>
      </div>
      <div className="px-5 pt-3 flex-shrink-0"><Tabs tabs={tabs} activeTab={tab} onChange={setTab}/></div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'agenda' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Agenda Items</SectionLabel>
              <button onClick={()=>setShowAgendaForm(v=>!v)} className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mb-[-4px]"><Plus size={11}/>Add Item</button>
            </div>
            {showAgendaForm && (
              <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
                <div><label className={fLabel}>Item</label><input value={agendaDraft.item} onChange={e=>setAgendaDraft(d=>({...d,item:e.target.value}))} placeholder="Agenda item title" className={iCls}/></div>
                <div><label className={fLabel}>Description</label><input value={agendaDraft.description} onChange={e=>setAgendaDraft(d=>({...d,description:e.target.value}))} className={iCls}/></div>
                <div><label className={fLabel}>Duration</label><input value={agendaDraft.duration} onChange={e=>setAgendaDraft(d=>({...d,duration:e.target.value}))} placeholder="e.g. 15 min" className={iCls}/></div>
                <div className="flex gap-2"><Button variant="primary" size="sm" onClick={addAgendaItem}><Check size={11}/>Save</Button><Button variant="ghost" size="sm" onClick={()=>setShowAgendaForm(false)}>Cancel</Button></div>
              </div>
            )}
            <div className="space-y-2">
              {meeting.agenda.map((a, i) => (
                <div key={a.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{a.item}</p>
                    {a.description && <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>}
                  </div>
                  {a.duration && <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{a.duration}</span>}
                </div>
              ))}
              {meeting.agenda.length === 0 && !showAgendaForm && <p className="text-sm text-slate-400 italic">No agenda items added</p>}
            </div>
          </div>
        )}
        {tab === 'attendance' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Attendance</SectionLabel>
              <span className="text-xs text-slate-500 mb-[-4px]">{presentCount} / {meeting.attendance.length} present</span>
            </div>
            <div className="space-y-2">
              {meeting.attendance.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.name} size="sm" color={a.present ? 'bg-emerald-700' : 'bg-slate-400'} />
                    <div><p className="text-xs font-semibold text-slate-800">{a.name}</p><p className="text-[11px] text-slate-400">{a.role}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.present ? 'green' : 'gray'}>{a.present ? 'Present' : 'Absent'}</Badge>
                    <button onClick={()=>toggleAttendance(a.id)} className="text-xs text-navy-600 hover:text-navy-800 font-medium underline transition-colors">
                      {a.present ? 'Mark Absent' : 'Mark Present'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'motions' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Motions & Votes</SectionLabel>
              <button onClick={()=>setShowMotionForm(v=>!v)} className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mb-[-4px]"><Plus size={11}/>Add Motion</button>
            </div>
            {showMotionForm && (
              <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
                <div><label className={fLabel}>Motion</label><input value={motionDraft.motion} onChange={e=>setMotionDraft(d=>({...d,motion:e.target.value}))} placeholder="Motion text" className={iCls}/></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={fLabel}>Proposed By</label><input value={motionDraft.proposedBy} onChange={e=>setMotionDraft(d=>({...d,proposedBy:e.target.value}))} className={iCls}/></div>
                  <div><label className={fLabel}>Seconded By</label><input value={motionDraft.secondedBy} onChange={e=>setMotionDraft(d=>({...d,secondedBy:e.target.value}))} className={iCls}/></div>
                </div>
                <div><label className={fLabel}>Result</label>
                  <select value={motionDraft.result} onChange={e=>setMotionDraft(d=>({...d,result:e.target.value}))} className={selCls}>
                    {['Passed','Failed','Tabled','Withdrawn'].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex gap-2"><Button variant="primary" size="sm" onClick={addMotion}><Check size={11}/>Save</Button><Button variant="ghost" size="sm" onClick={()=>setShowMotionForm(false)}>Cancel</Button></div>
              </div>
            )}
            <div className="space-y-3">
              {meeting.motions.length === 0 && !showMotionForm && <p className="text-sm text-slate-400 italic">No motions recorded</p>}
              {meeting.motions.map((m,i) => (
                <div key={m.id} className="p-3.5 border border-slate-100 rounded-xl">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{m.motion}</p>
                    <Badge variant={m.result==='Passed'?'green':m.result==='Failed'?'red':'gray'}>{m.result}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">Proposed by {m.proposedBy} · Seconded by {m.secondedBy}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'minutes' && (
          <div>
            <div className="flex items-center justify-between mt-1">
              <SectionLabel>Meeting Minutes</SectionLabel>
              {editingMinutes
                ? <div className="flex gap-1.5"><Button variant="primary" size="sm" onClick={saveMinutes}><Check size={11}/>Save</Button><Button variant="ghost" size="sm" onClick={()=>setEditingMinutes(false)}>Cancel</Button></div>
                : <Button variant="ghost" size="sm" onClick={()=>{setMinutesDraft(meeting.minutes);setEditingMinutes(true);}}><Edit2 size={11}/>Edit</Button>}
            </div>
            {editingMinutes
              ? <textarea value={minutesDraft} onChange={e=>setMinutesDraft(e.target.value)} rows={12} className={iCls + ' resize-none'} placeholder="Enter meeting minutes..."/>
              : meeting.minutes
                ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{meeting.minutes}</p>
                : <p className="text-sm text-slate-400 italic">No minutes recorded yet</p>}
          </div>
        )}
        {tab === 'activity' && <div className="mt-2"><ActivityLogTable log={meeting.activityLog}/></div>}
      </div>
    </div>
  );
}

export function MeetingsPage() {
  const [meetings, setMeetings] = useState(SEED_MEETINGS);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:'', type:'Board', status:'scheduled', date:'', time:'', location:'', agenda:[], attendance:[], motions:[], minutes:'', activityLog:[] });

  const update = (id, patch) => {
    setMeetings(p => p.map(m => m.id===id ? { ...m, ...patch } : m));
    setSelected(p => p?.id===id ? { ...p, ...patch } : p);
  };
  const add = () => {
    if (!form.title.trim()) return;
    const m = { ...form, id:Date.now(), activityLog:[{ id:1, date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), action:'Meeting Scheduled', details:'New meeting created', by:'Admin', variant:'blue' }] };
    setMeetings(p=>[...p,m]);
    setSelected(m);
    setShowAdd(false);
    setForm({ title:'', type:'Board', status:'scheduled', date:'', time:'', location:'', agenda:[], attendance:[], motions:[], minutes:'', activityLog:[] });
  };

  const upcomingCount = meetings.filter(m=>m.status==='scheduled').length;
  const completedCount = meetings.filter(m=>m.status==='completed').length;

  return (
    <div className="page-enter">
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Schedule Meeting</h2>
              <button onClick={()=>setShowAdd(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              <div><label className={fLabel}>Title *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Q3 Board Meeting 2026" className={iCls}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={selCls}>{['Board','Annual','Special','Committee'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={fLabel}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={selCls}>{['scheduled','completed','cancelled'].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={fLabel}>Date</label><input value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} placeholder="Jun 15, 2026" className={iCls}/></div>
                <div><label className={fLabel}>Time</label><input value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} placeholder="6:00 PM" className={iCls}/></div>
              </div>
              <div><label className={fLabel}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Clubhouse — Room A" className={iCls}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" onClick={add}><Check size={13}/>Schedule</Button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="Meetings" subtitle="Board meetings, agendas, minutes and attendance records"
        action={<Button variant="primary" size="sm" onClick={()=>setShowAdd(true)}><Plus size={12}/>Schedule Meeting</Button>}/>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Meetings"  value={meetings.length}  sub="All time"/>
        <MetricCard label="Upcoming"        value={upcomingCount}    sub="Scheduled" subVariant="good"/>
        <MetricCard label="Completed"       value={completedCount}   sub="With minutes"/>
        <MetricCard label="This Year"       value={meetings.filter(m=>m.date?.includes('2026')).length} sub="2026 meetings"/>
      </div>

      <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>
        {selected ? (
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100" style={{ height:'calc(100vh - 260px)' }}>
            <div className="flex-1 overflow-y-auto">
              {meetings.map(m => {
                const st = meetingStatusMap[m.status] || { l:m.status, c:'gray' };
                return (
                  <button key={m.id} onClick={()=>setSelected(m)}
                    className={clsx('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors border-l-[3px]',
                      selected?.id===m.id?'bg-navy-50 border-l-navy-600':'border-l-transparent')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{m.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{m.date} · {m.time}</p>
                        <div className="flex items-center gap-1.5 mt-1"><Badge variant={st.c}>{st.l}</Badge><Badge variant={meetingTypeColors[m.type]||'gray'}>{m.type}</Badge></div>
                      </div>
                      <ChevronRight size={11} className={selected?.id===m.id?'text-navy-500':'text-slate-300'}/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Meeting</Th><Th>Type</Th><Th>Date & Time</Th><Th>Location</Th><Th>Attendance</Th><Th>Status</Th></tr></thead>
              <tbody>
                {meetings.map(m => {
                  const st = meetingStatusMap[m.status] || { l:m.status, c:'gray' };
                  const present = m.attendance.filter(a=>a.present).length;
                  return (
                    <Tr key={m.id} onClick={()=>setSelected(m)}>
                      <Td><p className="font-semibold text-slate-800 text-xs">{m.title}</p></Td>
                      <Td><Badge variant={meetingTypeColors[m.type]||'gray'}>{m.type}</Badge></Td>
                      <Td><p className="text-xs text-slate-700">{m.date}</p><p className="text-[11px] text-slate-400">{m.time}</p></Td>
                      <Td className="text-xs text-slate-500">{m.location}</Td>
                      <Td className="text-xs text-slate-600">{m.attendance.length > 0 ? `${present} / ${m.attendance.length}` : '—'}</Td>
                      <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height:'calc(100vh - 260px)' }}>
            <MeetingDetail meeting={selected} onUpdate={p=>update(selected.id,p)} onClose={()=>setSelected(null)}/>
          </div>
        )}
      </Card>
    </div>
  );
}
