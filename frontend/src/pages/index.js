// All remaining pages follow the same pattern:
// 1. useQuery to fetch from API
// 2. placeholderData with mock while API is being built
// 3. Full UI render
// Each file should be split into its own file in production.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, Plus, Send, FileText, FolderOpen, Upload,
  Search, ChevronRight, Building2, Receipt
} from 'lucide-react';
import {
  MetricCard, Card, CardHeader, Badge, Alert, Button, Tabs,
  Table, Th, Td, Tr, SectionHeader, StatusDot, ProgressBar,
  Input, Select, Textarea, LoadingSpinner, formatCurrency
} from '../components/ui';
import {
  complianceAPI, duesAPI, accountingAPI, violationsAPI,
  maintenanceAPI, vendorAPI, residentAPI, documentAPI,
  communicationsAPI, taxAPI, communityAPI
} from '../lib/api';

// ─── Shared mock data ────────────────────────────────────────────────────────
const MOCK_DELINQUENT = [
  { id:1, unit:'Unit 33',  owner:'Michael Torres', daysPastDue:92, amount:900, status:'collections' },
  { id:2, unit:'Unit 67',  owner:'Amanda Liu',     daysPastDue:61, amount:300, status:'escalated'   },
  { id:3, unit:'Unit 104', owner:'Robert Patel',   daysPastDue:61, amount:150, status:'escalated'   },
  { id:4, unit:'Unit 12',  owner:'Diana Foster',   daysPastDue:32, amount:150, status:'reminder'    },
  { id:5, unit:'Unit 55',  owner:'Kevin Zhang',    daysPastDue:32, amount:150, status:'reminder'    },
];
const MOCK_PAYMENTS = [
  { id:1, unit:'Unit 42', owner:'Sarah Chen',    amount:150, method:'ACH',   date:'Apr 26', status:'cleared'    },
  { id:2, unit:'Unit 7',  owner:'James Okonkwo', amount:150, method:'Card',  date:'Apr 25', status:'cleared'    },
  { id:3, unit:'Unit 119',owner:'Maria Garcia',  amount:150, method:'ACH',   date:'Apr 25', status:'processing' },
];
const MOCK_FINANCIALS = [
  { month:'Nov', income:20800, expenses:17200 }, { month:'Dec', income:21000, expenses:19800 },
  { month:'Jan', income:20200, expenses:16900 }, { month:'Feb', income:21600, expenses:17400 },
  { month:'Mar', income:21900, expenses:18100 }, { month:'Apr', income:22348, expenses:18205 },
];
const MOCK_EXPENSES = [
  { category:'Landscaping', vendor:'Greenscape',  amount:4200 },
  { category:'Pool & Spa',  vendor:'AquaCare',    amount:1800 },
  { category:'Security',    vendor:'SecureWatch',  amount:3200 },
  { category:'Insurance',   vendor:'HOA Mutual',   amount:2400 },
  { category:'Utilities',   vendor:'Various',      amount:1950 },
  { category:'Administrative',vendor:'Internal',   amount:820  },
  { category:'Reserve',     vendor:'Reserve fund', amount:3835 },
];
const MOCK_VIOLATIONS = [
  { id:1, unit:'Unit 88', owner:'Laura Kim',     type:'Parking',     description:'Vehicle in fire lane',              fine:75,  issuedDate:'Apr 26', status:'notice_sent'       },
  { id:2, unit:'Unit 21', owner:'Priya Sharma',  type:'Parking',     description:'Guest spot 7+ days',               fine:50,  issuedDate:'Apr 24', status:'hearing_pending'   },
  { id:3, unit:'Unit 65', owner:'Tyler Brooks',  type:'Landscaping', description:'Unapproved yard modification',      fine:100, issuedDate:'Apr 22', status:'escalated'         },
  { id:4, unit:'Unit 44', owner:'Carlos Rivera', type:'Noise',       description:'Repeated late-night disturbance',  fine:100, issuedDate:'Apr 15', status:'hearing_scheduled' },
  { id:5, unit:'Unit 77', owner:'Sandra White',  type:'Modification',description:'Unapproved door replacement',      fine:100, issuedDate:'Apr 10', status:'under_review'      },
];
const MOCK_WORK_ORDERS = [
  { id:'WO-089', location:'Pool Area',       issue:'Pump making grinding noise',        priority:'urgent',   vendor:'AquaCare',  status:'scheduled',      sbAlert:null },
  { id:'WO-088', location:'Unit 12 Riser',   issue:'Gas line repair — SB 900 SLA',     priority:'critical', vendor:'ProPlumb',  status:'in_progress',    sbAlert:'14-day deadline: April 29' },
  { id:'WO-087', location:'Building 1 Lobby',issue:'Front door lock malfunction',       priority:'high',     vendor:'SecureLock',status:'in_progress',    sbAlert:null },
  { id:'WO-086', location:'Parking Lot B',   issue:'3 overhead lights non-functional',  priority:'normal',   vendor:null,        status:'pending_vendor', sbAlert:null },
];
const MOCK_VENDORS = [
  { id:1, name:'Greenscape Landscaping', category:'Landscaping', contractExp:'Dec 31, 2025', coiStatus:'valid',    w9:true, annualSpend:50400 },
  { id:2, name:'AquaCare Pool Services', category:'Pool & Spa',  contractExp:'Jun 30, 2025', coiStatus:'expiring', w9:true, annualSpend:21600, coiExp:'May 20' },
  { id:3, name:'ProPlumb Emergency',     category:'Plumbing',    contractExp:'Ongoing',      coiStatus:'valid',    w9:true, annualSpend:18400 },
  { id:4, name:'SecureWatch Security',   category:'Security',    contractExp:'Sep 30, 2025', coiStatus:'expiring', w9:true, annualSpend:38400, coiExp:'May 14' },
];
const MOCK_RESIDENTS = [
  { id:1, unit:'Unit 1',   owner:'Alex Thompson',  email:'a.thompson@email.com', balance:0,   portal:'active',  autoPay:true,  status:'good'        },
  { id:2, unit:'Unit 12',  owner:'Diana Foster',   email:'d.foster@email.com',   balance:150, portal:'invited', autoPay:false, status:'delinquent'  },
  { id:3, unit:'Unit 33',  owner:'Michael Torres', email:'m.torres@email.com',   balance:900, portal:'none',    autoPay:false, status:'collections' },
  { id:4, unit:'Unit 42',  owner:'Sarah Chen',     email:'s.chen@email.com',     balance:0,   portal:'active',  autoPay:true,  status:'good'        },
  { id:5, unit:'Unit 44',  owner:'Carlos Rivera',  email:'c.rivera@email.com',   balance:100, portal:'active',  autoPay:false, status:'violation'   },
];
const MOCK_DOCS = [
  { id:1, name:"CC&Rs — Oakwood Estates", version:'v3.2', updated:'Jan 2025', status:'current',      note:null },
  { id:2, name:'Bylaws',                  version:'v2.1', updated:'Mar 2024', status:'current',      note:null },
  { id:3, name:'Rules & Regulations',     version:'v4.0', updated:'Jan 2026', status:'current',      note:null },
  { id:4, name:'Collection Policy',       version:'v1.8', updated:'Dec 2024', status:'needs_update', note:'Needs update for AB 130 fine caps' },
  { id:5, name:'Solar Panel Policy',      version:'v1.0', updated:'Mar 2025', status:'current',      note:null },
];
const MOCK_COMMS = [
  { id:1, subject:'April 2026 Financial Statement', type:'financial',   sent:'All 148', channel:'Email + Portal', date:'Apr 26', openRate:91 },
  { id:2, subject:'AB 130 Fine Cap Alert',          type:'compliance',  sent:'All 148', channel:'Email + Portal', date:'Apr 20', openRate:78 },
  { id:3, subject:'April Board Meeting Minutes',    type:'board',       sent:'All 148', channel:'Portal',         date:'Apr 18', openRate:null },
];
const MOCK_TAX = [
  { id:1, name:'Form 1120-H — Federal HOA Return', desc:'Auto-populated from 2025 annual data',   due:'April 15, 2026',   status:'ready'       },
  { id:2, name:'California State HOA Filing',       desc:'CA-specific template pre-built',          due:'April 15, 2026',   status:'ready'       },
  { id:3, name:'Form 1099-NEC (Vendor Payments)',   desc:'6 vendors paid $600+ in FY2025',         due:'January 31, 2026', status:'filed'       },
  { id:4, name:'Homeowner Year-End Statements',     desc:'148 statements generated & distributed', due:'January 31, 2026', status:'distributed' },
];
const MOCK_COMPLIANCE_ALERTS = [
  { id:'ab130',  state:'ca', law:'AB 130',    title:'Fine Schedule Caps',       status:'action_required', effectiveDate:'2025',        daysRemaining:null, detail:'Your schedule has 3 fines exceeding the new $100/violation cap.' },
  { id:'sb326',  state:'ca', law:'SB 326',    title:'Balcony Inspections',      status:'warning',         effectiveDate:'Jan 1, 2026', daysRemaining:187,  detail:'Inspection not yet scheduled. 187 days remaining.' },
  { id:'ab2159', state:'ca', law:'AB 2159',   title:'Electronic Voting',        status:'compliant',        effectiveDate:'2025',        daysRemaining:null, detail:'System configured. Paper backup available.' },
  { id:'solar',  state:'ca', law:'Solar',     title:'Solar Panel Policy',       status:'compliant',        effectiveDate:'Mar 2025',    daysRemaining:null, detail:'Policy adopted and posted to portal.' },
  { id:'sb900',  state:'ca', law:'SB 900',    title:'Utility Repairs (14-Day)', status:'compliant',        effectiveDate:'2025',        daysRemaining:null, detail:'14-day SLA tracking active in work orders.' },
  { id:'fl-p',   state:'fl', law:'FL HB 1203',title:'Owner Portal Requirement', status:'compliant',        effectiveDate:'Jan 2026',    daysRemaining:null, detail:'Portal active. 80% adoption.' },
  { id:'fl-f',   state:'fl', law:'FL Fine Cap',title:'Fine Cap Enforcement',    status:'warning',          effectiveDate:'2025',        daysRemaining:null, detail:'Review recommended.' },
  { id:'tx-d',   state:'tx', law:'TX SB 1588',title:'Governing Docs Online',   status:'compliant',        effectiveDate:'Sep 2025',    daysRemaining:null, detail:'Documents published to portal.' },
];
const MOCK_CALENDAR = [
  { month:'Jan',    action:'Review & update fine schedules for all states', status:'done'        },
  { month:'Mar–Apr',action:'Audit document posting and portal requirements', status:'in_progress' },
  { month:'Jul',    action:'Check for new state legislation',               status:'upcoming'    },
  { month:'Sep',    action:'Verify election and voting workflow compliance', status:'upcoming'    },
  { month:'Dec',    action:'Annual full compliance audit',                  status:'upcoming'    },
];
const MOCK_COMMUNITIES = [
  { id:1, name:'Oakwood Estates HOA',  units:148, type:'Self-managed',  state:'California', tier:'Full Service',          active:true  },
  { id:2, name:'Maplewood Commons',    units:72,  type:'Management Co.',state:'California', tier:'Software + Compliance', active:false },
  { id:3, name:'Sunrise Ridge Condos', units:240, type:'Management Co.',state:'Florida',    tier:'Enterprise',            active:false },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
export function Compliance() {
  const [tab, setTab] = useState('ca');
  const { data: alerts } = useQuery({ queryKey:['compliance',tab], queryFn:()=>complianceAPI.alerts(tab).then(r=>r.data), placeholderData: MOCK_COMPLIANCE_ALERTS.filter(a=>a.state===tab) });
  const { data: calendar } = useQuery({ queryKey:['compliance-calendar'], queryFn:()=>complianceAPI.calendar().then(r=>r.data), placeholderData: MOCK_CALENDAR });

  const stateAlerts = (alerts || []).filter(a => a.state === tab);
  const tabs = [{id:'ca',label:'California',count:5},{id:'fl',label:'Florida',count:2},{id:'tx',label:'Texas',count:1},{id:'calendar',label:'Calendar'}];

  return (
    <div className="page-enter">
      <SectionHeader title="Legal Compliance" subtitle="Real-time state law monitoring — attorney-powered" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{s:'action_required',l:'Action Required',c:'rose'},{s:'warning',l:'Needs Attention',c:'amber'},{s:'compliant',l:'Compliant',c:'emerald'}].map(st=>(
          <div key={st.s} className={`rounded-xl border p-4 flex items-center gap-3 bg-${st.c}-50 border-${st.c}-100`}>
            <span className={`text-2xl font-bold text-${st.c}-700 font-display`}>{MOCK_COMPLIANCE_ALERTS.filter(a=>a.status===st.s).length}</span>
            <span className={`text-sm text-${st.c}-700 font-medium`}>{st.l}</span>
          </div>
        ))}
      </div>
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab !== 'calendar' ? (
        <div className="space-y-3">
          {stateAlerts.map(a => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="navy">{a.law}</Badge>
                    <Badge variant={a.status==='action_required'?'red':a.status==='warning'?'amber':'green'}>
                      <StatusDot status={a.status==='action_required'?'red':a.status==='warning'?'amber':'green'} />
                      {a.status==='action_required'?'Action Required':a.status==='warning'?'Schedule Needed':'Compliant'}
                    </Badge>
                    {a.daysRemaining && <span className="text-xs font-medium text-amber-600">{a.daysRemaining} days remaining</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">{a.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{a.detail}</p>
                </div>
                <Button variant={a.status==='action_required'?'danger':a.status==='warning'?'secondary':'ghost'} size="sm">
                  {a.status==='action_required'?'Fix Now':a.status==='warning'?'Schedule':'View'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          {(calendar || MOCK_CALENDAR).map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
              <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-1 rounded-md flex-shrink-0 min-w-[48px] text-center">{item.month}</span>
              <p className="text-sm text-slate-700 flex-1">{item.action}</p>
              <Badge variant={item.status==='done'?'green':item.status==='in_progress'?'amber':'gray'}>
                {item.status==='done'?'Done':item.status==='in_progress'?'In Progress':'Upcoming'}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DUES
// ─────────────────────────────────────────────────────────────────────────────
export function Dues() {
  const [tab, setTab] = useState('delinquent');
  const { data: delinquent } = useQuery({ queryKey:['dues-delinquent'], queryFn:()=>duesAPI.delinquent(1).then(r=>r.data), placeholderData:MOCK_DELINQUENT });
  const { data: payments } = useQuery({ queryKey:['dues-payments'], queryFn:()=>duesAPI.payments(1).then(r=>r.data), placeholderData:MOCK_PAYMENTS });

  const delinqMap={collections:'red',escalated:'amber',reminder:'amber'};
  const pmtMap={cleared:'green',processing:'blue',returned:'red'};

  return (
    <div className="page-enter">
      <SectionHeader title="Dues & Payments" subtitle="Collections, delinquencies, and payment history"
        action={<><Button variant="secondary" size="sm"><Download size={12}/>Export</Button><Button variant="primary" size="sm"><Plus size={12}/>Record Payment</Button></>} />
      <Alert variant="warning" title="AB 130 Fine Cap">Fines capped at $100/violation. Ensure compliance before sending notices.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Collected (Apr)" value={formatCurrency(21150)} sub="141 of 148 units" subVariant="good" />
        <MetricCard label="Total Delinquent" value={formatCurrency(1650)} sub="5 units" subVariant="bad" />
        <MetricCard label="In Collections" value={formatCurrency(900)} sub="1 unit" subVariant="bad" />
        <MetricCard label="Collection Rate" value="94.6%" sub="+2.1% MoM" subVariant="good" />
      </div>
      <Tabs tabs={[{id:'delinquent',label:'Delinquent Accounts',count:(delinquent||[]).length},{id:'payments',label:'Recent Payments'},{id:'history',label:'Chart'}]} activeTab={tab} onChange={setTab} />
      {tab==='delinquent' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700">Delinquent Accounts</h3>
            <Button variant="secondary" size="sm"><Send size={12}/>Send All Reminders</Button>
          </div>
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Days Past Due</Th><Th>Amount</Th><Th>Status</Th><Th>Action</Th></tr></thead>
              <tbody>{(delinquent||[]).map(a=>(
                <Tr key={a.id}>
                  <Td><span className="font-semibold">{a.unit}</span></Td>
                  <Td>{a.owner}</Td>
                  <Td><span className={`font-semibold ${a.daysPastDue>=61?'text-rose-600':'text-amber-600'}`}>{a.daysPastDue} days</span></Td>
                  <Td><span className={`font-bold ${a.daysPastDue>=61?'text-rose-600':'text-amber-700'}`}>{formatCurrency(a.amount)}</span></Td>
                  <Td><Badge variant={delinqMap[a.status]||'gray'}>{a.status==='collections'?'Collections':a.status==='escalated'?'Escalated':'Reminder Due'}</Badge></Td>
                  <Td><div className="flex gap-2"><Button variant="ghost" size="sm">Notice</Button>{a.status==='escalated'&&<Button variant="danger" size="sm">Collections</Button>}</div></Td>
                </Tr>
              ))}</tbody>
            </Table>
          </div>
        </Card>
      )}
      {tab==='payments' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Recent Payments</h3></div>
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Amount</Th><Th>Method</Th><Th>Date</Th><Th>Status</Th></tr></thead>
              <tbody>{(payments||[]).map(p=>(
                <Tr key={p.id}>
                  <Td><span className="font-semibold">{p.unit}</span></Td><Td>{p.owner}</Td>
                  <Td><span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span></Td>
                  <Td>{p.method}</Td><Td className="text-slate-400">{p.date}</Td>
                  <Td><Badge variant={pmtMap[p.status]||'gray'}>{p.status==='cleared'?'Cleared':p.status==='processing'?'Processing':'Returned'}</Badge></Td>
                </Tr>
              ))}</tbody>
            </Table>
          </div>
        </Card>
      )}
      {tab==='history' && (
        <Card>
          <CardHeader title="Monthly Collection History" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_FINANCIALS} margin={{top:4,right:0,left:-15,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7" />
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#737f96'}} />
              <YAxis tick={{fontSize:9,fill:'#737f96'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{fontSize:11,borderRadius:8}} />
              <Bar dataKey="income"   fill="#1e3a7a" radius={[3,3,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#e2e5ec" radius={[3,3,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING
// ─────────────────────────────────────────────────────────────────────────────
export function Accounting() {
  const { data: summary } = useQuery({ queryKey:['accounting'], queryFn:()=>accountingAPI.summary(1).then(r=>r.data), placeholderData:{operatingBalance:48320,reserveBalance:184200,reservePct:61,monthlyIncome:22348,monthlyExpenses:18205,netIncome:4143} });
  const s = summary || {};
  const total = MOCK_EXPENSES.reduce((acc,e)=>acc+e.amount,0);
  return (
    <div className="page-enter">
      <SectionHeader title="Accounting" subtitle="Bank-synced financials and reserve tracking"
        action={<><Button variant="secondary" size="sm"><Download size={12}/>Export</Button><Button variant="primary" size="sm"><Plus size={12}/>Add Transaction</Button></>} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Operating Account" value={formatCurrency(s.operatingBalance||48320)} sub="Synced Apr 26" subVariant="good" />
        <MetricCard label="Reserve Fund" value={formatCurrency(s.reserveBalance||184200)} sub={`${s.reservePct||61}% funded`} subVariant="warn" />
        <MetricCard label="Monthly Income" value={formatCurrency(s.monthlyIncome||22348)} sub="April 2026" />
        <MetricCard label="Net Income" value={formatCurrency(s.netIncome||4143)} sub="vs expenses" subVariant="good" />
      </div>
      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader title="Income vs. Expenses (6 months)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_FINANCIALS} margin={{top:0,right:0,left:-18,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7" />
              <XAxis dataKey="month" tick={{fontSize:10,fill:'#737f96'}} />
              <YAxis tick={{fontSize:9,fill:'#737f96'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{fontSize:11,borderRadius:8}} />
              <Bar dataKey="income"   fill="#1e3a7a" radius={[3,3,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#c5cad6" radius={[3,3,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Expense Breakdown — April 2026" />
          {MOCK_EXPENSES.map(e=>(
            <div key={e.category} className="mb-2.5">
              <div className="flex justify-between mb-1"><span className="text-xs font-medium text-slate-700">{e.category}</span><span className="text-xs font-bold text-slate-800">{formatCurrency(e.amount)}</span></div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-navy-600 rounded-full" style={{width:`${Math.round(e.amount/total*100)}%`}}/></div>
              <span className="text-[10px] text-slate-400">{e.vendor} · {Math.round(e.amount/total*100)}%</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t border-slate-200 mt-1">
            <span className="text-xs font-bold text-slate-700">Total Expenses</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Reserve Fund Health" />
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-2xl font-display text-slate-900">{formatCurrency(s.reserveBalance||184200)}</p>
            <p className="text-xs text-amber-600 mt-1 mb-3">61% funded — below recommended 70%</p>
            <ProgressBar value={61} color="amber" />
          </div>
          <div className="text-xs space-y-2">
            {[['Fully funded target',formatCurrency(302000)],['Monthly contribution',formatCurrency(3835)],['Next reserve study','2027'],['10-year repair forecast',formatCurrency(480000)]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-2 border-b border-slate-50"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800">{v}</span></div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Underfunding Risk</p>
            <p className="text-xs text-amber-700 leading-relaxed">At current rate, fund reaches 70% by Q3 2028. Consider special assessment if major repairs arise sooner.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX
// ─────────────────────────────────────────────────────────────────────────────
export function Tax() {
  const { data: docs } = useQuery({ queryKey:['tax'], queryFn:()=>taxAPI.documents(1).then(r=>r.data), placeholderData:MOCK_TAX });
  const stMap={ready:{l:'Ready to File',c:'blue'},filed:{l:'E-Filed',c:'green'},distributed:{l:'Distributed',c:'green'}};
  return (
    <div className="page-enter">
      <SectionHeader title="Tax Reports" subtitle="Auto-generated from platform financial data"
        action={<Button variant="secondary" size="sm"><Download size={12}/>Download All</Button>} />
      <Alert variant="success" title="1099 e-filing complete — all 6 vendors filed by January 31">Form 1120-H auto-populated from 2025 data. Review and file by April 15, 2026.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Form 1120-H" value="Ready" sub="Due Apr 15, 2026" subVariant="warn" />
        <MetricCard label="State Filing" value="Ready" sub="Due Apr 15, 2026" subVariant="warn" />
        <MetricCard label="1099-NEC Filed" value="6" sub="All vendors" subVariant="good" />
        <MetricCard label="Homeowner Stmts" value="148" sub="All distributed" subVariant="good" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Tax Documents — FY2025</h3></div>
        {(docs||[]).map(doc=>{const st=stMap[doc.status]||{l:'Pending',c:'amber'};return(
          <div key={doc.id} className="px-5 py-4 border-b border-slate-50 last:border-0 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.status==='ready'?'bg-navy-50':'bg-emerald-50'}`}>
                <Receipt size={15} className={doc.status==='ready'?'text-navy-600':'text-emerald-600'} />
              </div>
              <div><p className="text-sm font-semibold text-slate-800">{doc.name}</p><p className="text-xs text-slate-400 mt-0.5">{doc.desc} · Due: {doc.due}</p></div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge variant={st.c}>{st.l}</Badge>
              {doc.status==='ready'?<Button variant="primary" size="sm"><Download size={11}/>Download PDF</Button>:<Button variant="ghost" size="sm">View Filed</Button>}
            </div>
          </div>
        );})}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIOLATIONS
// ─────────────────────────────────────────────────────────────────────────────
export function Violations() {
  const { data: list } = useQuery({ queryKey:['violations'], queryFn:()=>violationsAPI.list(1).then(r=>r.data), placeholderData:MOCK_VIOLATIONS });
  const stMap={notice_sent:{l:'Notice Sent',c:'amber'},hearing_pending:{l:'Hearing Pending',c:'amber'},escalated:{l:'Escalated',c:'red'},hearing_scheduled:{l:'Hearing Scheduled',c:'red'},under_review:{l:'Under Review',c:'blue'},second_notice:{l:'2nd Notice',c:'amber'}};
  return (
    <div className="page-enter">
      <SectionHeader title="Violations" subtitle="Issue legally compliant notices with attorney-reviewed templates"
        action={<Button variant="primary" size="sm"><Plus size={12}/>New Violation</Button>} />
      <Alert variant="warning" title="AB 130 Fine Cap — Action Required">California fines capped at $100/violation. Review fine schedule before sending new notices.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Violations" value={(list||[]).length} sub="Active" subVariant="warn" />
        <MetricCard label="Hearings This Week" value="2" sub="Apr 30 & May 3" />
        <MetricCard label="Fines Issued (MTD)" value="$575" />
        <MetricCard label="Avg Resolution" value="11 days" sub="Last 30 days" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Open Violations</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Unit</Th><Th>Type</Th><Th>Description</Th><Th>Fine</Th><Th>Issued</Th><Th>Status</Th><Th>Action</Th></tr></thead>
            <tbody>{(list||[]).map(v=>{const st=stMap[v.status]||{l:'Open',c:'gray'};return(
              <Tr key={v.id}>
                <Td><p className="font-semibold text-slate-800">{v.unit}</p><p className="text-[11px] text-slate-400">{v.owner}</p></Td>
                <Td><Badge variant="gray">{v.type}</Badge></Td>
                <Td className="max-w-[180px]"><p className="text-xs text-slate-600">{v.description}</p></Td>
                <Td><span className="font-bold">${v.fine}</span></Td>
                <Td className="text-xs text-slate-400">{v.issuedDate}</Td>
                <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                <Td><div className="flex gap-1.5"><Button variant="ghost" size="sm">View</Button>{v.status==='escalated'&&<Button variant="danger" size="sm">Escalate</Button>}</div></Td>
              </Tr>
            );})}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────
export function Maintenance() {
  const { data: list } = useQuery({ queryKey:['maintenance'], queryFn:()=>maintenanceAPI.list(1).then(r=>r.data), placeholderData:MOCK_WORK_ORDERS });
  const stMap={scheduled:{l:'Scheduled',c:'amber'},in_progress:{l:'In Progress',c:'blue'},pending_vendor:{l:'Pending Vendor',c:'gray'},parts_ordered:{l:'Parts Ordered',c:'navy'},completed:{l:'Completed',c:'green'}};
  const prMap={critical:{l:'Critical',c:'red'},urgent:{l:'Urgent',c:'red'},high:{l:'High',c:'amber'},normal:{l:'Normal',c:'gray'}};
  return (
    <div className="page-enter">
      <SectionHeader title="Maintenance" subtitle="Work orders with SB 900 14-day SLA tracking"
        action={<Button variant="primary" size="sm"><Plus size={12}/>New Work Order</Button>} />
      <Alert variant="danger" title="SB 900 SLA Alert — WO-088 Gas Line Repair">14-day deadline April 29. Confirm vendor has started on-site work.</Alert>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Requests" value={(list||[]).filter(w=>w.status!=='completed').length} sub="2 pending vendor" subVariant="warn" />
        <MetricCard label="Avg Resolution" value="4.2 days" sub="Within SLA" subVariant="good" />
        <MetricCard label="Completed (30d)" value="14" />
        <MetricCard label="Spend (30d)" value="$6,840" sub="4 vendors" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Work Orders</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>ID</Th><Th>Location</Th><Th>Issue</Th><Th>Priority</Th><Th>Vendor</Th><Th>Status</Th></tr></thead>
            <tbody>{(list||[]).map(w=>{const st=stMap[w.status]||{l:'Open',c:'gray'};const pr=prMap[w.priority]||{l:'Normal',c:'gray'};return(
              <Tr key={w.id}>
                <Td><span className="font-mono text-xs text-slate-500">{w.id}</span></Td>
                <Td><span className="text-xs font-medium">{w.location}</span></Td>
                <Td className="max-w-[200px]"><p className="text-xs text-slate-600">{w.issue}</p>{w.sbAlert&&<p className="text-[10px] text-rose-600 font-semibold mt-0.5">{w.sbAlert}</p>}</Td>
                <Td><Badge variant={pr.c}>{pr.l}</Badge></Td>
                <Td className={`text-xs ${w.vendor?'text-slate-600':'text-amber-600 font-semibold'}`}>{w.vendor||'Unassigned'}</Td>
                <Td><Badge variant={st.c}>{st.l}</Badge></Td>
              </Tr>
            );})}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────────────────────────────────────────
export function Vendors() {
  const { data: list } = useQuery({ queryKey:['vendors'], queryFn:()=>vendorAPI.list(1).then(r=>r.data), placeholderData:MOCK_VENDORS });
  const expiring = (list||[]).filter(v=>v.coiStatus==='expiring').length;
  return (
    <div className="page-enter">
      <SectionHeader title="Vendors" subtitle="Contract management, COI tracking, and 1099 compliance"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Vendor</Button>} />
      {expiring>0&&<Alert variant="danger" title={`${expiring} vendor COIs expiring within 30 days`}>Renew before contracts can be extended.</Alert>}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Vendors" value={(list||[]).length} />
        <MetricCard label="COI Expiring" value={expiring} sub="Within 30 days" subVariant="bad" />
        <MetricCard label="Contracts Expiring" value="1" sub="Within 60 days" subVariant="warn" />
        <MetricCard label="Annual Spend" value="$218K" sub="6 vendors 1099'd" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Vendor Directory</h3></div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Vendor</Th><Th>Category</Th><Th>Contract Exp.</Th><Th>COI</Th><Th>W-9</Th><Th>Annual Spend</Th><Th>Action</Th></tr></thead>
            <tbody>{(list||[]).map(v=>(
              <Tr key={v.id}>
                <Td><span className="font-semibold text-slate-800">{v.name}</span></Td>
                <Td><Badge variant="gray">{v.category}</Badge></Td>
                <Td className="text-xs text-slate-500">{v.contractExp}</Td>
                <Td><div><Badge variant={v.coiStatus==='valid'?'green':'red'}>{v.coiStatus==='valid'?'Valid':'Expiring'}</Badge>{v.coiExp&&<p className="text-[10px] text-rose-500 mt-0.5">Exp: {v.coiExp}</p>}</div></Td>
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

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTS
// ─────────────────────────────────────────────────────────────────────────────
export function Residents() {
  const [search, setSearch] = useState('');
  const { data: list } = useQuery({ queryKey:['residents'], queryFn:()=>residentAPI.list(1).then(r=>r.data), placeholderData:MOCK_RESIDENTS });
  const filtered = (list||[]).filter(r=>r.owner.toLowerCase().includes(search.toLowerCase())||r.unit.toLowerCase().includes(search.toLowerCase()));
  const stMap={good:{l:'Good Standing',c:'green'},delinquent:{l:'Delinquent',c:'amber'},violation:{l:'Violation',c:'amber'},collections:{l:'Collections',c:'red'}};
  const ptMap={active:{l:'Active',c:'green'},invited:{l:'Invited',c:'blue'},none:{l:'Not Activated',c:'gray'}};
  return (
    <div className="page-enter">
      <SectionHeader title="Residents" subtitle="Homeowner directory, portal status, and account standing"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Resident</Button>} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Units" value="148" />
        <MetricCard label="Portal Activated" value="119" sub="80.4% adoption" subVariant="good" />
        <MetricCard label="Auto-Pay Enrolled" value="96" sub="64.9% of units" subVariant="good" />
        <MetricCard label="Good Standing" value="141" sub="95.3%" subVariant="good" />
      </div>
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Resident Directory</h3>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search residents..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-48" />
          </div>
        </div>
        <div className="px-5 py-1">
          <Table>
            <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Email</Th><Th>Balance</Th><Th>Portal</Th><Th>Auto-Pay</Th><Th>Status</Th></tr></thead>
            <tbody>{filtered.map(r=>{const st=stMap[r.status]||{l:'Good',c:'gray'};const pt=ptMap[r.portal]||{l:'None',c:'gray'};return(
              <Tr key={r.id}>
                <Td><span className="font-semibold">{r.unit}</span></Td><Td>{r.owner}</Td>
                <Td className="text-xs text-slate-400">{r.email}</Td>
                <Td><span className={`${r.balance>0?'font-bold text-rose-600':'text-slate-400'}`}>{r.balance>0?`$${r.balance}`:'—'}</span></Td>
                <Td><Badge variant={pt.c}>{pt.l}</Badge></Td>
                <Td><span className={`text-xs font-semibold ${r.autoPay?'text-emerald-600':'text-slate-400'}`}>{r.autoPay?'Enrolled':'Manual'}</span></Td>
                <Td><Badge variant={st.c}>{st.l}</Badge></Td>
              </Tr>
            );})}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────
export function Documents() {
  const { data: list } = useQuery({ queryKey:['documents'], queryFn:()=>documentAPI.list(1).then(r=>r.data), placeholderData:MOCK_DOCS });
  const stMap={current:{l:'Current',c:'green'},needs_update:{l:'Needs Update',c:'red'},review_needed:{l:'Review Recommended',c:'amber'}};
  return (
    <div className="page-enter">
      <SectionHeader title="Documents" subtitle="Governing docs, financial records, and AI-assisted drafting"
        action={<><Button variant="secondary" size="sm"><Upload size={12}/>Upload</Button><Button variant="primary" size="sm">Draft with AI</Button></>} />
      <Alert variant="warning" title="Collection Policy needs update — AB 130 fine caps">Update before next enforcement cycle.</Alert>
      <div className="grid grid-cols-2 gap-5">
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><FolderOpen size={14} className="text-slate-400" /><h3 className="text-sm font-semibold text-slate-700">Governing Documents</h3></div>
          {(list||[]).map(doc=>{const st=stMap[doc.status]||{l:'Current',c:'green'};return(
            <div key={doc.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-navy-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                  <p className="text-[11px] text-slate-400">{doc.version} · {doc.updated}</p>
                  {doc.note&&<p className="text-[11px] text-rose-600 font-semibold mt-0.5">{doc.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0"><Badge variant={st.c}>{st.l}</Badge><Button variant="ghost" size="sm">View</Button></div>
            </div>
          ))}
        </Card>
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><FileText size={14} className="text-slate-400" /><h3 className="text-sm font-semibold text-slate-700">Financial Documents</h3></div>
          {[{name:'2026 Annual Budget',desc:'CA Civil Code 5300 compliant',type:'budget'},{name:'Reserve Fund Study 2024',desc:'61% funded — next due 2027',type:'reserve'},{name:'April 2026 Financial Statement',desc:'Auto-generated and distributed',type:'financial'},{name:'2025 Annual Audit Report',desc:'CPA reviewed',type:'audit'},{name:'Insurance Certificate 2026',desc:'$5M general liability',type:'insurance'}].map(doc=>(
            <div key={doc.name} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-emerald-600" /></div>
                <div className="min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p><p className="text-[11px] text-slate-400">{doc.desc}</p></div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0"><Badge variant="green">Current</Badge><Button variant="ghost" size="sm">View</Button></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export function Communications() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const { data: history } = useQuery({ queryKey:['comms'], queryFn:()=>communicationsAPI.history(1).then(r=>r.data), placeholderData:MOCK_COMMS });
  const typeMap={financial:'blue',compliance:'amber',board:'navy',delinquency:'red',announcement:'green'};
  return (
    <div className="page-enter">
      <SectionHeader title="Communications" subtitle="Email, portal, SMS, and physical mail delivery" />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Send Announcement" />
          <div className="space-y-3">
            <Input label="Subject" placeholder="e.g. Board Meeting — May 15, 2026" value={subject} onChange={e=>setSubject(e.target.value)} />
            <Textarea label="Message" placeholder="Type your message to homeowners..." value={body} onChange={e=>setBody(e.target.value)} rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Send via"><option>Email + Portal</option><option>Email only</option><option>Portal only</option><option>All channels</option></Select>
              <Select label="Recipients"><option>All homeowners (148)</option><option>Delinquent accounts</option><option>Board members</option></Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm">AI Draft</Button>
              <Button variant="primary" size="sm" className="flex-1 justify-center"><Send size={12}/>Send to Homeowners</Button>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Recent Communications</h3></div>
          {(history||[]).map(c=>(
            <div key={c.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5"><Badge variant={typeMap[c.type]||'gray'}>{c.type}</Badge></div>
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

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITIES
// ─────────────────────────────────────────────────────────────────────────────
export function Communities({ onNavigate }) {
  const { data: list } = useQuery({ queryKey:['communities'], queryFn:()=>communityAPI.list().then(r=>r.data), placeholderData:MOCK_COMMUNITIES });
  const tierColors={'Full Service':'green','Software + Compliance':'blue','Enterprise':'navy','Software Only':'gray'};
  return (
    <div className="page-enter">
      <SectionHeader title="Communities" subtitle="Manage all your HOA communities"
        action={<Button variant="primary" size="sm"><Plus size={12}/>Add Community</Button>} />
      <div className="space-y-4">
        {(list||[]).map(c=>(
          <Card key={c.id} className={`cursor-pointer hover:shadow-card-hover transition-shadow ${c.active?'border-navy-300':''}`} onClick={()=>c.active&&onNavigate('dashboard')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.active?'bg-navy-700':'bg-slate-100'}`}>
                  <Building2 size={20} className={c.active?'text-white':'text-slate-400'} />
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
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
