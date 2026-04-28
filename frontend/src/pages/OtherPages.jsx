// ─── Tax ─────────────────────────────────────────────────────────────────────
import { Download, Receipt } from 'lucide-react';
import { MetricCard, Card, Badge, Alert, Button, SectionHeader, formatCurrency } from '../components/ui';

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
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import { Table, Th, Td, Tr, Tabs } from '../components/ui';
import { violationsAPI } from '../lib/api';

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

export function Violations() {
  const { data: list } = useQuery({ queryKey:['violations'], queryFn:()=>violationsAPI.list(1).then(r=>r.data), placeholderData:MOCK_VIOLATIONS });
  const violations = list || MOCK_VIOLATIONS;

  return (
    <div className="page-enter">
      <SectionHeader title="Violations" subtitle="Issue legally compliant notices with attorney-reviewed templates"
        action={<Button variant="primary" size="sm"><Plus size={12}/>New Violation</Button>} />
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

export function Maintenance() {
  const { data: list } = useQuery({ queryKey:['maintenance'], queryFn:()=>maintenanceAPI.list(1).then(r=>r.data), placeholderData:MOCK_WORK_ORDERS });
  const orders = list || MOCK_WORK_ORDERS;

  return (
    <div className="page-enter">
      <SectionHeader title="Maintenance" subtitle="Work orders with SB 900 14-day SLA tracking"
        action={<Button variant="primary" size="sm"><Plus size={12}/>New Work Order</Button>} />
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
import { vendorAPI } from '../lib/api';

const MOCK_VENDORS = [
  { id:1, name:'Greenscape Landscaping', category:'Landscaping',       contractExp:'Dec 31, 2025', coiStatus:'valid',    w9:true, annualSpend:50400 },
  { id:2, name:'AquaCare Pool Services', category:'Pool & Spa',         contractExp:'Jun 30, 2025', coiStatus:'expiring', w9:true, annualSpend:21600, coiExp:'May 20' },
  { id:3, name:'ProPlumb Emergency',     category:'Plumbing',           contractExp:'Ongoing',      coiStatus:'valid',    w9:true, annualSpend:18400 },
  { id:4, name:'SecureWatch Security',   category:'Security',           contractExp:'Sep 30, 2025', coiStatus:'expiring', w9:true, annualSpend:38400, coiExp:'May 14' },
  { id:5, name:'PaintRight Contractors', category:'Painting & General', contractExp:'Project-based',coiStatus:'valid',    w9:true, annualSpend:12000 },
  { id:6, name:'Metro Collection Group', category:'Collections',        contractExp:'Ongoing',      coiStatus:'valid',    w9:true, annualSpend:4200  },
  { id:7, name:'SecureLock Inc.',        category:'Locksmith & Gates',  contractExp:'Ongoing',      coiStatus:'valid',    w9:true, annualSpend:6800  },
];

export function Vendors() {
  const { data: list } = useQuery({ queryKey:['vendors'], queryFn:()=>vendorAPI.list(1).then(r=>r.data), placeholderData:MOCK_VENDORS });
  const vendors = list || MOCK_VENDORS;
  const expiring = vendors.filter(v=>v.coiStatus==='expiring').length;

  return (
    <div className="page-enter">
      <SectionHeader title="Vendors" subtitle="Contract management, COI tracking, and 1099 compliance"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Vendor</Button>} />
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
                <Td><span className="font-semibold text-slate-800">{v.name}</span></Td>
                <Td><Badge variant="gray">{v.category}</Badge></Td>
                <Td className="text-xs text-slate-500">{v.contractExp}</Td>
                <Td>
                  <Badge variant={v.coiStatus==='valid'?'green':'red'}>{v.coiStatus==='valid'?'Valid':'Expiring'}</Badge>
                  {v.coiExp&&<p className="text-[10px] text-rose-500 mt-0.5">Exp: {v.coiExp}</p>}
                </Td>
                <Td><Badge variant={v.w9?'green':'red'}>{v.w9?'On file':'Missing'}</Badge></Td>
                <Td className="font-semibold">${(v.annualSpend/1000).toFixed(1)}K</Td>
                <Td><div className="flex gap-1.5"><Button variant="ghost" size="sm">View</Button>{v.coiStatus==='expiring'&&<Button variant="danger" size="sm">Renew COI</Button>}</div></Td>
              </Tr>
            ))}</tbody>
          </Table>
        </div>
      </Card>
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
  const filtered = useMemo(()=>residents.filter(r=>r.owner.toLowerCase().includes(search.toLowerCase())||r.unit.toLowerCase().includes(search.toLowerCase())),[search, residents]);

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
import { FileText, FolderOpen, Upload } from 'lucide-react';
import { documentAPI } from '../lib/api';

const MOCK_GOV_DOCS = [
  { id:1, name:"CC&Rs — Oakwood Estates", version:'v3.2', updated:'Jan 2025', status:'current',      note:null },
  { id:2, name:'Bylaws',                  version:'v2.1', updated:'Mar 2024', status:'current',      note:null },
  { id:3, name:'Rules & Regulations',     version:'v4.0', updated:'Jan 2026', status:'current',      note:null },
  { id:4, name:'Collection Policy',       version:'v1.8', updated:'Dec 2024', status:'needs_update', note:'Needs update for AB 130 fine caps' },
  { id:5, name:'Solar Panel Policy',      version:'v1.0', updated:'Mar 2025', status:'current',      note:null },
  { id:6, name:'Architectural Guidelines',version:'v2.0', updated:'Jun 2023', status:'review_needed',note:'Over 2 years since last review' },
  { id:7, name:'Pet Policy',              version:'v1.5', updated:'Feb 2024', status:'current',      note:null },
  { id:8, name:'Parking Policy',          version:'v3.1', updated:'Jan 2026', status:'current',      note:null },
];
const MOCK_FIN_DOCS = [
  { id:1, name:'2026 Annual Budget',              desc:'CA Civil Code 5300 compliant' },
  { id:2, name:'Reserve Fund Study 2024',          desc:'61% funded — next due 2027' },
  { id:3, name:'April 2026 Financial Statement',   desc:'Auto-generated and distributed' },
  { id:4, name:'2025 Annual Audit Report',         desc:'CPA reviewed and filed' },
  { id:5, name:'Insurance Certificate 2026',       desc:'$5M general liability' },
];
const dStMap = { current:{l:'Current',c:'green'}, needs_update:{l:'Needs Update',c:'red'}, review_needed:{l:'Review Recommended',c:'amber'} };

export function Documents() {
  const { data: docs } = useQuery({ queryKey:['documents'], queryFn:()=>documentAPI.list(1).then(r=>r.data), placeholderData:MOCK_GOV_DOCS });
  const govDocs = docs || MOCK_GOV_DOCS;

  return (
    <div className="page-enter">
      <SectionHeader title="Documents" subtitle="Governing docs, financial records, and AI-assisted drafting"
        action={<><Button variant="secondary" size="sm"><Upload size={12}/>Upload</Button><Button variant="primary" size="sm">Draft with AI</Button></>} />
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
      </div>
    </div>
  );
}

// ─── Communications ───────────────────────────────────────────────────────────
import { Send } from 'lucide-react';
import { Select, Textarea } from '../components/ui';
import { communicationsAPI } from '../lib/api';

const MOCK_COMMS = [
  { id:1, subject:'April 2026 Financial Statement', type:'financial',    sent:'All 148', channel:'Email + Portal', date:'Apr 26', openRate:91 },
  { id:2, subject:'AB 130 Fine Cap Alert',          type:'compliance',   sent:'All 148', channel:'Email + Portal', date:'Apr 20', openRate:78 },
  { id:3, subject:'April Board Meeting Minutes',    type:'board',        sent:'All 148', channel:'Portal',         date:'Apr 18', openRate:null },
  { id:4, subject:'60-Day Delinquency Notice',      type:'delinquency',  sent:'2 owners',channel:'Email + Mail',   date:'Apr 15', openRate:null },
  { id:5, subject:'Spring Community Newsletter',    type:'announcement', sent:'All 148', channel:'Email + Portal', date:'Apr 5',  openRate:84  },
];
const commTypeMap = { financial:'blue', compliance:'amber', board:'navy', delinquency:'red', announcement:'green' };

export function Communications() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const { data: history } = useQuery({ queryKey:['comms'], queryFn:()=>communicationsAPI.history(1).then(r=>r.data), placeholderData:MOCK_COMMS });
  const comms = history || MOCK_COMMS;

  return (
    <div className="page-enter">
      <SectionHeader title="Communications" subtitle="Email, portal, SMS, and physical mail delivery" />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-4"><Send size={14} className="text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">Send Announcement</h3></div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Board Meeting — May 15, 2026"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Message</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Type your message to homeowners..." rows={5}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all resize-y"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Send via</label>
                <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
                  <option>Email + Portal</option><option>Email only</option><option>Portal only</option><option>All channels</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipients</label>
                <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
                  <option>All homeowners (148)</option><option>Delinquent accounts</option><option>Board members</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm">AI Draft</Button>
              <Button variant="primary" size="sm" className="flex-1 justify-center"><Send size={12}/>Send to Homeowners</Button>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Recent Communications</h3></div>
          {comms.map(c => (
            <div key={c.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5"><Badge variant={commTypeMap[c.type]||'gray'}>{c.type}</Badge></div>
                  <p className="text-sm font-medium text-slate-800 truncate">{c.subject}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.sent} · {c.channel} · {c.date}</p>
                </div>
                {c.openRate&&<div className="text-right flex-shrink-0"><p className="text-sm font-bold text-emerald-600">{c.openRate}%</p><p className="text-[10px] text-slate-400">opened</p></div>}
              </div>
            </div>
          ))}
        </Card>
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
