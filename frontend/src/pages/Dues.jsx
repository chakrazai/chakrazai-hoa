import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Send, Plus, X, AlertCircle, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard, Card, CardHeader, Badge, Alert, Button, Table, Th, Td, Tr, Tabs, SectionHeader, formatCurrency } from '../components/ui';
import { duesAPI } from '../lib/api';
import { getCommunityId } from '../lib/community';

const MOCK_DELINQUENT = [
  { id:1, resident_id:3, unit:'Unit 33',  owner:'Michael Torres', email:'m.torres@email.com', days_past_due:92, balance:900,  amount:900,  status:'collections', auto_pay:false },
  { id:2, resident_id:7, unit:'Unit 67',  owner:'Amanda Liu',     email:'a.liu@email.com',     days_past_due:61, balance:300,  amount:300,  status:'delinquent',  auto_pay:false },
  { id:3, resident_id:8, unit:'Unit 104', owner:'Robert Patel',   email:'r.patel@email.com',   days_past_due:61, balance:150,  amount:150,  status:'delinquent',  auto_pay:false },
  { id:4, resident_id:2, unit:'Unit 12',  owner:'Diana Foster',   email:'d.foster@email.com',  days_past_due:32, balance:150,  amount:150,  status:'late',        auto_pay:false },
  { id:5, resident_id:6, unit:'Unit 55',  owner:'Kevin Zhang',    email:'k.zhang@email.com',   days_past_due:32, balance:150,  amount:150,  status:'late',        auto_pay:false },
  { id:6, resident_id:9, unit:'Unit 88',  owner:'Laura Kim',      email:'l.kim@email.com',     days_past_due:32, balance:150,  amount:150,  status:'late',        auto_pay:false },
];
const MOCK_PAYMENTS = [
  { id:1, resident_id:4, unit:'Unit 42',  owner:'Sarah Chen',    amount:150, method:'ACH',   date:'Apr 26, 2026', status:'cleared'    },
  { id:2, resident_id:1, unit:'Unit 7',   owner:'James Okonkwo', amount:150, method:'Check', date:'Apr 25, 2026', status:'cleared'    },
  { id:3, resident_id:10,unit:'Unit 119', owner:'Maria Garcia',  amount:150, method:'ACH',   date:'Apr 25, 2026', status:'cleared'    },
  { id:4, resident_id:8, unit:'Unit 83',  owner:'Tom Nakamura',  amount:150, method:'ACH',   date:'Apr 24, 2026', status:'cleared'    },
  { id:5, resident_id:1, unit:'Unit 1',   owner:'Alex Thompson', amount:150, method:'ACH',   date:'May 1, 2026',  status:'cleared'    },
  { id:6, resident_id:5, unit:'Unit 44',  owner:'Carlos Rivera', amount:150, method:'Check', date:'Apr 15, 2026', status:'cleared'    },
];
const MOCK_ACCOUNTS = [
  { resident_id:1,  unit:'Unit 1',   owner:'Alex Thompson', email:'a.thompson@email.com', balance:0,   monthly_amount:150, status:'current',    auto_pay:true,  days_past_due:null },
  { resident_id:11, unit:'Unit 7',   owner:'James Okonkwo', email:'j.okonkwo@email.com',  balance:0,   monthly_amount:150, status:'current',    auto_pay:false, days_past_due:null },
  { resident_id:2,  unit:'Unit 12',  owner:'Diana Foster',  email:'d.foster@email.com',   balance:150, monthly_amount:150, status:'late',       auto_pay:false, days_past_due:32   },
  { resident_id:3,  unit:'Unit 33',  owner:'Michael Torres',email:'m.torres@email.com',   balance:900, monthly_amount:150, status:'collections',auto_pay:false, days_past_due:92   },
  { resident_id:4,  unit:'Unit 42',  owner:'Sarah Chen',    email:'s.chen@email.com',     balance:0,   monthly_amount:150, status:'current',    auto_pay:true,  days_past_due:null },
  { resident_id:5,  unit:'Unit 44',  owner:'Carlos Rivera', email:'c.rivera@email.com',   balance:50,  monthly_amount:150, status:'current',    auto_pay:false, days_past_due:27   },
  { resident_id:6,  unit:'Unit 55',  owner:'Kevin Zhang',   email:'k.zhang@email.com',    balance:150, monthly_amount:150, status:'late',       auto_pay:false, days_past_due:32   },
  { resident_id:7,  unit:'Unit 67',  owner:'Amanda Liu',    email:'a.liu@email.com',      balance:300, monthly_amount:150, status:'delinquent', auto_pay:false, days_past_due:61   },
  { resident_id:8,  unit:'Unit 83',  owner:'Tom Nakamura',  email:'t.nakamura@email.com', balance:0,   monthly_amount:150, status:'current',    auto_pay:true,  days_past_due:null },
  { resident_id:9,  unit:'Unit 88',  owner:'Laura Kim',     email:'l.kim@email.com',      balance:150, monthly_amount:150, status:'late',       auto_pay:false, days_past_due:32   },
  { resident_id:12, unit:'Unit 104', owner:'Robert Patel',  email:'r.patel@email.com',    balance:150, monthly_amount:150, status:'delinquent', auto_pay:false, days_past_due:61   },
  { resident_id:10, unit:'Unit 119', owner:'Maria Garcia',  email:'m.garcia@email.com',   balance:0,   monthly_amount:150, status:'current',    auto_pay:true,  days_past_due:null },
];
const MOCK_HISTORY = [
  { month:'Nov', collected:20800, expected:22200 },
  { month:'Dec', collected:21000, expected:22200 },
  { month:'Jan', collected:20200, expected:22200 },
  { month:'Feb', collected:21600, expected:22200 },
  { month:'Mar', collected:21900, expected:22200 },
  { month:'Apr', collected:21150, expected:22200 },
];

