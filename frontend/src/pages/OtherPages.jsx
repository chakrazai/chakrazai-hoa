// ─── Tax ─────────────────────────────────────────────────────────────────────
import { Download, Receipt } from 'lucide-react';
import { MetricCard, Card, Badge, Alert, Button, SectionHeader, formatCurrency, DateField } from '../components/ui';

const TAX_DOCS = [
  { id:1, name:'Form 1120-H — Federal HOA Return', desc:'Auto-populated from 2025 annual data',   due:'April 15, 2026',   status:'ready'       },
  { id:2, name:'California State HOA Filing',       desc:'CA-specific template pre-built',          due:'April 15, 2026',   status:'ready'       },
  { id:3, name:'Form 1099-NEC (Vendor Payments)',   desc:'6 vendors paid $600+ in FY2025',         due:'January 31, 2026', status:'filed'       },
  { id:4, name:'Homeowner Year-End Statements',     desc:'148 statements generated & distributed', due:'January 31, 2026', status:'distributed' },
];
const stMap = { ready:{l:'Ready to File',c:'blue'}, filed:{l:'E-Filed',c:'green'}, distributed:{l:'Distributed',c:'green'} };

export function Tax() {
  return (
    <div className="page-enter">
      <SectionHeader title="Tax Reports" subtitle="Auto-generated from platform financial data — no manual entry required"
        action={<Button variant="secondary" size="sm"><Download size={12}/>Download All</Button>} />
      <Alert variant="success" title="1099 e-filing complete — all 6 vendors filed by January 31">Form 1120-H auto-populated from 2025 data. Review and file by April 15, 2026.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Form 1120-H"    value="Ready" sub="Due Apr 15, 2026" subVariant="warn" />
        <MetricCard label="State Filing"   value="Ready" sub="Due Apr 15, 2026" subVariant="warn" />
        <MetricCard label="1099-NEC Filed" value="6"     sub="All vendors"      subVariant="good" />
        <MetricCard label="Homeowner Stmts"value="148"   sub="All distributed"  subVariant="good" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Tax Documents — Fiscal Year 2025</h3></div>
        {TAX_DOCS.map(doc => {
          const st = stMap[doc.status] || {l:'Pending',c:'amber'};
          return (
            <div key={doc.id} className="px-5 py-4 border-b border-slate-50 last:border-0 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.status==='ready'?'bg-navy-50':'bg-emerald-50'}`}>
                  <Receipt size={15} className={doc.status==='ready'?'text-navy-600':'text-emerald-600'}/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.desc} · Due: {doc.due}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant={st.c}>{st.l}</Badge>
                {doc.status==='ready' ? <Button variant="primary" size="sm"><Download size={11}/>Download PDF</Button> : <Button variant="ghost" size="sm">View Filed</Button>}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─── Violations ───────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, X, Check } from 'lucide-react';
import { Table, Th, Td, Tr, Tabs } from '../components/ui';
import { violationsAPI, residentAPI as vResidentAPI } from '../lib/api';
import { getCommunityId } from '../lib/community';

const MOCK_VIOLATIONS = [
  { id:1, unit:'Unit 88',  owner:'Laura Kim',     type:'Parking',      description:'Vehicle in fire lane',                fine:75,  issuedDate:'Apr 26', status:'notice_sent'       },
  { id:2, unit:'Unit 21',  owner:'Priya Sharma',  type:'Parking',      description:'Guest spot occupied 7+ days',         fine:50,  issuedDate:'Apr 24', status:'hearing_pending'   },
  { id:3, unit:'Unit 65',  owner:'Tyler Brooks',  type:'Landscaping',  description:'Unapproved front yard modification',  fine:100, issuedDate:'Apr 22', status:'escalated'         },
  { id:4, unit:'Unit 130', owner:'Beth Nguyen',   type:'Landscaping',  description:'Dead landscaping not remedied',       fine:75,  issuedDate:'Apr 18', status:'notice_sent'       },
  { id:5, unit:'Unit 44',  owner:'Carlos Rivera', type:'Noise',        description:'Repeated late-night disturbance',     fine:100, issuedDate:'Apr 15', status:'hearing_scheduled' },
  { id:6, unit:'Unit 77',  owner:'Sandra White',  type:'Modification', description:'Unapproved front door replacement',   fine:100, issuedDate:'Apr 10', status:'under_review'      },
  { id:7, unit:'Unit 3',   owner:'James Okonkwo', type:'Parking',      description:'Inoperable vehicle stored',           fine:75,  issuedDate:'Apr 8',  status:'second_notice'     },
];
const vStMap = { notice_sent:{l:'Notice Sent',c:'amber'}, hearing_pending:{l:'Hearing Pending',c:'amber'}, escalated:{l:'Escalated',c:'red'}, hearing_scheduled:{l:'Hearing Scheduled',c:'red'}, under_review:{l:'Under Review',c:'blue'}, second_notice:{l:'2nd Notice',c:'amber'} };

const iV = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const lV = 'block text-xs font-medium text-slate-500 mb-1';

function useResidents() {
  const { data } = useQuery({ queryKey:['residents-dd'], queryFn:()=>vResidentAPI.list(getCommunityId()).then(r=>r.data), placeholderData:[] });
  return (data || []).map(r => ({ id: r.id, unit: r.unit, name: r.owner_name || r.owner || r.ownerName || '' }));
}

function NewViolationModal({ onSave, onClose }) {
  const residents = useResidents();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ residentId:'', type:'Parking', description:'', fine:75, issuedDate: today });
  const [err, setErr] = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));
  const sel = residents.find(r => String(r.id) === String(form.residentId));

  const handleSave = () => {
    if (!form.residentId) { setErr('Please select a resident'); return; }
    if (!form.description.trim()) { setErr('Description is required'); return; }
    onSave({ communityId: getCommunityId(), residentId: Number(form.residentId), type: form.type,
              description: form.description, fine: form.fine, issuedDate: form.issuedDate,
              unit: sel?.unit || '', owner: sel?.name || '' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">New Violation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className={lV}>Resident <span className="text-rose-500">*</span></label>
            <select value={form.residentId} onChange={e => { set('residentId')(e.target.value); setErr(''); }} className={iV}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.unit} — {r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lV}>Type</label>
              <select value={form.type} onChange={e => set('type')(e.target.value)} className={iV}>
                {['Parking','Landscaping','Noise','Modification','Pet','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lV}>Fine ($) <span className="text-xs text-slate-400">max $100 (CA)</span></label>
              <input type="number" min="0" max="100" value={form.fine} onChange={e => set('fine')(Number(e.target.value))} className={iV} />
            </div>
          </div>
          <div>
            <label className={lV}>Description <span className="text-rose-500">*</span></label>
            <textarea value={form.description} onChange={e => { set('description')(e.target.value); setErr(''); }} rows={3}
              placeholder="Describe the violation..." className={iV + ' resize-none'} />
          </div>
          <div>
            <label className={lV}>Issued Date</label>
            <DateField value={form.issuedDate} onChange={e => set('issuedDate')(e.target.value)} className={iV} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}><Check size={13}/>Issue Violation</Button>
        </div>
      </div>
    </div>
  );
}

export function Violations() {
  const [showModal, setShowModal] = useState(false);
  const [extra, setExtra] = useState([]);
  const { data: list } = useQuery({ queryKey:['violations'], queryFn:()=>violationsAPI.list(1).then(r=>r.data), placeholderData:MOCK_VIOLATIONS });
  const violations = [...(list || MOCK_VIOLATIONS), ...extra];

  const handleSave = async (data) => {
    try {
      const { data: created } = await violationsAPI.create(data);
      setExtra(prev => [...prev, { ...created, unit: data.unit, owner: data.owner, issuedDate: data.issuedDate }]);
    } catch {
      setExtra(prev => [...prev, { ...data, id: Date.now(), status: 'notice_sent' }]);
    }
    setShowModal(false);
  };

  return (
    <div className="page-enter">
      {showModal && <NewViolationModal onSave={handleSave} onClose={() => setShowModal(false)} />}
      <SectionHeader title="Violations" subtitle="Issue legally compliant notices with attorney-reviewed templates"
        action={<Button variant="primary" size="sm" onClick={() => setShowModal(true)}><Plus size={12}/>New Violation</Button>} />
      <Alert variant="warning" title="AB 130 Fine Cap — Action Required">California fines capped at $100/violation. Review fine schedule before sending new notices.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Violations"  value={violations.length} sub="Active" subVariant="warn" />
        <MetricCard label="Hearings This Week" value="2" sub="Apr 30 & May 3" />
        <MetricCard label="Fines Issued (MTD)" value="$575" />
        <MetricCard label="Avg Resolution" value="11 days" sub="Last 30 days" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Open Violations</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Unit</Th><Th>Type</Th><Th>Description</Th><Th>Fine</Th><Th>Issued</Th><Th>Status</Th><Th>Action</Th></tr></thead>
            <tbody>{violations.map(v => {
              const st = vStMap[v.status] || {l:'Open',c:'gray'};
              return (
                <Tr key={v.id}>
                  <Td><p className="font-semibold text-slate-800">{v.unit}</p><p className="text-[11px] text-slate-400">{v.owner}</p></Td>
                  <Td><Badge variant="gray">{v.type}</Badge></Td>
                  <Td className="max-w-[180px]"><p className="text-xs text-slate-600">{v.description}</p></Td>
                  <Td><span className="font-bold">${v.fine}</span></Td>
                  <Td className="text-xs text-slate-400">{v.issuedDate}</Td>
                  <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                  <Td><div className="flex gap-1.5"><Button variant="ghost" size="sm">View</Button>{v.status==='escalated'&&<Button variant="danger" size="sm">Escalate</Button>}</div></Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
import { Wrench } from 'lucide-react';
import { maintenanceAPI } from '../lib/api';

const MOCK_WORK_ORDERS = [
  { id:'WO-089', location:'Pool Area',        issue:'Pump making grinding noise',       priority:'urgent',   vendor:'AquaCare',   status:'scheduled',      sbAlert:null },
  { id:'WO-088', location:'Unit 12 Riser',    issue:'Gas line repair — SB 900 SLA',    priority:'critical', vendor:'ProPlumb',   status:'in_progress',    sbAlert:'14-day deadline: April 29' },
  { id:'WO-087', location:'Building 1 Lobby', issue:'Front door lock malfunction',      priority:'high',     vendor:'SecureLock', status:'in_progress',    sbAlert:null },
  { id:'WO-086', location:'Parking Lot B',    issue:'3 overhead lights non-functional', priority:'normal',   vendor:null,         status:'pending_vendor', sbAlert:null },
  { id:'WO-085', location:'Fitness Center',   issue:'Treadmill #2 — motor failure',     priority:'normal',   vendor:'FitEquip',   status:'parts_ordered',  sbAlert:null },
];
const woStMap = { scheduled:{l:'Scheduled',c:'amber'}, in_progress:{l:'In Progress',c:'blue'}, pending_vendor:{l:'Pending Vendor',c:'gray'}, parts_ordered:{l:'Parts Ordered',c:'navy'}, completed:{l:'Completed',c:'green'} };
const woPrMap = { critical:{l:'Critical',c:'red'}, urgent:{l:'Urgent',c:'red'}, high:{l:'High',c:'amber'}, normal:{l:'Normal',c:'gray'} };

function NewWorkOrderModal({ onSave, onClose }) {
  const residents = useResidents();
  const [form, setForm] = useState({ location:'', reportedBy:'', issue:'', priority:'normal', scheduledDate:'' });
  const [err, setErr] = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = () => {
    if (!form.location.trim()) { setErr('Location is required'); return; }
    if (!form.issue.trim()) { setErr('Issue description is required'); return; }
    onSave({ communityId: getCommunityId(), location: form.location, issue: form.issue,
              priority: form.priority, scheduledDate: form.scheduledDate || null,
              reportedBy: form.reportedBy });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">New Work Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className={lV}>Location <span className="text-rose-500">*</span></label>
            <input value={form.location} onChange={e => { set('location')(e.target.value); setErr(''); }}
              placeholder="e.g. Pool Area, Unit 42, Building 1 Lobby" className={iV} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lV}>Priority</label>
              <select value={form.priority} onChange={e => set('priority')(e.target.value)} className={iV}>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className={lV}>Scheduled Date</label>
              <DateField value={form.scheduledDate} onChange={e => set('scheduledDate')(e.target.value)} className={iV} />
            </div>
          </div>
          <div>
            <label className={lV}>Reported By (Resident)</label>
            <select value={form.reportedBy} onChange={e => set('reportedBy')(e.target.value)} className={iV}>
              <option value="">Select resident (optional)</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.unit} — {r.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lV}>Issue Description <span className="text-rose-500">*</span></label>
            <textarea value={form.issue} onChange={e => { set('issue')(e.target.value); setErr(''); }} rows={3}
              placeholder="Describe the maintenance issue..." className={iV + ' resize-none'} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}><Check size={13}/>Create Work Order</Button>
        </div>
      </div>
    </div>
  );
}

export function Maintenance() {
  const [showModal, setShowModal] = useState(false);
  const [extra, setExtra] = useState([]);
  const { data: list } = useQuery({ queryKey:['maintenance'], queryFn:()=>maintenanceAPI.list(1).then(r=>r.data), placeholderData:MOCK_WORK_ORDERS });
  const orders = [...(list || MOCK_WORK_ORDERS), ...extra];

  const handleSave = async (data) => {
    try {
      const { data: created } = await maintenanceAPI.create(data);
      setExtra(prev => [...prev, { ...created, id: created.wo_number || created.id, location: data.location, issue: data.issue, priority: data.priority, status: 'pending_vendor', vendor: null }]);
    } catch {
      setExtra(prev => [...prev, { ...data, id: `WO-NEW-${Date.now()}`, status: 'pending_vendor', vendor: null }]);
    }
    setShowModal(false);
  };

  return (
    <div className="page-enter">
      {showModal && <NewWorkOrderModal onSave={handleSave} onClose={() => setShowModal(false)} />}
      <SectionHeader title="Maintenance" subtitle="Work orders with SB 900 14-day SLA tracking"
        action={<Button variant="primary" size="sm" onClick={() => setShowModal(true)}><Plus size={12}/>New Work Order</Button>} />
      <Alert variant="danger" title="SB 900 SLA Alert — WO-088 Gas Line Repair">14-day repair deadline is April 29. Confirm vendor has started on-site work.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Requests"  value={orders.filter(w=>w.status!=='completed').length} sub="2 pending vendor" subVariant="warn" />
        <MetricCard label="Avg Resolution" value="4.2 days" sub="Within SLA" subVariant="good" />
        <MetricCard label="Completed (30d)" value="14" />
        <MetricCard label="Spend (30d)"    value="$6,840" sub="4 vendors" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Work Orders</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>ID</Th><Th>Location</Th><Th>Issue</Th><Th>Priority</Th><Th>Vendor</Th><Th>Status</Th></tr></thead>
            <tbody>{orders.map(w => {
              const st = woStMap[w.status]||{l:'Open',c:'gray'};
              const pr = woPrMap[w.priority]||{l:'Normal',c:'gray'};
              return (
                <Tr key={w.id}>
                  <Td><span className="font-mono text-xs text-slate-500">{w.id}</span></Td>
                  <Td><span className="text-xs font-medium">{w.location}</span></Td>
                  <Td className="max-w-[200px]">
                    <p className="text-xs text-slate-600">{w.issue}</p>
                    {w.sbAlert&&<p className="text-[10px] text-rose-600 font-semibold mt-0.5">{w.sbAlert}</p>}
                  </Td>
                  <Td><Badge variant={pr.c}>{pr.l}</Badge></Td>
                  <Td className={`text-xs ${w.vendor?'text-slate-600':'text-amber-600 font-semibold'}`}>{w.vendor||'Unassigned'}</Td>
                  <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
import { vendorAPI, invoiceAPI as vInvoiceAPI } from '../lib/api';
import { CheckCircle, Clock, Circle, CreditCard as VCreditCard, ChevronUp, ChevronDown as ChevDown2 } from 'lucide-react';

// ─── Vendor Invoice helpers (shared data with FinancialsPage via localStorage) ─

const INV_LS_KEY = 'hoa_invoices_v1';
function invLsGet() { try { return JSON.parse(localStorage.getItem(INV_LS_KEY) || '[]'); } catch { return []; } }
function invLsSave(list) { try { localStorage.setItem(INV_LS_KEY, JSON.stringify(list.slice(0, 500))); } catch {} }

const VENDOR_MOCK_INVOICES = [
  { id:'INV-001', vendor:'Greenscape Landscaping', category:'Landscaping', invoiceNumber:'GS-2026-041', invoiceDate:'May 2, 2026', dueDate:'May 15, 2026', amount:4200, description:'April 2026 landscaping services — 4 visits, mowing, trimming, seasonal planting', status:'unpaid', doc:null, payments:[] },
  { id:'INV-002', vendor:'AquaCare Pool Services', category:'Pool & Spa', invoiceNumber:'AQ-2026-051', invoiceDate:'May 1, 2026', dueDate:'Jun 1, 2026', amount:1800, description:'May 2026 pool & spa maintenance — 8 visits, chemical balancing', status:'unpaid', doc:null, payments:[] },
  { id:'INV-003', vendor:'ProPlumb Emergency', category:'Plumbing', invoiceNumber:'PP-2026-0418', invoiceDate:'Apr 19, 2026', dueDate:'May 19, 2026', amount:1840, description:'Emergency main water line repair Apr 18 — labor $960, materials $580, after-hours surcharge $300', status:'paid', doc:null, payments:[{ id:'PAY-001', date:'Apr 28, 2026', amount:1840, method:'Check', ref:'#4521', note:'Full payment — check mailed Apr 27' }] },
  { id:'INV-004', vendor:'SecureWatch Security', category:'Security', invoiceNumber:'SW-2026-MAY', invoiceDate:'May 1, 2026', dueDate:'May 15, 2026', amount:3200, description:'May 2026 security guard services + camera monitoring', status:'partial', doc:null, payments:[{ id:'PAY-002', date:'May 5, 2026', amount:1600, method:'ACH', ref:'ACH-8821', note:'First installment — 50%' }] },
  { id:'INV-005', vendor:'Greenscape Landscaping', category:'Landscaping', invoiceNumber:'GS-2026-031', invoiceDate:'Apr 1, 2026', dueDate:'Apr 15, 2026', amount:4200, description:'March 2026 landscaping services — 4 visits', status:'paid', doc:null, payments:[{ id:'PAY-003', date:'Apr 8, 2026', amount:4200, method:'Check', ref:'#4498', note:'Full payment' }] },
  { id:'INV-006', vendor:'PaintRight Contractors', category:'Painting & General', invoiceNumber:'PR-2026-002', invoiceDate:'Apr 15, 2026', dueDate:'May 1, 2026', amount:6000, description:'Building A exterior painting — Phase 1 deposit (50%) + Phase 2 progress payment', status:'partial', doc:null, payments:[{ id:'PAY-004', date:'Apr 20, 2026', amount:3000, method:'Check', ref:'#4510', note:'50% deposit per contract' }, { id:'PAY-005', date:'May 1, 2026', amount:2000, method:'ACH', ref:'ACH-9103', note:'Progress payment — Phase 2 milestone' }] },
  { id:'INV-007', vendor:'AquaCare Pool Services', category:'Pool & Spa', invoiceNumber:'AQ-2026-041', invoiceDate:'Apr 1, 2026', dueDate:'May 1, 2026', amount:1800, description:'April 2026 pool & spa maintenance — partial payment pending COI resolution', status:'overdue', doc:null, payments:[{ id:'PAY-006', date:'Apr 25, 2026', amount:900, method:'ACH', ref:'ACH-8740', note:'Partial — holding balance pending COI renewal confirmation' }] },
  { id:'INV-008', vendor:'SecureLock Inc.', category:'Locksmith & Gates', invoiceNumber:'SL-2026-Q1', invoiceDate:'Mar 31, 2026', dueDate:'Apr 15, 2026', amount:1700, description:'Q1 2026 gate PM (2 visits) + 12 new FOB programming + 1 emergency lockout', status:'paid', doc:null, payments:[{ id:'PAY-007', date:'Apr 10, 2026', amount:1700, method:'Check', ref:'#4505', note:'Full payment' }] },
  { id:'INV-009', vendor:'Metro Collection Group', category:'Collections', invoiceNumber:'MCG-2026-Q1', invoiceDate:'Apr 1, 2026', dueDate:'Apr 30, 2026', amount:630, description:'Q1 2026 collections services — 15% contingency on $4,200 collected', status:'paid', doc:null, payments:[{ id:'PAY-008', date:'Apr 22, 2026', amount:630, method:'ACH', ref:'ACH-8801', note:'Full payment' }] },
  { id:'INV-010', vendor:'SecureWatch Security', category:'Security', invoiceNumber:'SW-2026-APR', invoiceDate:'Apr 1, 2026', dueDate:'Apr 15, 2026', amount:3200, description:'April 2026 security guard services + camera monitoring', status:'paid', doc:null, payments:[{ id:'PAY-009', date:'Apr 12, 2026', amount:2000, method:'Check', ref:'#4502', note:'First installment' }, { id:'PAY-010', date:'Apr 20, 2026', amount:1200, method:'ACH', ref:'ACH-8720', note:'Balance — second and final installment' }] },
];

function vPaidAmt(inv) { return inv.payments.reduce((s, p) => s + p.amount, 0); }
function vBal(inv) { return Math.max(0, inv.amount - vPaidAmt(inv)); }
function vStatus(inv) { const p = vPaidAmt(inv); if (p >= inv.amount) return 'paid'; if (p > 0) return inv.status === 'overdue' ? 'overdue' : 'partial'; return inv.status; }

const V_STATUS_META = {
  paid:    { label: 'Paid',    color: 'green', Icon: CheckCircle },
  partial: { label: 'Partial', color: 'blue',  Icon: Clock },
  unpaid:  { label: 'Unpaid',  color: 'amber', Icon: Circle },
  overdue: { label: 'Overdue', color: 'red',   Icon: AlertTriangle },
};
const V_PMETHODS = ['Check', 'ACH', 'Wire Transfer', 'Credit Card', 'Zelle', 'Cash'];
const V_CATEGORIES = ['Landscaping','Pool & Spa','Plumbing','Security','Painting & General','Collections','Locksmith & Gates','Electrical','HVAC','Insurance','Utilities','Administrative','Other'];

function VMethodBadge({ method }) {
  const c = { Check:'bg-slate-100 text-slate-700', ACH:'bg-blue-50 text-blue-700', 'Wire Transfer':'bg-purple-50 text-purple-700', 'Credit Card':'bg-rose-50 text-rose-700', Zelle:'bg-violet-50 text-violet-700', Cash:'bg-green-50 text-green-700' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold', c[method] || 'bg-slate-100 text-slate-700')}>
      {method === 'Check' && <FileText size={9}/>}
      {(method === 'ACH' || method === 'Wire Transfer') && <Building2 size={9}/>}
      {(method === 'Credit Card' || method === 'Zelle') && <VCreditCard size={9}/>}
      {method}
    </span>
  );
}

function VRecordPayPanel({ invoice, onSave, onClose }) {
  const rem = vBal(invoice);
  const [form, setForm] = useState({ date: '', amount: String(rem), method: 'Check', ref: '', note: '' });
  const [err, setErr] = useState('');
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const iV2 = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
  const save = () => {
    if (!form.date) { setErr('Date required'); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
    if (amt > rem + 0.01) { setErr(`Exceeds balance of ${formatCurrency(rem)}`); return; }
    onSave({ id:`PAY-${Date.now()}`, date: new Date(form.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), amount: amt, method: form.method, ref: form.ref, note: form.note });
  };
  return (
    <div className="mt-3 p-4 bg-navy-50 border border-navy-100 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-navy-900">Record Payment — Balance: {formatCurrency(rem)}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
      </div>
      {err && <p className="text-[11px] text-rose-600 font-medium">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Date *</label><DateField value={form.date} onChange={e => f('date')(e.target.value)} className={iV2}/></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Amount ($) *</label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => f('amount')(e.target.value)} className={iV2}/></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Method</label><select value={form.method} onChange={e => f('method')(e.target.value)} className={iV2}>{V_PMETHODS.map(m => <option key={m}>{m}</option>)}</select></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">{form.method === 'Check' ? 'Check #' : 'Reference'}</label><input value={form.ref} onChange={e => f('ref')(e.target.value)} className={iV2} placeholder={form.method === 'Check' ? '#1234' : 'ACH-00123'}/></div>
        <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Note</label><input value={form.note} onChange={e => f('note')(e.target.value)} className={iV2} placeholder="e.g. First installment, final payment…"/></div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
        <button onClick={save} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors">
          <VCreditCard size={11}/>Save Payment
        </button>
      </div>
    </div>
  );
}

function VInvoiceRow({ invoice, onPaymentAdded }) {
  const [expanded, setExpanded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [payments, setPayments] = useState(invoice.payments);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const bal  = Math.max(0, invoice.amount - paid);
  const rawSt = paid >= invoice.amount ? 'paid' : paid > 0 ? 'partial' : invoice.status;
  const meta  = V_STATUS_META[rawSt] || V_STATUS_META.unpaid;
  const pct   = Math.min(100, invoice.amount > 0 ? Math.round(paid / invoice.amount * 100) : 0);
  const handlePay = pay => { const next = [...payments, pay]; setPayments(next); onPaymentAdded(invoice.id, next, pay); setRecording(false); };
  const fakeInv = { ...invoice, payments, amount: invoice.amount };

  return (
    <div className={clsx('border-b border-slate-50 last:border-0 transition-colors', expanded && 'bg-slate-50/60')}>
      <div className="px-5 py-3 flex items-center gap-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? <ChevronUp size={13}/> : <ChevDown2 size={13}/>}
        </button>
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.color==='green'?'bg-emerald-50':meta.color==='red'?'bg-rose-50':meta.color==='blue'?'bg-blue-50':'bg-amber-50')}>
          <meta.Icon size={13} className={clsx(meta.color==='green'?'text-emerald-600':meta.color==='red'?'text-rose-500':meta.color==='blue'?'text-blue-600':'text-amber-500')}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs font-semibold text-slate-800">{invoice.invoiceNumber}</p>
            <Badge variant="gray">{invoice.category}</Badge>
          </div>
          <p className="text-[11px] text-slate-400">Issued {invoice.invoiceDate} · Due {invoice.dueDate}</p>
          {invoice.description && <p className="text-[11px] text-slate-500 truncate mt-0.5">{invoice.description}</p>}
        </div>
        {paid > 0 && bal > 0 && (
          <div className="w-20 flex-shrink-0">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5"><div className="h-full bg-blue-500 rounded-full" style={{ width:`${pct}%` }}/></div>
            <p className="text-[10px] text-slate-400 text-right">{pct}%</p>
          </div>
        )}
        <div className="text-right flex-shrink-0 min-w-[80px]">
          <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
          {bal > 0 && <p className="text-[11px] text-rose-600 font-semibold">Bal: {formatCurrency(bal)}</p>}
          {bal === 0 && paid > 0 && <p className="text-[11px] text-emerald-600 font-semibold">Paid in full</p>}
        </div>
        <Badge variant={meta.color}>{meta.label}</Badge>
        {bal > 0 && <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); setExpanded(true); setRecording(true); }}>+ Pay</Button>}
        {bal === 0 && <span className="text-xs text-emerald-600 font-semibold">✓</span>}
      </div>
      {expanded && (
        <div className="px-12 pb-4 space-y-3">
          {invoice.description && <div className="text-xs text-slate-600 bg-white border border-slate-100 rounded-lg px-3 py-2">{invoice.description}</div>}
          {payments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment History</p>
              <div className="space-y-2">
                {payments.map((pay, i) => (
                  <div key={pay.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-emerald-700">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(pay.amount)}</span>
                        <VMethodBadge method={pay.method}/>
                        {pay.ref && <span className="text-[11px] text-slate-400">{pay.ref}</span>}
                        <span className="text-[11px] text-slate-400">{pay.date}</span>
                      </div>
                      {pay.note && <p className="text-[11px] text-slate-500 mt-0.5">{pay.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 px-3 py-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Total paid ({payments.length} installment{payments.length !== 1 ? 's' : ''})</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(paid)}</span>
              </div>
            </div>
          )}
          {recording && <VRecordPayPanel invoice={fakeInv} onSave={handlePay} onClose={() => setRecording(false)}/>}
          {!recording && bal > 0 && (
            <button onClick={() => setRecording(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-navy-700 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors">
              <Plus size={11}/>Record Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VendorAddInvoiceModal({ vendor, onClose, onSave }) {
  const iV2 = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
  const lV2 = 'block text-xs font-medium text-slate-500 mb-1';
  const [form, setForm] = useState({ category: '', invoiceNumber: '', invoiceDate: '', dueDate: '', amount: '', description: '' });
  const [errors, setErrors] = useState({});
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.invoiceNumber) e.invoiceNumber = 'Required';
    if (!form.invoiceDate)   e.invoiceDate   = 'Required';
    if (!form.dueDate)       e.dueDate       = 'Required';
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Required';
    setErrors(e); return !Object.keys(e).length;
  };
  const save = () => {
    if (!validate()) return;
    onSave({ id:`INV-${Date.now()}`, vendor: vendor.name, category: form.category || 'Other',
      invoiceNumber: form.invoiceNumber,
      invoiceDate: new Date(form.invoiceDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      dueDate: new Date(form.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      amount: parseFloat(form.amount), description: form.description, status: 'unpaid', doc: null, payments: [] });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add Invoice</h2>
            <p className="text-xs text-slate-400 mt-0.5">Vendor: {vendor.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lV2}>Category</label>
              <select value={form.category} onChange={e => f('category')(e.target.value)} className={iV2}>
                <option value="">Select…</option>
                {V_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lV2}>Invoice Number *</label>
              <input value={form.invoiceNumber} onChange={e => f('invoiceNumber')(e.target.value)} className={clsx(iV2, errors.invoiceNumber && 'border-rose-300')} placeholder="e.g. INV-2026-001"/>
              {errors.invoiceNumber && <p className="text-[11px] text-rose-500 mt-1">{errors.invoiceNumber}</p>}
            </div>
            <div>
              <label className={lV2}>Amount ($) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => f('amount')(e.target.value)} className={clsx(iV2, errors.amount && 'border-rose-300')} placeholder="0.00"/>
              {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className={lV2}>Invoice Date *</label>
              <DateField value={form.invoiceDate} onChange={e => f('invoiceDate')(e.target.value)} className={clsx(iV2, errors.invoiceDate && 'border-rose-300')}/>
              {errors.invoiceDate && <p className="text-[11px] text-rose-500 mt-1">{errors.invoiceDate}</p>}
            </div>
            <div>
              <label className={lV2}>Due Date *</label>
              <DateField value={form.dueDate} onChange={e => f('dueDate')(e.target.value)} className={clsx(iV2, errors.dueDate && 'border-rose-300')}/>
              {errors.dueDate && <p className="text-[11px] text-rose-500 mt-1">{errors.dueDate}</p>}
            </div>
            <div className="col-span-2">
              <label className={lV2}>Description</label>
              <textarea value={form.description} onChange={e => f('description')(e.target.value)} rows={3} className={iV2 + ' resize-none'} placeholder="What services does this invoice cover?"/>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={save} className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors">
            <Plus size={12}/>Add Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function VendorDetailPage({ vendor, onBack }) {
  const inp = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
  const lbl = 'block text-xs font-medium text-slate-500 mb-1';

  const [activeTab, setActiveTab]       = useState('overview');
  const [contracts, setContracts]       = useState(() => (MOCK_CONTRACTS[vendor.id] || []).map(c => ({ ...c, docs: [] })));
  const [vendorDocs, setVendorDocs]     = useState([]);
  const [renewingId, setRenewingId]     = useState(null);
  const [renewForm, setRenewForm]       = useState({ newEnd: '', autoRenew: false, notes: '' });
  const [showAddContract, setShowAddContract] = useState(false);
  const [addForm, setAddForm]           = useState({ type: '', start: '', end: '', value: '', scope: '', autoRenew: false });
  const [addFormDoc, setAddFormDoc]     = useState(null);
  const [movingFile, setMovingFile]     = useState(null);
  const [moveTarget, setMoveTarget]     = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody]   = useState('');
  const [composeSent, setComposeSent]   = useState(false);
  const vendorCommId = getCommunityId();
  const vendorQC = useQueryClient();
  const { data: allDbInvoices = [] } = useQuery({
    queryKey: ['invoices', vendorCommId],
    queryFn: () => vInvoiceAPI.list(vendorCommId).then(r => r.data),
    placeholderData: [],
  });
  const vendorInvoices = useMemo(() => {
    if (allDbInvoices.length) return allDbInvoices.filter(i => i.vendor === vendor.name);
    const lsAll = invLsGet();
    const lsMap = {};
    lsAll.forEach(i => { if (i.id) lsMap[i.id] = i; });
    const mockForVendor = VENDOR_MOCK_INVOICES.filter(i => i.vendor === vendor.name).map(i => lsMap[i.id] || i);
    const userAdded = lsAll.filter(i => i.vendor === vendor.name && !VENDOR_MOCK_INVOICES.find(m => m.id === i.id));
    return [...userAdded, ...mockForVendor];
  }, [allDbInvoices, vendor.name]);
  const [showAddInv, setShowAddInv] = useState(false);
  const uploadRef  = useRef(null);
  const addDocRef  = useRef(null);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const vendorEmails = MOCK_INBOX.filter(e => e.fromType === 'vendor' && e.from === vendor.name);

  const handleRenew = c => { setRenewingId(c.id); setRenewForm({ newEnd: '', autoRenew: c.autoRenew, notes: '' }); };
  const confirmRenew = c => {
    if (!renewForm.newEnd) return;
    setContracts(prev => prev.map(x => x.id === c.id
      ? { ...x, start: today, end: new Date(renewForm.newEnd).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), status: 'active', autoRenew: renewForm.autoRenew }
      : x));
    setRenewingId(null);
  };

  const handleAddContract = () => {
    if (!addForm.type.trim()) return;
    const nc = {
      id: `c-${Date.now()}`,
      type: addForm.type,
      start: addForm.start ? new Date(addForm.start).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : today,
      end:   addForm.end   ? new Date(addForm.end).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})   : 'Ongoing',
      value: parseFloat(addForm.value) || 0,
      scope: addForm.scope,
      autoRenew: addForm.autoRenew,
      status: 'active',
      docs: addFormDoc ? [{ id: Date.now(), name: addFormDoc.name, size: addFormDoc.size, dataUrl: addFormDoc.dataUrl, uploadedAt: today }] : [],
    };
    setContracts(prev => [...prev, nc]);
    setAddForm({ type: '', start: '', end: '', value: '', scope: '', autoRenew: false });
    setAddFormDoc(null);
    setShowAddContract(false);
  };

  const handleUploadDoc = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setVendorDocs(prev => [...prev, { id: Date.now(), name: file.name, size: file.size, dataUrl: ev.target.result, uploadedAt: today }]);
    reader.readAsDataURL(file); e.target.value = '';
  };

  const confirmMoveToContract = () => {
    if (!moveTarget || !movingFile) return;
    const doc = { id: Date.now(), name: movingFile.name, uploadedAt: today, source: movingFile.source, dataUrl: movingFile.dataUrl || null };
    if (moveTarget === 'standalone') {
      setVendorDocs(prev => [...prev, doc]);
    } else {
      setContracts(prev => prev.map(c => c.id === moveTarget ? { ...c, docs: [...(c.docs || []), doc] } : c));
    }
    setMovingFile(null); setMoveTarget('');
  };

  const handleComposeSend = () => {
    if (!composeSubject.trim() || !composeBody.trim()) return;
    lsSaveComm({ id: Date.now(), subject: composeSubject, body: composeBody, type: 'vendor', sent: vendor.name, channel: 'Email', date: today, openRate: null });
    setComposeSent(true); setComposeSubject(''); setComposeBody('');
  };

  const handleVendorPayment = async (invId, _allPayments, newPay) => {
    const inv = vendorInvoices.find(i => i.id === invId);
    if (inv?.dbId) {
      try {
        await vInvoiceAPI.addPayment(inv.dbId, { communityId: vendorCommId, date: newPay.date, amount: newPay.amount, method: newPay.method, ref: newPay.ref || '', note: newPay.note || '' });
        vendorQC.invalidateQueries(['invoices', vendorCommId]);
        return;
      } catch { /* fall through to localStorage */ }
    }
    if (!inv) return;
    const updated = { ...inv, payments: _allPayments };
    const lsAll = invLsGet();
    const idx = lsAll.findIndex(i => i.id === invId);
    invLsSave(idx >= 0 ? lsAll.map(i => i.id === invId ? updated : i) : [...lsAll, updated]);
  };

  const handleAddVendorInvoice = async inv => {
    try {
      await vInvoiceAPI.create({ communityId: vendorCommId, vendor: inv.vendor, category: inv.category, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate, dueDate: inv.dueDate, amount: inv.amount, description: inv.description });
      vendorQC.invalidateQueries(['invoices', vendorCommId]);
    } catch {
      invLsSave([inv, ...invLsGet()]);
    }
  };

  const StatCard = ({ label, value }) => (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );

  return (
    <div className="page-enter">
      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
          ← Back to Vendors
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{vendor.name}</h1>
            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{vendor.category}</span>
            <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold', vendor.coiStatus==='valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
              COI {vendor.coiStatus === 'valid' ? 'Valid' : `Expiring${vendor.coiExp ? ` ${vendor.coiExp}` : ''}`}
            </span>
            {vendor.w9 && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">W-9 on File</span>}
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {[vendor.address, vendor.phone, vendor.email].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-slate-900">${(vendor.annualSpend||0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual Spend</p>
        </div>
      </div>

      {/* Tabs — underline style */}
      <div className="flex border-b border-slate-200 mb-6">
        {[['overview','Overview'],['contracts','Contracts'],['financials','Invoices & Payments'],['communications','Communications']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={clsx('px-6 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === id ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Category"         value={vendor.category} />
            <StatCard label="Annual Spend"     value={`$${(vendor.annualSpend||0).toLocaleString()}`} />
            <StatCard label="Contract Expiry"  value={vendor.contractExp} />
            <StatCard label="W-9 on File"      value={vendor.w9 ? 'Yes' : 'No'} />
            <StatCard label="COI Status"       value={vendor.coiStatus==='valid' ? 'Valid' : `Expiring${vendor.coiExp ? ` — ${vendor.coiExp}` : ''}`} />
            <StatCard label="Business License" value={vendor.businessLicense || '—'} />
            <StatCard label="Tax ID / EIN"     value={vendor.ein || '—'} />
            <StatCard label="Primary Contact"  value={vendor.contactName ? `${vendor.contactName}${vendor.contactTitle ? ` · ${vendor.contactTitle}` : ''}` : '—'} />
          </div>
          {vendor.address && (
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Address</p>
              <p className="text-sm font-semibold text-slate-800">{vendor.address}</p>
            </div>
          )}
          {(vendor.phone || vendor.email || vendor.website) && (
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Contact</p>
              <div className="flex gap-8 flex-wrap">
                {vendor.phone   && <div><p className="text-[10px] text-slate-400 mb-0.5">Phone</p>  <p className="text-sm font-semibold text-slate-800">{vendor.phone}</p></div>}
                {vendor.email   && <div><p className="text-[10px] text-slate-400 mb-0.5">Email</p>  <p className="text-sm font-semibold text-navy-700">{vendor.email}</p></div>}
                {vendor.website && <div><p className="text-[10px] text-slate-400 mb-0.5">Website</p><p className="text-sm text-slate-500">{vendor.website}</p></div>}
              </div>
            </div>
          )}
          {vendor.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold mb-1">Notes</p>
              <p className="text-sm text-slate-700">{vendor.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Contracts ── */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{contracts.length} contract{contracts.length !== 1 ? 's' : ''} on file</p>
            <div className="flex gap-2">
              <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUploadDoc}/>
              <button onClick={() => uploadRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700 transition-colors">
                <Paperclip size={11}/>Upload Contract Doc
              </button>
              <button onClick={() => setShowAddContract(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-navy-700 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors">
                <Plus size={11}/>{showAddContract ? 'Cancel' : 'Add Contract'}
              </button>
            </div>
          </div>

          {/* Standalone uploaded docs */}
          {vendorDocs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Uploaded Vendor Documents</p>
              <div className="flex flex-wrap gap-2">
                {vendorDocs.map(d => (
                  <a key={d.id} href={d.dataUrl || undefined} download={d.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-navy-50 border border-navy-100 text-navy-700 rounded-lg text-[11px] hover:bg-navy-100 transition-colors">
                    <FileText size={11}/><span className="font-medium">{d.name}</span>
                    {d.source && <span className="text-navy-400 text-[10px]">· from email</span>}
                    <span className="text-navy-400 text-[10px]">{d.uploadedAt}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Add contract inline form */}
          {showAddContract && (
            <div className="bg-slate-50 border border-navy-100 rounded-xl p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-800">New Contract</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Contract Type / Description *</label>
                  <input value={addForm.type} onChange={e => setAddForm(p => ({...p, type: e.target.value}))} className={inp} placeholder="e.g. Annual Landscaping Maintenance"/>
                </div>
                <div>
                  <label className={lbl}>Start Date</label>
                  <DateField value={addForm.start} onChange={e => setAddForm(p => ({...p, start: e.target.value}))} className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Expiry Date</label>
                  <DateField value={addForm.end} onChange={e => setAddForm(p => ({...p, end: e.target.value}))} className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Annual Value ($)</label>
                  <input type="number" min="0" value={addForm.value} onChange={e => setAddForm(p => ({...p, value: e.target.value}))} className={inp} placeholder="0.00"/>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.autoRenew} onChange={e => setAddForm(p => ({...p, autoRenew: e.target.checked}))} className="accent-navy-600"/>
                    <span className="text-sm text-slate-700">Auto-renew</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Scope of Work</label>
                  <textarea value={addForm.scope} onChange={e => setAddForm(p => ({...p, scope: e.target.value}))} rows={2} className={inp + ' resize-none'} placeholder="Describe services covered…"/>
                </div>
                <div className="col-span-2">
                  <input ref={addDocRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setAddFormDoc({ name: file.name, size: file.size, dataUrl: ev.target.result });
                    reader.readAsDataURL(file); e.target.value = '';
                  }}/>
                  <button type="button" onClick={() => addDocRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:border-navy-300 hover:bg-navy-50 transition-colors">
                    <Paperclip size={11}/>{addFormDoc ? addFormDoc.name : 'Attach Contract Document (PDF)'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setShowAddContract(false); setAddForm({type:'',start:'',end:'',value:'',scope:'',autoRenew:false}); setAddFormDoc(null); }}
                  className="px-4 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleAddContract} disabled={!addForm.type.trim()}
                  className="px-5 py-1.5 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 transition-colors">
                  Save Contract
                </button>
              </div>
            </div>
          )}

          {/* Contract list */}
          {contracts.length === 0 && !showAddContract && (
            <div className="text-center py-16 text-sm text-slate-400">No contracts on file. Click "Add Contract" to get started.</div>
          )}
          {contracts.map(c => {
            const isExpiring = c.status === 'expiring';
            const isRenewing = renewingId === c.id;
            return (
              <div key={c.id} className={clsx('bg-white rounded-xl border p-5 space-y-3', isExpiring ? 'border-amber-200' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', isExpiring ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                        {isExpiring ? 'Expiring' : 'Active'}
                      </span>
                      {c.autoRenew && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Auto-Renew</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{c.type}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.start} → {c.end} · <span className="font-semibold text-slate-700">${c.value.toLocaleString()}/yr</span></p>
                    {c.scope && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{c.scope}</p>}
                    {/* Attached docs */}
                    {c.docs?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {c.docs.map((d, i) => (
                          <a key={i} href={d.dataUrl || undefined} download={d.name}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-navy-50 border border-navy-100 text-navy-700 rounded-lg text-[11px] hover:bg-navy-100 transition-colors">
                            <FileText size={10}/><span className="font-medium">{d.name}</span>
                            {d.source && <span className="text-navy-400 text-[10px]">· from email</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isRenewing && (
                    <button onClick={() => handleRenew(c)}
                      className={clsx('flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        isExpiring ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-100')}>
                      {isExpiring ? 'Renew Now' : 'Renew'}
                    </button>
                  )}
                </div>
                {isRenewing && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Renew Contract</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">New Expiry Date *</label>
                        <DateField value={renewForm.newEnd} onChange={e => setRenewForm(p => ({...p, newEnd: e.target.value}))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400"/>
                      </div>
                      <div className="flex items-end pb-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={renewForm.autoRenew} onChange={e => setRenewForm(p => ({...p, autoRenew: e.target.checked}))} className="accent-navy-600"/>
                          <span className="text-xs text-slate-600">Auto-renew</span>
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">Notes (optional)</label>
                        <input value={renewForm.notes} onChange={e => setRenewForm(p => ({...p, notes: e.target.value}))}
                          placeholder="Rate change, scope update…"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400"/>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setRenewingId(null)} className="px-3 py-1 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      <button onClick={() => confirmRenew(c)} disabled={!renewForm.newEnd}
                        className="px-4 py-1 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 transition-colors">
                        Confirm Renewal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Communications ── */}
      {activeTab === 'communications' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Inbox from vendor */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Received from {vendor.name}</h3>
            {vendorEmails.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">No emails on file.</div>
            ) : vendorEmails.map(email => (
              <div key={email.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <InboxEmailRow email={email} onReplyAdded={() => {}} />
                {/* Move invoice attachment to contracts */}
                {email.hasInvoice && (
                  <div className="px-5 pb-3 pt-2 border-t border-slate-50 flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg text-[11px]">
                      <FileText size={10}/>Invoice #{email.invoiceNumber}.pdf
                    </div>
                    <button onClick={() => { setMovingFile({ name: `Invoice_${email.invoiceNumber}.pdf`, source: email.subject }); setActiveTab('communications'); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-navy-700 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors">
                      → Move to Contracts
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Compose */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Send to {vendor.name}</h3>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div>
                <label className={lbl}>Subject</label>
                <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className={inp} placeholder="Subject…"/>
              </div>
              <div>
                <label className={lbl}>Message</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={9} className={inp + ' resize-y font-mono'} placeholder="Message…"/>
              </div>
              <div className="flex items-center justify-between">
                {composeSent && <span className="text-xs text-emerald-600 font-medium">Sent ✓</span>}
                <button onClick={handleComposeSend} disabled={!composeSubject.trim() || !composeBody.trim()}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 transition-colors">
                  <Send size={11}/>Send to Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoices & Payments ── */}
      {activeTab === 'financials' && (() => {
        const totalInvoiced    = vendorInvoices.reduce((s, i) => s + i.amount, 0);
        const totalOutstanding = vendorInvoices.reduce((s, i) => s + vBal(i), 0);
        const totalPaid        = vendorInvoices.reduce((s, i) => s + vPaidAmt(i), 0);
        const overdueCount     = vendorInvoices.filter(i => vStatus(i) === 'overdue').length;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total Invoiced"   value={formatCurrency(totalInvoiced)} />
              <StatCard label="Outstanding"      value={formatCurrency(totalOutstanding)} />
              <StatCard label="Total Paid"       value={formatCurrency(totalPaid)} />
              <StatCard label="Overdue"          value={overdueCount > 0 ? `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}` : 'None'} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{vendorInvoices.length} invoice{vendorInvoices.length !== 1 ? 's' : ''} on file</p>
              <Button variant="primary" size="sm" onClick={() => setShowAddInv(true)}><Plus size={12}/>Add Invoice</Button>
            </div>
            <Card padding={false}>
              {vendorInvoices.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No invoices on file for {vendor.name}.</div>
              ) : vendorInvoices.map(inv => (
                <VInvoiceRow key={inv.id} invoice={inv} onPaymentAdded={handleVendorPayment}/>
              ))}
            </Card>
            {showAddInv && <VendorAddInvoiceModal vendor={vendor} onClose={() => setShowAddInv(false)} onSave={handleAddVendorInvoice}/>}
          </div>
        );
      })()}

      {/* Move-to-Contracts picker overlay */}
      {movingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Move Attachment to Contracts</h3>
            <p className="text-xs text-slate-400 mb-4">Choose where to file <span className="font-semibold text-slate-700">{movingFile.name}</span></p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <input type="radio" name="mt" value="standalone" checked={moveTarget==='standalone'} onChange={() => setMoveTarget('standalone')} className="accent-navy-600"/>
                <span className="text-sm text-slate-700">Save as standalone vendor document</span>
              </label>
              {contracts.map(c => (
                <label key={c.id} className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="radio" name="mt" value={c.id} checked={moveTarget===c.id} onChange={() => setMoveTarget(c.id)} className="accent-navy-600 mt-0.5 flex-shrink-0"/>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.type}</p>
                    <p className="text-[11px] text-slate-400">{c.start} → {c.end}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setMovingFile(null); setMoveTarget(''); }}
                className="px-4 py-2 text-xs text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={confirmMoveToContract} disabled={!moveTarget}
                className="px-4 py-2 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 transition-colors">
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MOCK_VENDORS = [
  { id:1, name:'Greenscape Landscaping', category:'Landscaping',       address:'840 Garden Way, Sacramento, CA 95814', phone:'(916) 555-0301', email:'accounts@greenscape.com',   website:'www.greenscape.com',   contactName:'Marcus Webb',    contactTitle:'Account Manager',  businessLicense:'BL-2019-04821', ein:'47-2381940', contractStart:'Jan 1, 2025',  contractExp:'Dec 31, 2025', coiStatus:'valid',    coiExp:null,      w9:true, annualSpend:50400, notes:'Preferred landscaping vendor for 6 years. Includes 4 monthly visits and seasonal plantings.' },
  { id:2, name:'AquaCare Pool Services', category:'Pool & Spa',        address:'220 Blue Lagoon Dr, Elk Grove, CA 95624', phone:'(916) 555-0402', email:'billing@aquacare.com',    website:'www.aquacare.net',     contactName:'Sandra Ho',      contactTitle:'Client Relations', businessLicense:'BL-2021-11203', ein:'83-4729201', contractStart:'Jul 1, 2024',  contractExp:'Jun 30, 2025', coiStatus:'expiring', coiExp:'May 20',  w9:true, annualSpend:21600, notes:'COI renewal in progress. Bi-weekly pool maintenance, chemical balancing and filter cleaning.' },
  { id:3, name:'ProPlumb Emergency',     category:'Plumbing',          address:'1175 Pipe Ave, Rancho Cordova, CA 95670', phone:'(916) 555-0503', email:'service@proplumb.com',    website:'www.proplumb.com',     contactName:'Derek Vance',    contactTitle:'Dispatch Manager', businessLicense:'BL-2018-09374', ein:'56-1038472', contractStart:'Jan 1, 2025',  contractExp:'Ongoing',      coiStatus:'valid',    coiExp:null,      w9:true, annualSpend:18400, notes:'On-call 24/7 emergency plumbing. Billed per service call. Response time SLA: 90 minutes.' },
  { id:4, name:'SecureWatch Security',   category:'Security',          address:'4501 Shield Blvd, Sacramento, CA 95823', phone:'(916) 555-0604', email:'ops@securewatch.com',     website:'www.securewatch.com',  contactName:'Linda Okafor',   contactTitle:'Operations Lead',  businessLicense:'BL-2020-05512', ein:'29-8834710', contractStart:'Oct 1, 2024',  contractExp:'Sep 30, 2025', coiStatus:'expiring', coiExp:'May 14',  w9:true, annualSpend:38400, notes:'24/7 on-site guard + 12-camera monitoring. COI renewal overdue — follow up immediately.' },
  { id:5, name:'PaintRight Contractors', category:'Painting & General',address:'77 Brush St, West Sacramento, CA 95691', phone:'(916) 555-0705', email:'projects@paintright.com', website:'www.paintright.biz',   contactName:'Tommy Reyes',    contactTitle:'Project Lead',     businessLicense:'BL-2022-14490', ein:'61-7203845', contractStart:'Mar 1, 2026',  contractExp:'Project-based',coiStatus:'valid',    coiExp:null,      w9:true, annualSpend:12000, notes:'Current project: Building A exterior repaint. Est. completion June 2026.' },
  { id:6, name:'Metro Collection Group', category:'Collections',       address:'900 Debt Row, Folsom, CA 95630',         phone:'(916) 555-0806', email:'hoa@metrocollect.com',   website:'www.metrocollect.com', contactName:'Joyce Patton',   contactTitle:'HOA Specialist',   businessLicense:'BL-2021-08831', ein:'72-5590134', contractStart:'Jan 1, 2025',  contractExp:'Ongoing',      coiStatus:'valid',    coiExp:null,      w9:true, annualSpend:4200,  notes:'Contingency-based: 15% of collected amount. Handles accounts 90+ days delinquent.' },
  { id:7, name:'SecureLock Inc.',        category:'Locksmith & Gates', address:'310 Key Ct, Sacramento, CA 95841',       phone:'(916) 555-0907', email:'service@securelock.com', website:'www.securelock.com',   contactName:'Brian Falco',    contactTitle:'Service Director', businessLicense:'BL-2023-19203', ein:'38-4401927', contractStart:'Jan 1, 2025',  contractExp:'Ongoing',      coiStatus:'valid',    coiExp:null,      w9:true, annualSpend:6800,  notes:'FOB programming, gate motor maintenance, emergency lockout response. 2-hr SLA.' },
];

const MOCK_CONTRACTS = {
  1: [
    { id:'c1-1', type:'Annual Landscaping Maintenance', start:'Jan 1, 2025',  end:'Dec 31, 2025', value:50400, status:'expiring', scope:'Weekly mowing, edging, trimming, seasonal plantings — 4 visits/month', autoRenew:true },
    { id:'c1-2', type:'Irrigation System Maintenance',  start:'Mar 1, 2025',  end:'Feb 28, 2026', value:8400,  status:'active',   scope:'Monthly irrigation inspection, adjustment and minor repairs', autoRenew:false },
  ],
  2: [
    { id:'c2-1', type:'Pool & Spa Service Contract',    start:'Jul 1, 2024',  end:'Jun 30, 2025', value:21600, status:'expiring', scope:'Bi-weekly pool maintenance, chemical balancing, filter cleaning, 8 visits/month', autoRenew:false },
  ],
  3: [
    { id:'c3-1', type:'On-Call Emergency Plumbing',     start:'Jan 1, 2025',  end:'Ongoing',      value:18400, status:'active',   scope:'24/7 emergency plumbing services, billed per call, 90-min response SLA', autoRenew:true },
  ],
  4: [
    { id:'c4-1', type:'Security Guard Services',        start:'Oct 1, 2024',  end:'Sep 30, 2025', value:38400, status:'expiring', scope:'24/7 on-site guard, incident reporting, visitor log management', autoRenew:false },
    { id:'c4-2', type:'Camera System Monitoring',       start:'Oct 1, 2024',  end:'Sep 30, 2025', value:6000,  status:'expiring', scope:'Remote monitoring of 12 cameras, clip retention 30 days, immediate alert on incident', autoRenew:false },
  ],
  5: [
    { id:'c5-1', type:'Exterior Painting — Building A', start:'Mar 1, 2026', end:'Project-based', value:12000, status:'active',   scope:'Full exterior repaint Building A, 3-coat elastomeric, est. 8-week project', autoRenew:false },
  ],
  6: [
    { id:'c6-1', type:'Collections Services Agreement', start:'Jan 1, 2025',  end:'Ongoing',      value:4200,  status:'active',   scope:'Delinquent dues collection, 15% contingency fee, accounts 90+ days past due', autoRenew:true },
  ],
  7: [
    { id:'c7-1', type:'Locksmith & Gate Maintenance',   start:'Jan 1, 2025',  end:'Ongoing',      value:6800,  status:'active',   scope:'FOB programming, gate motor PM quarterly, emergency lockout response 2-hr SLA', autoRenew:true },
  ],
};

const VENDOR_CATEGORIES = ['Landscaping','Pool & Spa','Plumbing','Security','Painting & General','Collections','Locksmith & Gates','Electrical','HVAC','Elevator','Roofing','Cleaning','Other'];

function AddVendorModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name:'', category:'', address:'', phone:'', email:'', website:'',
    contactName:'', contactTitle:'', businessLicense:'', ein:'',
    coiStatus:'valid', coiExp:'', w9:false,
    contractStart:'', contractExp:'', annualSpend:'', notes:'',
  });
  const [contractDoc, setContractDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const contractDocRef = useRef(null);

  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const inp = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
  const lbl = 'block text-xs font-medium text-slate-500 mb-1';

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.category) e.category = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, annualSpend: parseFloat(form.annualSpend) || 0, contractDoc });
    onClose();
  };

  const handleContractDoc = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setContractDoc({ name: file.name, size: file.size, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const SectionTitle = ({ children }) => (
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 mt-1">{children}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">Add New Vendor</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><XIcon size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Company */}
          <div>
            <SectionTitle>Company Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Company Name *</label>
                <input value={form.name} onChange={e => f('name')(e.target.value)} className={clsx(inp, errors.name && 'border-rose-300')} placeholder="e.g. Greenscape Landscaping"/>
                {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className={lbl}>Category *</label>
                <select value={form.category} onChange={e => f('category')(e.target.value)} className={clsx(inp, errors.category && 'border-rose-300')}>
                  <option value="">Select category…</option>
                  {VENDOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-[11px] text-rose-500 mt-1">{errors.category}</p>}
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input value={form.phone} onChange={e => f('phone')(e.target.value)} className={inp} placeholder="(555) 000-0000"/>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Address</label>
                <input value={form.address} onChange={e => f('address')(e.target.value)} className={inp} placeholder="123 Main St, City, CA 90001"/>
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={form.email} onChange={e => f('email')(e.target.value)} className={inp} placeholder="billing@vendor.com"/>
              </div>
              <div>
                <label className={lbl}>Website</label>
                <input value={form.website} onChange={e => f('website')(e.target.value)} className={inp} placeholder="www.vendor.com"/>
              </div>
            </div>
          </div>
          {/* Contact */}
          <div>
            <SectionTitle>Primary Contact</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contact Name</label>
                <input value={form.contactName} onChange={e => f('contactName')(e.target.value)} className={inp} placeholder="Jane Smith"/>
              </div>
              <div>
                <label className={lbl}>Title / Role</label>
                <input value={form.contactTitle} onChange={e => f('contactTitle')(e.target.value)} className={inp} placeholder="Account Manager"/>
              </div>
            </div>
          </div>
          {/* Legal */}
          <div>
            <SectionTitle>Legal & Compliance</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Business License #</label>
                <input value={form.businessLicense} onChange={e => f('businessLicense')(e.target.value)} className={inp} placeholder="BL-2025-XXXXX"/>
              </div>
              <div>
                <label className={lbl}>Tax ID / EIN</label>
                <input value={form.ein} onChange={e => f('ein')(e.target.value)} className={inp} placeholder="XX-XXXXXXX"/>
              </div>
              <div>
                <label className={lbl}>COI Status</label>
                <select value={form.coiStatus} onChange={e => f('coiStatus')(e.target.value)} className={inp}>
                  <option value="valid">Valid</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="none">None on File</option>
                </select>
              </div>
              <div>
                <label className={lbl}>COI Expiry Date</label>
                <DateField value={form.coiExp} onChange={e => f('coiExp')(e.target.value)} className={inp}/>
              </div>
              <div className="col-span-2 flex items-center gap-2 py-1">
                <input type="checkbox" id="w9chk" checked={form.w9} onChange={e => f('w9')(e.target.checked)} className="w-4 h-4 accent-navy-600 flex-shrink-0"/>
                <label htmlFor="w9chk" className="text-sm text-slate-700 cursor-pointer">W-9 on file</label>
              </div>
            </div>
          </div>
          {/* Contract */}
          <div>
            <SectionTitle>Contract Details</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contract Start Date</label>
                <DateField value={form.contractStart} onChange={e => f('contractStart')(e.target.value)} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Contract Expiry Date</label>
                <DateField value={form.contractExp} onChange={e => f('contractExp')(e.target.value)} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Estimated Annual Spend ($)</label>
                <input type="number" min="0" value={form.annualSpend} onChange={e => f('annualSpend')(e.target.value)} className={inp} placeholder="0.00"/>
              </div>
              <div className="flex flex-col justify-end">
                <input ref={contractDocRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleContractDoc}/>
                <button type="button" onClick={() => contractDocRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:border-navy-300 hover:bg-navy-50 transition-colors">
                  <Paperclip size={11}/>{contractDoc ? contractDoc.name : 'Attach Contract Document (PDF)'}
                </button>
                {contractDoc && <p className="text-[11px] text-slate-400 mt-1">{(contractDoc.size/1024).toFixed(0)} KB attached</p>}
              </div>
              <div className="col-span-2">
                <label className={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="Scope of work, special terms, or reminders…"/>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors">
            <Plus size={12}/>Add Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

export function Vendors() {
  const { data: list } = useQuery({ queryKey:['vendors'], queryFn:()=>vendorAPI.list(1).then(r=>r.data), placeholderData:MOCK_VENDORS });
  const [extra, setExtra] = useState([]);
  const baseVendors = list?.length ? list : MOCK_VENDORS;
  const vendors = [...extra, ...baseVendors];
  const expiring = vendors.filter(v=>v.coiStatus==='expiring').length;
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleAddVendor = data => {
    const v = { id: Date.now(), name: data.name, category: data.category, address: data.address,
      phone: data.phone, email: data.email, website: data.website,
      contactName: data.contactName, contactTitle: data.contactTitle,
      businessLicense: data.businessLicense, ein: data.ein,
      contractStart: data.contractStart, contractExp: data.contractExp || 'Ongoing',
      coiStatus: data.coiStatus, coiExp: data.coiExp || null,
      w9: data.w9, annualSpend: data.annualSpend || 0, notes: data.notes, contractDoc: data.contractDoc };
    setExtra(prev => [v, ...prev]);
  };

  if (selectedVendor) {
    return <VendorDetailPage vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />;
  }

  return (
    <div className="page-enter">
      <SectionHeader title="Vendors" subtitle="Contract management, COI tracking, and 1099 compliance"
        action={<Button variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus size={12}/>Add Vendor</Button>} />
      {expiring > 0 && <Alert variant="danger" title={`${expiring} vendor COIs expiring within 30 days`}>Renew before contracts can be extended.</Alert>}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Vendors"      value={vendors.length} />
        <MetricCard label="COI Expiring"        value={expiring} sub="Within 30 days" subVariant="bad" />
        <MetricCard label="Contracts Expiring"  value="1"        sub="Within 60 days" subVariant="warn" />
        <MetricCard label="Annual Spend"        value="$218K"    sub="6 vendors 1099'd" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Vendor Directory</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Vendor</Th><Th>Category</Th><Th>Contract Exp.</Th><Th>COI</Th><Th>W-9</Th><Th>Annual Spend</Th><Th>Action</Th></tr></thead>
            <tbody>{vendors.map(v => (
              <Tr key={v.id}>
                <Td>
                  <button onClick={() => setSelectedVendor(v)}
                    className="font-semibold text-navy-700 hover:text-navy-900 hover:underline underline-offset-2 transition-colors text-left">
                    {v.name}
                  </button>
                </Td>
                <Td><Badge variant="gray">{v.category}</Badge></Td>
                <Td className="text-xs text-slate-500">{v.contractExp}</Td>
                <Td>
                  <Badge variant={v.coiStatus==='valid'?'green':'red'}>{v.coiStatus==='valid'?'Valid':'Expiring'}</Badge>
                  {v.coiExp&&<p className="text-[10px] text-rose-500 mt-0.5">Exp: {v.coiExp}</p>}
                </Td>
                <Td><Badge variant={v.w9?'green':'red'}>{v.w9?'On file':'Missing'}</Badge></Td>
                <Td className="font-semibold">${(v.annualSpend/1000).toFixed(1)}K</Td>
                <Td><div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedVendor(v)}>View</Button>
                  {v.coiStatus==='expiring'&&<Button variant="danger" size="sm">Renew COI</Button>}
                </div></Td>
              </Tr>
            ))}</tbody>
          </Table>
        </div>
      </Card>
      {showAdd && <AddVendorModal onClose={() => setShowAdd(false)} onSave={handleAddVendor} />}
    </div>
  );
}

// ─── Residents ────────────────────────────────────────────────────────────────
import { Search } from 'lucide-react';
import { useMemo } from 'react';
import { residentAPI } from '../lib/api';

const MOCK_RESIDENTS = [
  { id:1,  unit:'Unit 1',   owner:'Alex Thompson',  email:'a.thompson@email.com', balance:0,   portal:'active',  autoPay:true,  status:'good'        },
  { id:2,  unit:'Unit 12',  owner:'Diana Foster',   email:'d.foster@email.com',   balance:150, portal:'invited', autoPay:false, status:'delinquent'  },
  { id:3,  unit:'Unit 33',  owner:'Michael Torres', email:'m.torres@email.com',   balance:900, portal:'none',    autoPay:false, status:'collections' },
  { id:4,  unit:'Unit 42',  owner:'Sarah Chen',     email:'s.chen@email.com',     balance:0,   portal:'active',  autoPay:true,  status:'good'        },
  { id:5,  unit:'Unit 44',  owner:'Carlos Rivera',  email:'c.rivera@email.com',   balance:100, portal:'active',  autoPay:false, status:'violation'   },
  { id:6,  unit:'Unit 55',  owner:'Kevin Zhang',    email:'k.zhang@email.com',    balance:150, portal:'active',  autoPay:false, status:'delinquent'  },
  { id:7,  unit:'Unit 67',  owner:'Amanda Liu',     email:'a.liu@email.com',      balance:300, portal:'active',  autoPay:false, status:'delinquent'  },
  { id:8,  unit:'Unit 83',  owner:'Tom Nakamura',   email:'t.nakamura@email.com', balance:0,   portal:'active',  autoPay:true,  status:'good'        },
  { id:9,  unit:'Unit 88',  owner:'Laura Kim',      email:'l.kim@email.com',      balance:150, portal:'active',  autoPay:false, status:'delinquent'  },
  { id:10, unit:'Unit 119', owner:'Maria Garcia',   email:'m.garcia@email.com',   balance:0,   portal:'active',  autoPay:true,  status:'good'        },
];
const rStMap = { good:{l:'Good Standing',c:'green'}, delinquent:{l:'Delinquent',c:'amber'}, violation:{l:'Violation',c:'amber'}, collections:{l:'Collections',c:'red'} };
const rPtMap = { active:{l:'Active',c:'green'}, invited:{l:'Invited',c:'blue'}, none:{l:'Not Activated',c:'gray'} };

export function Residents() {
  const [search, setSearch] = useState('');
  const { data: list } = useQuery({ queryKey:['residents'], queryFn:()=>residentAPI.list(1).then(r=>r.data), placeholderData:MOCK_RESIDENTS });
  const residents = list || MOCK_RESIDENTS;
  const filtered = useMemo(()=>residents.filter(r=>(r.owner||r.owner_name||"").toLowerCase().includes(search.toLowerCase())||(r.unit||"").toLowerCase().includes(search.toLowerCase())),[search, residents]);

  return (
    <div className="page-enter">
      <SectionHeader title="Residents" subtitle="Homeowner directory, portal status, and account standing"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Resident</Button>} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Units"       value="148" />
        <MetricCard label="Portal Activated"  value="119" sub="80.4% adoption" subVariant="good" />
        <MetricCard label="Auto-Pay Enrolled" value="96"  sub="64.9% of units" subVariant="good" />
        <MetricCard label="Good Standing"     value="141" sub="95.3%"          subVariant="good" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Resident Directory</h3>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search residents..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-48"/>
          </div>
        </div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Email</Th><Th>Balance</Th><Th>Portal</Th><Th>Auto-Pay</Th><Th>Status</Th></tr></thead>
            <tbody>{filtered.map(r => {
              const st = rStMap[r.status]||{l:'Good',c:'gray'};
              const pt = rPtMap[r.portal]||{l:'None',c:'gray'};
              return (
                <Tr key={r.id}>
                  <Td><span className="font-semibold">{r.unit}</span></Td>
                  <Td>{r.owner}</Td>
                  <Td className="text-xs text-slate-400">{r.email}</Td>
                  <Td><span className={`${r.balance>0?'font-bold text-rose-600':'text-slate-400'}`}>{r.balance>0?`$${r.balance}`:'—'}</span></Td>
                  <Td><Badge variant={pt.c}>{pt.l}</Badge></Td>
                  <Td><span className={`text-xs font-semibold ${r.autoPay?'text-emerald-600':'text-slate-400'}`}>{r.autoPay?'Enrolled':'Manual'}</span></Td>
                  <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
import { FileText, FolderOpen, Upload, Trash2 as TrashDoc } from 'lucide-react';
import { documentAPI } from '../lib/api';

const MOCK_GOV_DOCS = [
  { id:'gov-1', name:"CC&Rs — Oakwood Estates", version:'v3.2', updated:'Jan 2025', status:'current',      note:null, category:'governing' },
  { id:'gov-2', name:'Bylaws',                  version:'v2.1', updated:'Mar 2024', status:'current',      note:null, category:'governing' },
  { id:'gov-3', name:'Rules & Regulations',     version:'v4.0', updated:'Jan 2026', status:'current',      note:null, category:'governing' },
  { id:'gov-4', name:'Collection Policy',       version:'v1.8', updated:'Dec 2024', status:'needs_update', note:'Needs update for AB 130 fine caps', category:'governing' },
  { id:'gov-5', name:'Solar Panel Policy',      version:'v1.0', updated:'Mar 2025', status:'current',      note:null, category:'governing' },
  { id:'gov-6', name:'Architectural Guidelines',version:'v2.0', updated:'Jun 2023', status:'review_needed',note:'Over 2 years since last review', category:'governing' },
  { id:'gov-7', name:'Pet Policy',              version:'v1.5', updated:'Feb 2024', status:'current',      note:null, category:'governing' },
  { id:'gov-8', name:'Parking Policy',          version:'v3.1', updated:'Jan 2026', status:'current',      note:null, category:'governing' },
];
const MOCK_FIN_DOCS = [
  { id:'fin-1', name:'2026 Annual Budget',              desc:'CA Civil Code 5300 compliant', category:'financial' },
  { id:'fin-2', name:'Reserve Fund Study 2024',         desc:'61% funded — next due 2027',   category:'financial' },
  { id:'fin-3', name:'April 2026 Financial Statement',  desc:'Auto-generated and distributed', category:'financial' },
  { id:'fin-4', name:'2025 Annual Audit Report',        desc:'CPA reviewed and filed',        category:'financial' },
  { id:'fin-5', name:'Insurance Certificate 2026',      desc:'$5M general liability',         category:'financial' },
];
const dStMap = { current:{l:'Current',c:'green'}, needs_update:{l:'Needs Update',c:'red'}, review_needed:{l:'Review Recommended',c:'amber'} };

const DOCS_LS_KEY = 'hoa_documents_v1';
export function lsGetDocs() {
  try { return JSON.parse(localStorage.getItem(DOCS_LS_KEY) || '[]'); } catch { return []; }
}
function lsSaveDoc(doc) {
  try {
    const list = lsGetDocs();
    list.unshift(doc);
    localStorage.setItem(DOCS_LS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}
function lsDeleteDoc(id) {
  try {
    const list = lsGetDocs().filter(d => d.id !== id);
    localStorage.setItem(DOCS_LS_KEY, JSON.stringify(list));
  } catch {}
}

export function Documents() {
  const uploadRef = useRef(null);
  const [uploaded, setUploaded] = useState(() => lsGetDocs());
  const { data: docs } = useQuery({ queryKey:['documents'], queryFn:()=>documentAPI.list(1).then(r=>r.data), placeholderData:MOCK_GOV_DOCS });
  const govDocs = docs || MOCK_GOV_DOCS;

  const handleUpload = (e) => {
    const MAX = 10 * 1024 * 1024;
    Array.from(e.target.files || []).forEach(file => {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const base = { id, name: file.name, size: file.size, type: file.type, uploadedAt: today, category: 'uploaded' };
      if (file.size <= MAX) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const doc = { ...base, dataUrl: ev.target.result };
          lsSaveDoc(doc);
          setUploaded(prev => [doc, ...prev]);
        };
        reader.readAsDataURL(file);
      } else {
        const doc = { ...base, dataUrl: null };
        lsSaveDoc(doc);
        setUploaded(prev => [doc, ...prev]);
      }
    });
    e.target.value = '';
  };

  const deleteUploaded = (id) => {
    lsDeleteDoc(id);
    setUploaded(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="page-enter">
      <input ref={uploadRef} type="file" multiple className="hidden" onChange={handleUpload}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv" />
      <SectionHeader title="Documents" subtitle="Governing docs, financial records, and AI-assisted drafting"
        action={<><Button variant="secondary" size="sm" onClick={() => uploadRef.current?.click()}><Upload size={12}/>Upload</Button><Button variant="primary" size="sm">Draft with AI</Button></>} />
      <Alert variant="warning" title="Collection Policy needs update — AB 130 fine caps">Update before next enforcement cycle.</Alert>
      <div className="grid grid-cols-2 gap-5">
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FolderOpen size={14} className="text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">Governing Documents</h3>
          </div>
          {govDocs.map(doc => {
            const st = dStMap[doc.status]||{l:'Current',c:'green'};
            return (
              <div key={doc.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-navy-600"/></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">{doc.version} · {doc.updated}</p>
                    {doc.note&&<p className="text-[11px] text-rose-600 font-semibold mt-0.5">{doc.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0"><Badge variant={st.c}>{st.l}</Badge><Button variant="ghost" size="sm">View</Button></div>
              </div>
            );
          })}
        </Card>
        <div className="space-y-5">
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileText size={14} className="text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">Financial Documents</h3>
            </div>
            {MOCK_FIN_DOCS.map(doc => (
              <div key={doc.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-emerald-600"/></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">{doc.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0"><Badge variant="green">Current</Badge><Button variant="ghost" size="sm">View</Button></div>
              </div>
            ))}
          </Card>

          {uploaded.length > 0 && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Upload size={14} className="text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">Uploaded Documents</h3></div>
                <span className="text-[10px] text-slate-400">{uploaded.length} file{uploaded.length !== 1 ? 's' : ''}</span>
              </div>
              {uploaded.map(doc => (
                <div key={doc.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-slate-400"/></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400">Uploaded {doc.uploadedAt}{doc.size ? ` · ${formatBytes(doc.size)}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.dataUrl
                      ? <a href={doc.dataUrl} download={doc.name}><Button variant="ghost" size="sm">Download</Button></a>
                      : <Button variant="ghost" size="sm" disabled>No preview</Button>}
                    <button onClick={() => deleteUploaded(doc.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><TrashDoc size={13}/></button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Picker Modal ─────────────────────────────────────────────────────

export function DocPickerModal({ existingIds = [], onAdd, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const uploaded = lsGetDocs();

  const allDocs = [
    ...MOCK_GOV_DOCS.map(d => ({ id: d.id, name: d.name, sub: `${d.version} · ${d.updated}`, category: 'Governing', dataUrl: null, size: 0, type: 'application/pdf' })),
    ...MOCK_FIN_DOCS.map(d => ({ id: d.id, name: d.name, sub: d.desc, category: 'Financial', dataUrl: null, size: 0, type: 'application/pdf' })),
    ...uploaded.map(d => ({ id: d.id, name: d.name, sub: `Uploaded ${d.uploadedAt}${d.size ? ' · ' + formatBytes(d.size) : ''}`, category: 'Uploaded', dataUrl: d.dataUrl, size: d.size, type: d.type })),
  ].filter(d => !existingIds.includes(d.id));

  const groups = ['Governing', 'Financial', 'Uploaded'];

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleAdd = () => {
    const docs = allDocs.filter(d => selected.has(d.id));
    onAdd(docs.map(d => ({ id: `docref-${d.id}-${Date.now()}`, name: d.name, size: d.size, type: d.type, dataUrl: d.dataUrl })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2"><FolderOpen size={15} className="text-slate-400"/><h2 className="text-sm font-semibold text-slate-900">Select from Document Library</h2></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><XIcon size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.map(group => {
            const items = allDocs.filter(d => d.category === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-6 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">{group} Documents</p>
                {items.map(doc => (
                  <label key={doc.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected.has(doc.id) ? 'bg-navy-600 border-navy-600' : 'border-slate-300'}`}
                      onClick={() => toggle(doc.id)}>
                      {selected.has(doc.id) && <Check size={10} className="text-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={12} className="text-navy-600" />
                    </div>
                    <div className="min-w-0 flex-1" onClick={() => toggle(doc.id)}>
                      <p className="text-xs font-medium text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{doc.sub}</p>
                    </div>
                    {doc.dataUrl && <Badge variant="green">File</Badge>}
                  </label>
                ))}
              </div>
            );
          })}
          {allDocs.length === 0 && <p className="px-6 py-8 text-sm text-slate-400 text-center italic">All documents already attached</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-slate-400">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={selected.size === 0}>
              <Paperclip size={11}/>Attach {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Communications ───────────────────────────────────────────────────────────
import { clsx } from 'clsx';
import { Send, Paperclip, FileText as FileIcon, X as XIcon, Image, Film, Archive, Sparkles, Reply, MailOpen, ChevronDown as ChevDown } from 'lucide-react';
import { useRef } from 'react';
import { Select, Textarea } from '../components/ui';
import { communicationsAPI } from '../lib/api';

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome — New Resident',
    category: 'resident',
    subject: 'Welcome to Oakwood Estates HOA!',
    body: `Dear [Owner Name],

Welcome to Oakwood Estates HOA! We're delighted to have you as part of our community at [Unit].

Here's what you need to know as a new resident:

• Monthly HOA dues of $150 are due on the 1st of each month
• Parking spaces assigned to your unit: [Parking Space(s)]
• Amenity access cards will be issued within 5 business days
• Please register on the resident portal to manage your account online

If you have any questions, don't hesitate to reach out to the board at board@oakwoodestates.org.

We look forward to being great neighbors!

Warm regards,
Oakwood Estates HOA Board of Directors`,
  },
  {
    id: 'violation_notice',
    label: 'Violation — First Notice',
    category: 'violation',
    subject: 'HOA Violation Notice — [Unit]',
    body: `Dear [Owner Name],

This letter serves as formal notice that a violation of the Oakwood Estates HOA Rules and Regulations has been recorded for your unit at [Unit].

Violation Details:
• Type: [Violation Type]
• Description: [Description]
• Date Observed: [Date]
• Fine Amount: $[Fine Amount]

You are required to remedy this violation within 14 days of this notice. Failure to do so may result in additional fines and/or escalation to the HOA's legal counsel.

To dispute this violation or request a hearing, please contact the board within 10 days.

Sincerely,
Oakwood Estates HOA Board`,
  },
  {
    id: 'violation_final',
    label: 'Violation — Final Notice',
    category: 'violation',
    subject: 'FINAL NOTICE — HOA Violation — [Unit]',
    body: `Dear [Owner Name],

This is a FINAL NOTICE regarding the unresolved violation at [Unit].

Our records indicate that despite our previous notice dated [Previous Notice Date], the violation described below remains unresolved:

• Type: [Violation Type]
• Original Fine: $[Fine Amount]
• Additional Late Fee: $[Late Fee]
• Total Amount Due: $[Total Due]

Immediate action is required. If this matter is not resolved within 7 days, we will refer this case to our legal counsel and pursue all available remedies under the CC&Rs, including liens against the property.

Sincerely,
Oakwood Estates HOA Board`,
  },
  {
    id: 'dues_reminder',
    label: 'Dues — Payment Reminder',
    category: 'dues',
    subject: 'HOA Dues Reminder — [Month] [Year]',
    body: `Dear [Owner Name],

This is a friendly reminder that your HOA dues of $150 for [Month] [Year] are due on [Due Date].

Payment Options:
• Online: Log in to the resident portal at portal.oakwoodestates.org
• Check: Payable to "Oakwood Estates HOA" — mail to PO Box 1234, Sacramento, CA 95814
• Auto-Pay: Enroll through the resident portal to avoid late fees

A late fee of $25 will be applied to accounts not paid by the 10th of the month.

If you have already submitted payment, please disregard this notice.

Thank you,
Oakwood Estates HOA Finance Committee`,
  },
  {
    id: 'dues_delinquent',
    label: 'Dues — Delinquency Notice',
    category: 'dues',
    subject: 'Past Due Balance Notice — [Unit]',
    body: `Dear [Owner Name],

Our records show that your account has an outstanding balance of $[Balance] as of [Date].

Account Summary:
• Unit: [Unit]
• Unpaid Dues: $[Unpaid Dues]
• Late Fees: $[Late Fees]
• Total Balance Due: $[Balance]

Please remit payment immediately to avoid further collection action. Accounts more than 60 days past due may be referred to our collections attorney, at which point additional legal fees will be added to the balance owed.

To set up a payment plan, please contact us at finance@oakwoodestates.org within 5 business days.

Sincerely,
Oakwood Estates HOA Board`,
  },
  {
    id: 'board_meeting',
    label: 'Meeting — Board Meeting Notice',
    category: 'board',
    subject: 'Notice of HOA Board Meeting — [Date]',
    body: `Dear Oakwood Estates Homeowner,

You are hereby notified that the Oakwood Estates HOA Board of Directors will hold a meeting on:

Date: [Date]
Time: [Time]
Location: [Location]

Agenda:
1. Call to order and roll call
2. Approval of previous meeting minutes
3. Treasurer's report
4. Committee reports
5. Old business
6. New business
7. Open forum — homeowner comments (5 minutes per speaker)
8. Adjournment

All homeowners are welcome and encouraged to attend. If you wish to add an item to the agenda, please submit your request in writing at least 72 hours before the meeting.

Oakwood Estates HOA Board of Directors`,
  },
  {
    id: 'annual_meeting',
    label: 'Meeting — Annual Meeting Notice',
    category: 'board',
    subject: 'Annual Homeowners Meeting — [Year]',
    body: `Dear Oakwood Estates Homeowner,

The Annual Homeowners Meeting of Oakwood Estates HOA will be held:

Date: [Date]
Time: [Time]
Location: [Location]

Items on the agenda include:
• Election of Board Members ([Seats Available] seats available)
• Presentation of [Year] Financial Report
• Approval of [Year+1] Budget
• Community updates and new business
• Open Q&A

A quorum requires [Quorum Number] homeowners or valid proxies. If you are unable to attend, please complete and return the enclosed proxy form to ensure your vote is counted.

Ballots and candidate bios will be distributed at the meeting.

Oakwood Estates HOA Board of Directors`,
  },
  {
    id: 'maintenance_notice',
    label: 'Maintenance — Scheduled Work Notice',
    category: 'maintenance',
    subject: 'Scheduled Maintenance Notice — [Area]',
    body: `Dear Oakwood Estates Resident,

Please be advised that scheduled maintenance will be performed on the following:

Area: [Area]
Date(s): [Dates]
Time: [Start Time] – [End Time]
Work Description: [Description]
Contractor: [Vendor Name]

During this time, [access restrictions if any]. We apologize for any inconvenience this may cause.

If you have questions or concerns, please contact the management office.

Thank you for your patience,
Oakwood Estates HOA Management`,
  },
  {
    id: 'vendor_welcome',
    label: 'Vendor — Welcome & Onboarding',
    category: 'vendor',
    subject: 'Welcome to Oakwood Estates HOA — Vendor Onboarding',
    body: `Dear [Vendor Name],

Thank you for partnering with Oakwood Estates HOA. We look forward to working with you.

To complete your onboarding, please provide the following documents:
• Certificate of Insurance (minimum $1M general liability)
• W-9 form
• Copy of contractor's license (if applicable)
• References from at least two HOA or commercial clients

Work Authorization:
• All work must be scheduled through the HOA manager
• Workers must check in at the management office upon arrival
• Work hours: Monday–Friday 8:00 AM – 5:00 PM (weekends by prior approval only)
• All debris and materials must be removed same day

Please return signed copies of the attached service agreement within 5 business days.

Oakwood Estates HOA Board of Directors`,
  },
  {
    id: 'newsletter',
    label: 'General — Community Newsletter',
    category: 'general',
    subject: '[Month] [Year] — Oakwood Estates Community Newsletter',
    body: `Dear Oakwood Estates Neighbors,

Here's your [Month] [Year] community update!

📋 BOARD UPDATES
[Board update content here]

🔧 MAINTENANCE & IMPROVEMENTS
[Maintenance update content here]

📅 UPCOMING EVENTS
[Events content here]

💰 FINANCIAL SNAPSHOT
[Financial summary here]

🏊 AMENITY REMINDERS
[Amenity reminder content here]

As always, thank you for making Oakwood Estates a wonderful community to live in. Questions or suggestions? Email us at board@oakwoodestates.org.

Warm regards,
Oakwood Estates HOA Board of Directors`,
  },
];

const TEMPLATE_CATEGORIES = [
  { id: 'all',         label: 'All Templates' },
  { id: 'resident',   label: 'Resident' },
  { id: 'violation',  label: 'Violations' },
  { id: 'dues',       label: 'Dues' },
  { id: 'board',      label: 'Board' },
  { id: 'maintenance',label: 'Maintenance' },
  { id: 'vendor',     label: 'Vendors' },
  { id: 'general',    label: 'General' },
];

const MOCK_COMMS = [
  { id:1, subject:'April 2026 Financial Statement', type:'financial',    sent:'All 148', channel:'Email + Portal', date:'Apr 26', openRate:91 },
  { id:2, subject:'AB 130 Fine Cap Alert',          type:'compliance',   sent:'All 148', channel:'Email + Portal', date:'Apr 20', openRate:78 },
  { id:3, subject:'April Board Meeting Minutes',    type:'board',        sent:'All 148', channel:'Portal',         date:'Apr 18', openRate:null },
  { id:4, subject:'60-Day Delinquency Notice',      type:'delinquency',  sent:'2 owners',channel:'Email + Mail',   date:'Apr 15', openRate:null },
  { id:5, subject:'Spring Community Newsletter',    type:'announcement', sent:'All 148', channel:'Email + Portal', date:'Apr 5',  openRate:84  },
];
const commTypeMap = { financial:'blue', compliance:'amber', board:'navy', delinquency:'red', announcement:'green' };

const MOCK_INBOX = [
  {
    id: 'in-1',
    from: 'Greenscape Landscaping',
    fromEmail: 'accounts@greenscape.com',
    fromType: 'vendor',
    subject: 'April 2026 Service Invoice #GS-2026-041',
    body: `Dear Oakwood Estates HOA Board,

Please find attached our invoice for April 2026 landscaping services performed at Oakwood Estates.

Invoice Details:
  Invoice Number: GS-2026-041
  Service Period:  April 1–30, 2026
  Amount Due:      $4,200.00
  Due Date:        May 15, 2026

Services rendered include weekly lawn maintenance, edging, fertilization (spring application), irrigation system inspection, and seasonal flower bed refresh for all common areas.

Please remit payment via check payable to "Greenscape Landscaping" or ACH to the account on file. A 1.5% monthly late fee applies after the due date.

Thank you for the continued partnership.

Warm regards,
Marcus Webb
Accounts Receivable
Greenscape Landscaping
accounts@greenscape.com | (916) 555-0182`,
    preview: 'Please find attached our invoice for April landscaping services…',
    date: 'May 2',
    hasInvoice: true,
    invoiceAmount: 4200,
    invoiceNumber: 'GS-2026-041',
    type: 'vendor_invoice',
    read: false,
  },
  {
    id: 'in-2',
    from: 'AquaCare Pool Services',
    fromEmail: 'billing@aquacare.com',
    fromType: 'vendor',
    subject: 'May 2026 Invoice #AQ-2026-051 + COI Renewal Notice',
    body: `Dear HOA Board,

We are writing to submit our May 2026 service invoice and to notify you of an upcoming Certificate of Insurance expiration.

Invoice Details:
  Invoice Number: AQ-2026-051
  Service Period:  May 1–31, 2026
  Amount Due:      $1,800.00
  Due Date:        June 1, 2026

COI Renewal Notice:
Our current Certificate of Insurance on file with your association expires on May 20, 2026. Our carrier is processing the renewal; we expect to provide the updated certificate by May 12. If you require the certificate holder language updated, please reply with the exact text and we will pass it along to our broker.

Please let us know if you have any questions about this invoice or the COI renewal.

Best,
Billing Department
AquaCare Pool Services
billing@aquacare.com | (916) 555-0247`,
    preview: 'May invoice and COI expiry reminder…',
    date: 'May 1',
    hasInvoice: true,
    invoiceAmount: 1800,
    invoiceNumber: 'AQ-2026-051',
    type: 'vendor_invoice',
    read: false,
  },
  {
    id: 'in-3',
    from: 'ProPlumb Emergency',
    fromEmail: 'service@proplumb.com',
    fromType: 'vendor',
    subject: 'Emergency Repair Invoice #PP-2026-0418 — Main Water Line',
    body: `Dear Oakwood Estates HOA,

Please find the invoice for the emergency main water line repair performed on April 18, 2026.

Invoice Details:
  Invoice Number: PP-2026-0418
  Date of Service: April 18, 2026
  Amount Due:      $1,840.00

Breakdown:
  Labor (4.5 hrs @ $120/hr):          $540.00
  Materials (couplings, PVC, fittings): $680.00
  Emergency/after-hours surcharge:      $350.00
  Permit & inspection fee:              $270.00

Work performed: Isolated and repaired 3-foot section of main supply line near building 2 crawl space. Pressure tested to 150 PSI post-repair. All work completed per local plumbing code.

Payment is due within 30 days of this invoice date.

Regards,
ProPlumb Emergency Services
service@proplumb.com | (916) 555-0319`,
    preview: 'Invoice for emergency main water line repair April 18…',
    date: 'Apr 19',
    hasInvoice: true,
    invoiceAmount: 1840,
    invoiceNumber: 'PP-2026-0418',
    type: 'vendor_invoice',
    read: true,
  },
  {
    id: 'in-4',
    from: 'SecureWatch Security',
    fromEmail: 'ops@securewatch.com',
    fromType: 'vendor',
    subject: 'Incident Report — Apr 28 — Vehicle Break-In near Unit 33',
    body: `Dear Oakwood Estates HOA Board,

This message serves as our formal Incident Report for the vehicle break-in event recorded near Unit 33 on April 28, 2026 at approximately 11:42 PM.

Incident Summary:
  Date/Time:    April 28, 2026 — 11:42 PM
  Location:     Parking structure, Level 1, near Unit 33
  Description:  Vehicle window broken, personal items removed. Responding patrol notified Sacramento PD (Case #26-0428-1183).

Footage: 3-minute clip retained from Camera CAM-07. Resolution was adequate to capture the incident but insufficient for license plate identification.

Camera Upgrade Proposal:
We recommend installing 2 additional high-definition PTZ cameras to eliminate the current blind spot in the Level 1 parking area. Estimated cost: $2,400 (equipment + installation). This would provide full coverage of all 48 parking stalls.

We will forward the video clip upon written request. Please advise if you wish to proceed with the camera upgrade proposal.

Regards,
Operations Team
SecureWatch Security
ops@securewatch.com | (916) 555-0410`,
    preview: 'Security incident recorded near Unit 33 parking April 28…',
    date: 'Apr 29',
    hasInvoice: false,
    type: 'vendor',
    read: true,
  },
  {
    id: 'in-5',
    from: 'Greenscape Landscaping',
    fromEmail: 'accounts@greenscape.com',
    fromType: 'vendor',
    subject: 'Re: March Invoice #GS-2026-031 — Payment Confirmed',
    body: `Dear Oakwood Estates HOA Board,

We are writing to confirm receipt of payment for our March 2026 invoice.

Payment Details:
  Invoice Number: GS-2026-031
  Amount Received: $4,200.00
  Date Received:   April 8, 2026
  Outstanding Balance on March Services: $0.00

Thank you for your prompt payment. We appreciate the continued relationship with Oakwood Estates and look forward to another great month of service in April.

Please do not hesitate to reach out with any questions.

Best regards,
Marcus Webb
Accounts Receivable
Greenscape Landscaping
accounts@greenscape.com`,
    preview: 'Payment of $4,200 confirmed for March services…',
    date: 'Apr 10',
    hasInvoice: false,
    type: 'vendor',
    read: true,
  },
  {
    id: 'in-6',
    from: 'Diana Foster',
    fromEmail: 'd.foster@email.com',
    fromType: 'resident',
    subject: 'Question About HOA Dues Balance — Unit 12',
    body: `Dear HOA Board,

I am writing regarding a notice I received about an outstanding balance of $150 on my account for Unit 12.

I believe I may have already submitted this payment via check mailed on approximately April 1, 2026. The check was drawn on my Wells Fargo account. If the payment has not been received or posted, I am happy to provide a copy of the cancelled check as proof of payment.

Could you please review my account and let me know the current status? I want to ensure this is resolved promptly and does not affect my standing with the association.

Thank you for your time.

Best regards,
Diana Foster
Unit 12 — Oakwood Estates
d.foster@email.com`,
    preview: 'I received a notice about an outstanding $150 balance…',
    date: 'Apr 28',
    hasInvoice: false,
    type: 'resident',
    read: false,
  },
  {
    id: 'in-7',
    from: 'Carlos Rivera',
    fromEmail: 'c.rivera@email.com',
    fromType: 'resident',
    subject: 'Parking Violation Dispute — Unit 44 — April 15',
    body: `Dear Oakwood Estates HOA Board,

I am writing to formally dispute the parking violation notice and $100 fine issued to my unit (Unit 44) on April 15, 2026.

I was out of town from April 12 through April 17, 2026, and therefore could not have parked in violation of any association rules during that period. I have hotel receipts and credit card statements from my travel that confirm my absence.

I respectfully request that this fine be waived and removed from my account. I am available to present documentation at a hearing if required. Per California Civil Code § 5855, I understand I have the right to request a hearing within 10 days of this notice.

Please confirm receipt of this dispute and advise on next steps.

Sincerely,
Carlos Rivera
Unit 44 — Oakwood Estates
c.rivera@email.com`,
    preview: 'Writing to formally dispute the parking violation issued April 15…',
    date: 'Apr 27',
    hasInvoice: false,
    type: 'resident',
    read: false,
  },
];

const catColors = { resident:'green', violation:'red', dues:'amber', board:'navy', maintenance:'blue', vendor:'purple', general:'gray' };

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <Image size={11} />;
  if (['mp4','mov','avi','mkv'].includes(ext)) return <Film size={11} />;
  if (['zip','rar','tar','gz'].includes(ext)) return <Archive size={11} />;
  return <FileIcon size={11} />;
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function generateAiDraft(email) {
  const sig = `Best regards,\nOakwood Estates HOA Board\nboard@oakwoodestates.org`;
  const sub = (email.subject || '').toLowerCase();
  const fromName = email.from || 'you';

  if (email.fromType === 'vendor' && email.hasInvoice) {
    const hasCOI = sub.includes('coi') || sub.includes('certificate') || sub.includes('insurance');
    let body = `Dear ${fromName},\n\nThank you for submitting Invoice #${email.invoiceNumber || 'N/A'} in the amount of $${(email.invoiceAmount || 0).toLocaleString()}. We have received it and will process payment within 30 days per our standard net-30 terms.\n\n`;
    if (hasCOI) {
      body += `Regarding the COI renewal: please send the updated certificate to board@oakwoodestates.org with the following certificate holder information:\n\n  Oakwood Estates HOA\n  c/o Board of Directors\n  PO Box 1234, Sacramento, CA 95814\n\nPlease ensure the policy reflects a minimum of $1,000,000 in general liability coverage.\n\n`;
    }
    body += `Please don't hesitate to reach out if you have any questions.\n\n${sig}`;
    return body;
  }

  if (sub.includes('coi') || sub.includes('certificate') || sub.includes('insurance')) {
    return `Dear ${fromName},\n\nThank you for your message. Please send the updated Certificate of Insurance to board@oakwoodestates.org.\n\nCertificate holder information:\n  Oakwood Estates HOA\n  c/o Board of Directors\n  PO Box 1234, Sacramento, CA 95814\n\nPlease ensure the policy reflects a minimum of $1,000,000 in general liability coverage and names Oakwood Estates HOA as an additional insured.\n\n${sig}`;
  }

  if (sub.includes('incident') || sub.includes('report') || sub.includes('break-in')) {
    return `Dear ${fromName},\n\nThank you for the incident report. We appreciate SecureWatch's prompt response and documentation.\n\nThe board will review the incident details and the camera upgrade proposal at our next meeting. We will follow up with a decision within 5 business days.\n\nPlease retain the video footage and forward a copy to board@oakwoodestates.org at your earliest convenience.\n\n${sig}`;
  }

  if (sub.includes('payment confirmed') || sub.includes('payment received')) {
    return `Dear ${fromName},\n\nThank you for the payment confirmation. We appreciate your prompt communication and continued quality of service to Oakwood Estates.\n\nWe look forward to our ongoing partnership.\n\n${sig}`;
  }

  if (email.fromType === 'resident' && (sub.includes('dues') || sub.includes('balance'))) {
    return `Dear ${fromName},\n\nThank you for reaching out. We understand your concern regarding the outstanding balance on your account.\n\nOur finance team will review your payment records within 2 business days. To assist with the investigation, please provide the following if available:\n  • Check number\n  • Date the check was mailed\n  • Copy of the cancelled check or bank statement showing the cleared payment\n\nWe will follow up with you promptly. We appreciate your cooperation in resolving this matter.\n\n${sig}`;
  }

  if (email.fromType === 'resident' && (sub.includes('violation') || sub.includes('dispute') || sub.includes('fine'))) {
    return `Dear ${fromName},\n\nThank you for submitting your formal dispute. We have received your request and will process it in accordance with our dispute resolution procedures.\n\nPer California Civil Code § 5855, a hearing will be scheduled within 10 days of this notice. You will receive written confirmation of the hearing date and time.\n\nPlease compile any supporting documentation (receipts, photos, statements) to present at the hearing. If you have questions in the meantime, please reply to this email.\n\n${sig}`;
  }

  return `Dear ${fromName},\n\nThank you for your message. We have received your inquiry and will follow up within 2 business days.\n\nIf this matter is urgent, please call our management line at (916) 555-0100.\n\n${sig}`;
}

export function AttachmentChip({ file, onRemove }) {
  const content = (
    <div className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors',
      file.dataUrl ? 'bg-navy-50 border-navy-100 text-navy-700 hover:bg-navy-100 cursor-pointer' : 'bg-slate-50 border-slate-200 text-slate-600',
    )}>
      <span className="flex-shrink-0 text-slate-400">{fileIcon(file.name)}</span>
      <span className="font-medium truncate max-w-[140px]">{file.name}</span>
      <span className="text-slate-400 flex-shrink-0">{formatBytes(file.size)}</span>
      {onRemove && (
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(file.id); }}
          className="ml-0.5 text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0">
          <XIcon size={10} />
        </button>
      )}
    </div>
  );
  return file.dataUrl
    ? <a href={file.dataUrl} download={file.name}>{content}</a>
    : content;
}

const COMMS_LS_KEY = 'hoa_comms_v1';
export function lsGetComms() {
  try { return JSON.parse(localStorage.getItem(COMMS_LS_KEY) || '[]'); } catch { return []; }
}
function lsSaveComm(msg) {
  try {
    const list = lsGetComms();
    list.unshift(msg);
    localStorage.setItem(COMMS_LS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

function InboxEmailRow({ email, onReplyAdded }) {
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [replied, setReplied] = useState(false);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const startGenerating = (ms = 700) => {
    setGenerating(true);
    setTimeout(() => {
      setDraft(generateAiDraft(email));
      setGenerating(false);
    }, ms);
  };

  const handleRespond = (e) => {
    e.stopPropagation();
    setReplying(true);
    startGenerating(700);
  };

  const handleRegenerate = () => {
    setDraft('');
    startGenerating(500);
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    const msg = {
      id: Date.now(),
      subject: `Re: ${email.subject}`,
      body: draft,
      type: email.fromType === 'vendor' ? 'vendor' : 'resident',
      sent: email.from,
      channel: 'Email',
      date: today,
      openRate: null,
    };
    lsSaveComm(msg);
    setReplied(true);
    setReplying(false);
    if (onReplyAdded) onReplyAdded(msg);
  };

  const fromTypeBadgeClass = email.fromType === 'vendor'
    ? 'bg-purple-100 text-purple-700 border border-purple-200'
    : 'bg-emerald-100 text-emerald-700 border border-emerald-200';

  return (
    <div className={clsx('border-b border-slate-50 last:border-0 transition-colors', !email.read && 'bg-blue-50/40')}>
      {/* Row header */}
      <div className="px-5 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(v => !v)}>
        {/* Unread dot */}
        <div className="flex-shrink-0 mt-1.5">
          {!email.read && !replied
            ? <div className="w-2 h-2 rounded-full bg-blue-500" />
            : <div className="w-2 h-2" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', fromTypeBadgeClass)}>
              {email.fromType === 'vendor' ? 'Vendor' : 'Resident'}
            </span>
            {email.hasInvoice && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                Invoice ${(email.invoiceAmount || 0).toLocaleString()}
              </span>
            )}
            {replied && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                Replied ✓
              </span>
            )}
          </div>
          <p className={clsx('text-sm truncate', !email.read && !replied ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{email.subject}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{email.from} · {email.fromEmail} · {email.date}</p>
          {!expanded && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{email.preview}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!replied && (
            <button onClick={handleRespond}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-navy-600 bg-navy-50 border border-navy-200 rounded-lg hover:bg-navy-100 transition-colors">
              <Reply size={11} />Respond
            </button>
          )}
          <ChevDown size={13} className={clsx('text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-3">
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">{email.body}</pre>
        </div>
      )}

      {/* Reply panel */}
      {replying && (
        <div className="px-5 pb-4 pt-1 bg-white border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-600">Replying to {email.from}</p>
            <div className="flex items-center gap-2">
              <button onClick={handleRegenerate} disabled={generating}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
                <Sparkles size={10} />Regenerate AI Draft
              </button>
              <button onClick={() => setReplying(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
          {generating ? (
            <div className="flex items-center gap-2 px-3 py-6 bg-slate-50 rounded-lg border border-slate-100">
              <Sparkles size={14} className="text-purple-400 animate-pulse" />
              <span className="text-xs text-slate-500 italic">Generating AI response…</span>
            </div>
          ) : (
            <textarea rows={8} value={draft} onChange={e => setDraft(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all resize-y font-mono" />
          )}
          <div className="flex justify-end mt-2">
            <button onClick={handleSend} disabled={generating || !draft.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-40">
              <Send size={11} />Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Communications() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('Email + Portal');
  const [recipients, setRecipients] = useState('All homeowners (148)');
  const [templateCat, setTemplateCat] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [extra, setExtra] = useState(() => lsGetComms());
  const [inbox] = useState(() => MOCK_INBOX);
  const fileInputRef = useRef(null);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const { data: history } = useQuery({ queryKey:['comms'], queryFn:()=>communicationsAPI.history(getCommunityId()).then(r=>r.data), placeholderData:[] });
  const comms = [...extra, ...(history?.length ? history : MOCK_COMMS)];

  const filteredTemplates = templateCat === 'all' ? EMAIL_TEMPLATES : EMAIL_TEMPLATES.filter(t => t.category === templateCat);

  const applyTemplate = (tpl) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setSelectedTemplate(tpl.id);
    setShowTemplates(false);
  };

  const handleFiles = (e) => {
    const MAX = 5 * 1024 * 1024; // 5MB per file, store dataUrl
    Array.from(e.target.files || []).forEach(file => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (file.size <= MAX) {
        const reader = new FileReader();
        reader.onload = (ev) => setAttachments(prev => [...prev, { id, name: file.name, size: file.size, type: file.type, dataUrl: ev.target.result }]);
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, { id, name: file.name, size: file.size, type: file.type, dataUrl: null }]);
      }
    });
    e.target.value = '';
  };

  const removeAttachment = (id) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    const tpl = selectedTemplate ? EMAIL_TEMPLATES.find(t => t.id === selectedTemplate) : null;
    const msg = {
      id: Date.now(),
      subject,
      body,
      type: tpl?.category || 'announcement',
      sent: recipients,
      channel,
      date: today,
      openRate: null,
      residentTarget: null,
      attachments: attachments.map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type, dataUrl: a.dataUrl })),
    };
    try {
      await communicationsAPI.send({ subject, body, channel, recipients, communityId: getCommunityId() });
    } catch {}
    lsSaveComm(msg);
    setExtra(prev => [msg, ...prev]);
    setSubject('');
    setBody('');
    setSelectedTemplate('');
    setAttachments([]);
    setSending(false);
  };

  return (
    <div className="page-enter">
      <SectionHeader title="Communications" subtitle="Email, portal, SMS, and physical mail delivery" />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-4"><Send size={14} className="text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">Compose Message</h3></div>
          <div className="space-y-3">

            {/* Template selector */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Template</label>
              <button onClick={() => setShowTemplates(v => !v)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-left text-slate-700 hover:border-navy-300 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all flex items-center justify-between">
                <span className={selectedTemplate ? 'text-slate-800' : 'text-slate-400'}>
                  {selectedTemplate ? EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)?.label : 'Select a template…'}
                </span>
                <svg className={clsx('w-4 h-4 text-slate-400 transition-transform', showTemplates && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>

              {showTemplates && (
                <div className="mt-1 border border-slate-200 rounded-xl shadow-lg bg-white overflow-hidden z-10 relative">
                  {/* Category filter tabs */}
                  <div className="flex overflow-x-auto gap-1 p-2 border-b border-slate-100 bg-slate-50">
                    {TEMPLATE_CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setTemplateCat(c.id)}
                        className={clsx('px-2.5 py-1 text-[10px] font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0',
                          templateCat === c.id ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-slate-200')}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {/* Template list */}
                  <div className="max-h-56 overflow-y-auto">
                    {filteredTemplates.map(tpl => (
                      <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                        className="w-full text-left px-4 py-3 hover:bg-navy-50 border-b border-slate-50 last:border-0 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant={catColors[tpl.category] || 'gray'} className="flex-shrink-0 capitalize">{tpl.category}</Badge>
                          <p className="text-xs font-medium text-slate-800 truncate">{tpl.label}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{tpl.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Board Meeting — May 15, 2026"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Message</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Type your message or select a template above…" rows={10}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all resize-y font-mono"/>
            </div>

            {/* Attachments */}
            <div>
              {showDocPicker && (
                <DocPickerModal
                  existingIds={attachments.map(a => a.sourceDocId).filter(Boolean)}
                  onAdd={(docs) => setAttachments(prev => [...prev, ...docs])}
                  onClose={() => setShowDocPicker(false)}
                />
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv" />
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:border-navy-300 hover:text-navy-600 hover:bg-navy-50 transition-all">
                  <Paperclip size={11} />Attach files
                </button>
                <button type="button" onClick={() => setShowDocPicker(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:border-navy-300 hover:text-navy-600 hover:bg-navy-50 transition-all">
                  <FolderOpen size={11} />From Documents
                </button>
                {attachments.map(a => (
                  <AttachmentChip key={a.id} file={a} onRemove={removeAttachment} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Send via</label>
                <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
                  <option>Email + Portal</option><option>Email only</option><option>Portal only</option><option>All channels</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipients</label>
                <select value={recipients} onChange={e => setRecipients(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
                  <option>All homeowners (148)</option><option>Delinquent accounts</option><option>Board members</option><option>Vendors</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              {selectedTemplate && (
                <button onClick={() => { setSelectedTemplate(''); setSubject(''); setBody(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  Clear
                </button>
              )}
              <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={handleSend} disabled={sending}>
                <Send size={12}/>{sending ? 'Sending…' : 'Send Message'}
              </Button>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          {/* Inbox section */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MailOpen size={14} className="text-slate-400"/>
                <h3 className="text-sm font-semibold text-slate-700">Inbox — Received from Vendors &amp; Residents</h3>
              </div>
              {inbox.filter(e => !e.read).length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {inbox.filter(e => !e.read).length} unread
                </span>
              )}
            </div>
            {inbox.map(e => (
              <InboxEmailRow key={e.id} email={e} onReplyAdded={msg => setExtra(prev => [msg, ...prev])} />
            ))}
          </Card>
          {/* Sent section */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Sent Communications</h3></div>
            {comms.map(c => (
              <div key={c.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5"><Badge variant={commTypeMap[c.type]||'gray'}>{c.type}</Badge></div>
                    <p className="text-sm font-medium text-slate-800 truncate">{c.subject}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.sent} · {c.channel} · {c.date}</p>
                    {c.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.attachments.map(a => <AttachmentChip key={a.id} file={a} />)}
                      </div>
                    )}
                  </div>
                  {c.openRate&&<div className="text-right flex-shrink-0"><p className="text-sm font-bold text-emerald-600">{c.openRate}%</p><p className="text-[10px] text-slate-400">opened</p></div>}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Communities ──────────────────────────────────────────────────────────────
import { Building2, ChevronRight } from 'lucide-react';
import { communityAPI } from '../lib/api';

const MOCK_COMMUNITIES = [
  { id:1, name:'Oakwood Estates HOA',  units:148, type:'Self-managed',  state:'California', tier:'Full Service',          active:true  },
  { id:2, name:'Maplewood Commons',    units:72,  type:'Management Co.',state:'California', tier:'Software + Compliance', active:false },
  { id:3, name:'Sunrise Ridge Condos', units:240, type:'Management Co.',state:'Florida',    tier:'Enterprise',            active:false },
];
const tierColors = { 'Full Service':'green', 'Software + Compliance':'blue', 'Enterprise':'navy', 'Software Only':'gray' };

export function Communities({ onNavigate }) {
  const { data: list } = useQuery({ queryKey:['communities'], queryFn:()=>communityAPI.list().then(r=>r.data), placeholderData:MOCK_COMMUNITIES });
  const communities = list || MOCK_COMMUNITIES;

  return (
    <div className="page-enter">
      <SectionHeader title="Communities" subtitle="Manage all your HOA communities"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Community</Button>} />
      <div className="space-y-4">
        {communities.map(c => (
          <Card key={c.id} className={`cursor-pointer hover:shadow-card-hover transition-shadow ${c.active?'border-navy-300':''}`} onClick={()=>c.active&&onNavigate('dashboard')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.active?'bg-navy-700':'bg-slate-100'}`}>
                  <Building2 size={20} className={c.active?'text-white':'text-slate-400'}/>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
                    {c.active&&<Badge variant="navy">Active</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{c.units} units</span><span className="text-slate-300">·</span>
                    <span>{c.type}</span><span className="text-slate-300">·</span>
                    <span>{c.state}</span><span className="text-slate-300">·</span>
                    <Badge variant={tierColors[c.tier]||'gray'}>{c.tier}</Badge>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300"/>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