const STATUS_META = {
  current:     { label:'Current',     color:'green', Icon: CheckCircle2  },
  late:        { label:'Late',        color:'amber', Icon: Clock         },
  delinquent:  { label:'Delinquent',  color:'red',   Icon: AlertCircle   },
  collections: { label:'Collections', color:'red',   Icon: TrendingDown  },
};
const PMT_MAP = { cleared:'green', processing:'blue', returned:'red', charge:'amber' };
const METHODS = ['ACH','Check','Credit Card','Zelle','Wire Transfer','Cash'];
const iC = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const lC = 'block text-xs font-medium text-slate-500 mb-1';

function RecordPaymentModal({ accounts, communityId, queryClient, onClose }) {
  const [form, setForm]   = useState({ residentId: '', amount: '150', method: 'ACH', note: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.residentId) { setErr('Select a resident'); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await duesAPI.recordPayment({ residentId: Number(form.residentId), communityId, amount: amt, method: form.method, note: form.note });
      queryClient.invalidateQueries(['dues-delinquent']);
      queryClient.invalidateQueries(['dues-payments']);
      queryClient.invalidateQueries(['dues-accounts']);
      onClose();
    } catch { setErr('Failed to save — please try again'); setSaving(false); }
  };

  const selected = accounts.find(a => String(a.resident_id) === form.residentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Record HOA Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18}/></button>
        </div>
        {err && <p className="text-xs text-rose-600 mb-3 font-medium">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className={lC}>Resident *</label>
            <select value={form.residentId} onChange={f('residentId')} className={iC}>
              <option value="">Select resident…</option>
              {[...accounts].sort((a,b)=>a.unit.localeCompare(b.unit,undefined,{numeric:true})).map(a => (
                <option key={a.resident_id} value={a.resident_id}>
                  {a.unit} — {a.owner}{a.balance > 0 ? ` (${formatCurrency(a.balance)} owed)` : ''}
                </option>
              ))}
            </select>
            {selected && selected.balance > 0 && (
              <p className="text-[11px] text-amber-600 mt-1">Outstanding balance: {formatCurrency(selected.balance)}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lC}>Amount ($) *</label>
              <input type="number" min="1" step="0.01" value={form.amount} onChange={f('amount')} className={iC}/>
            </div>
            <div>
              <label className={lC}>Method</label>
              <select value={form.method} onChange={f('method')} className={iC}>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lC}>Note</label>
            <input value={form.note} onChange={f('note')} className={iC} placeholder="e.g. May 2026 HOA dues"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : <><Plus size={13}/>Save Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dues() {
  const communityId = getCommunityId();
  const queryClient = useQueryClient();
  const [tab, setTab]           = useState('delinquent');
  const [showRecord, setShowRecord] = useState(false);
  const [sending, setSending]   = useState(null);
  const [acctSearch, setAcctSearch] = useState('');

  const { data: delinquent } = useQuery({ queryKey:['dues-delinquent'], queryFn:()=>duesAPI.delinquent(communityId).then(r=>r.data), placeholderData:MOCK_DELINQUENT });
  const { data: payments }   = useQuery({ queryKey:['dues-payments'],   queryFn:()=>duesAPI.payments(communityId).then(r=>r.data),   placeholderData:MOCK_PAYMENTS   });
  const { data: accounts }   = useQuery({ queryKey:['dues-accounts'],   queryFn:()=>duesAPI.allAccounts(communityId).then(r=>r.data), placeholderData:MOCK_ACCOUNTS   });

  const list  = delinquent?.length ? delinquent : MOCK_DELINQUENT;
  const pmts  = payments?.length   ? payments   : MOCK_PAYMENTS;
  const accs  = accounts?.length   ? accounts   : MOCK_ACCOUNTS;
  const total = list.reduce((s,a) => s + parseFloat(a.balance || a.amount || 0), 0);
  const collectionsAmt = list.filter(a => a.status==='collections').reduce((s,a) => s + parseFloat(a.balance||a.amount||0), 0);
  const autoPayCount = accs.filter(a => a.auto_pay).length;
  const currentCount = accs.filter(a => a.status === 'current' || !a.balance).length;
  const collectionRate = accs.length ? ((currentCount / accs.length) * 100).toFixed(1) : '94.6';
  const recentCollected = pmts.filter(p=>p.status==='cleared').reduce((s,p)=>s+parseFloat(p.amount),0);
  const recentCharges   = pmts.filter(p=>p.status==='charge').reduce((s,p)=>s+parseFloat(p.amount),0);

  const filteredAccts = accs.filter(a =>
    !acctSearch || a.unit.toLowerCase().includes(acctSearch.toLowerCase()) || a.owner.toLowerCase().includes(acctSearch.toLowerCase())
  );

  const handleSendReminder = async (accountId) => {
    setSending(accountId);
    try { await duesAPI.sendReminder(accountId); } catch {}
    setTimeout(() => setSending(null), 1500);
  };

  const handleSendAll = async () => {
    try { await duesAPI.sendAllReminders(communityId); } catch {}
  };

  return (
    <div className="page-enter">
      {showRecord && (
        <RecordPaymentModal
          accounts={accs}
          communityId={communityId}
          queryClient={queryClient}
          onClose={() => setShowRecord(false)}
        />
      )}

      <SectionHeader title="Dues & Payments" subtitle="Collections, delinquencies, and payment history"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Download size={12}/>Export</Button>
            <Button variant="primary" size="sm" onClick={() => setShowRecord(true)}><Plus size={12}/>Record Payment</Button>
          </div>
        }
      />

      <Alert variant="warning" title="AB 130 Fine Cap">California fines capped at $100/violation. Ensure compliance before sending new notices.</Alert>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Collected (Recent)"  value={formatCurrency(recentCollected || 21150)} sub={`${pmts.filter(p=>p.status==='cleared').length} payments`} subVariant="good" />
        <MetricCard label="Total Delinquent"    value={formatCurrency(total)}   sub={`${list.length} unit${list.length!==1?'s':''}`}  subVariant="bad"  />
        <MetricCard label="In Collections"      value={formatCurrency(collectionsAmt)} sub={`${list.filter(a=>a.status==='collections').length} unit${list.filter(a=>a.status==='collections').length!==1?'s':''}`} subVariant="bad" />
        <MetricCard label="Collection Rate"     value={`${collectionRate}%`}    sub={`${autoPayCount} on auto-pay`} subVariant="good" />
      </div>

      <Tabs
        tabs={[
          { id:'delinquent', label:'Delinquent Accounts', count: list.length },
          { id:'payments',   label:'Recent Payments',     count: pmts.length  },
          { id:'accounts',   label:'All Accounts',        count: accs.length  },
          { id:'history',    label:'Collection History' },
        ]}
        activeTab={tab} onChange={setTab}
      />

      {tab === 'delinquent' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Delinquent Accounts</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{list.length} unit{list.length!==1?'s':''} past due · {formatCurrency(total)} total</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSendAll}><Send size={12}/>Send All Reminders</Button>
          </div>
          <div className="px-5 py-1">
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th><Th>Owner</Th><Th>Email</Th>
                  <Th>Days Past Due</Th><Th>Balance</Th><Th>Status</Th><Th>Auto-pay</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => {
                  const meta = STATUS_META[a.status] || STATUS_META.late;
                  const days = a.days_past_due ?? a.daysPastDue ?? 0;
                  const isSending = sending === (a.id || a.resident_id);
                  return (
                    <Tr key={a.id || a.resident_id}>
                      <Td><span className="font-semibold text-navy-700">{a.unit}</span></Td>
                      <Td className="font-medium">{a.owner}</Td>
                      <Td className="text-slate-400 text-xs">{a.email || '—'}</Td>
                      <Td>
                        <span className={`font-semibold tabular-nums ${days>=61?'text-rose-600':days>=32?'text-amber-600':'text-slate-600'}`}>
                          {days} days
                        </span>
                      </Td>
                      <Td>
                        <span className={`font-bold ${days>=61?'text-rose-600':'text-amber-700'}`}>
                          {formatCurrency(parseFloat(a.balance || a.amount || 0))}
                        </span>
                      </Td>
                      <Td><Badge variant={meta.color}>{meta.label}</Badge></Td>
                      <Td>{a.auto_pay ? <Badge variant="blue">Auto</Badge> : <span className="text-xs text-slate-400">Manual</span>}</Td>
                      <Td>
                        <div className="flex gap-1.5 flex-wrap">
                          <Button variant="ghost" size="sm"
                            onClick={() => handleSendReminder(a.id || a.resident_id)}
                            disabled={isSending}>
                            {isSending ? 'Sent ✓' : <><Send size={10}/>Notice</>}
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => { setShowRecord(true); }}>Pay</Button>
                          {a.status==='delinquent'&&<Button variant="danger" size="sm">Collections</Button>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/60">
            <p className="text-xs text-slate-400">Total delinquent: <span className="font-semibold text-rose-600">{formatCurrency(total)}</span></p>
            <Button variant="primary" size="sm">Draft Collection Letter</Button>
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Recent Payments &amp; Charges</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {pmts.filter(p=>p.status!=='charge').length} payment{pmts.filter(p=>p.status!=='charge').length!==1?'s':''} · {pmts.filter(p=>p.status==='charge').length} fee charge{pmts.filter(p=>p.status==='charge').length!==1?'s':''}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowRecord(true)}><Plus size={12}/>Record Payment</Button>
          </div>
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Amount</Th><Th>Method/Type</Th><Th>Date</Th><Th>Note</Th><Th>Status</Th></tr></thead>
              <tbody>
                {pmts.map((p, i) => {
                  const isCharge = p.status === 'charge';
                  const methodColor = p.method==='ACH'?'bg-blue-50 text-blue-700':p.method==='Check'?'bg-slate-100 text-slate-700':p.method==='Credit Card'?'bg-rose-50 text-rose-700':isCharge?'bg-amber-50 text-amber-700':'bg-violet-50 text-violet-700';
                  const statusLabel = p.status==='cleared'?'Cleared':p.status==='charge'?'Fee Charge':p.status==='processing'?'Processing':'Returned';
                  return (
                    <Tr key={p.id || i} className={isCharge ? 'bg-amber-50/30' : ''}>
                      <Td><span className="font-semibold text-navy-700">{p.unit}</span></Td>
                      <Td className="font-medium">{p.owner}</Td>
                      <Td>
                        <span className={`font-bold ${isCharge ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {isCharge ? '+' : ''}{formatCurrency(Math.abs(parseFloat(p.amount)))}
                        </span>
                      </Td>
                      <Td>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${methodColor}`}>
                          {p.method}
                        </span>
                      </Td>
                      <Td className="text-slate-500 text-xs">{p.date}</Td>
                      <Td className="text-slate-400 text-xs italic">{p.note || '—'}</Td>
                      <Td><Badge variant={PMT_MAP[p.status]||'gray'}>{statusLabel}</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          {recentCharges > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-amber-50/40 flex justify-between items-center">
              <p className="text-xs text-slate-500">Fee charges billed to residents this period:</p>
              <span className="text-sm font-bold text-amber-700">+{formatCurrency(recentCharges)}</span>
            </div>
          )}
        </Card>
      )}

      {tab === 'accounts' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">All HOA Accounts</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{accs.length} resident{accs.length!==1?'s':''} · {autoPayCount} on auto-pay</p>
            </div>
            <input
              value={acctSearch} onChange={e => setAcctSearch(e.target.value)}
              placeholder="Search unit or owner…"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-52"
            />
          </div>
          <div className="px-5 py-1">
            <Table>
              <thead>
                <tr><Th>Unit</Th><Th>Owner</Th><Th>Email</Th><Th>Monthly</Th><Th>Balance</Th><Th>Status</Th><Th>Auto-pay</Th><Th>Last Payment</Th></tr>
              </thead>
              <tbody>
                {filteredAccts.map((a, i) => {
                  const meta = STATUS_META[a.status] || STATUS_META.current;
                  const lastPaid = a.last_paid_at
                    ? new Date(a.last_paid_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                    : '—';
                  return (
                    <Tr key={a.resident_id || i}>
                      <Td><span className="font-semibold text-navy-700">{a.unit}</span></Td>
                      <Td className="font-medium">{a.owner}</Td>
                      <Td className="text-slate-400 text-xs">{a.email || '—'}</Td>
                      <Td className="text-slate-600">{formatCurrency(a.monthly_amount || 150)}</Td>
                      <Td>
                        {parseFloat(a.balance) > 0
                          ? <span className="font-bold text-rose-600">{formatCurrency(parseFloat(a.balance))}</span>
                          : <span className="text-emerald-600 font-semibold">$0.00</span>
                        }
                      </Td>
                      <Td><Badge variant={meta.color}>{meta.label}</Badge></Td>
                      <Td>{a.auto_pay ? <Badge variant="blue">Auto-pay</Badge> : <span className="text-xs text-slate-400">Manual</span>}</Td>
                      <Td className="text-slate-400 text-xs">{lastPaid}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          {filteredAccts.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">No accounts match your search.</div>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader title="Monthly Collection History" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">6-Month Average</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(Math.round(MOCK_HISTORY.reduce((s,m)=>s+m.collected,0)/MOCK_HISTORY.length))}</p>
              <p className="text-[11px] text-slate-500">per month collected</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Best Month</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(Math.max(...MOCK_HISTORY.map(m=>m.collected)))}</p>
              <p className="text-[11px] text-slate-500">April 2026</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Expected/Month</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(22200)}</p>
              <p className="text-[11px] text-slate-500">148 units × $150</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MOCK_HISTORY} margin={{top:4,right:0,left:-15,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#737f96'}}/>
              <YAxis tick={{fontSize:9,fill:'#737f96'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
              <Bar dataKey="expected"  fill="#e2e5ec" radius={[3,3,0,0]} name="Expected"/>
              <Bar dataKey="collected" fill="#1e3a7a" radius={[3,3,0,0]} name="Collected"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
