import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Send, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard, Card, CardHeader, Badge, Alert, Button, Table, Th, Td, Tr, Tabs, SectionHeader, formatCurrency } from '../components/ui';
import { duesAPI } from '../lib/api';

const MOCK_DELINQUENT = [
  { id:1, unit:'Unit 33',  owner:'Michael Torres', daysPastDue:92, amount:900, status:'collections' },
  { id:2, unit:'Unit 67',  owner:'Amanda Liu',     daysPastDue:61, amount:300, status:'escalated'   },
  { id:3, unit:'Unit 104', owner:'Robert Patel',   daysPastDue:61, amount:150, status:'escalated'   },
  { id:4, unit:'Unit 12',  owner:'Diana Foster',   daysPastDue:32, amount:150, status:'reminder'    },
  { id:5, unit:'Unit 55',  owner:'Kevin Zhang',    daysPastDue:32, amount:150, status:'reminder'    },
];

const MOCK_PAYMENTS = [
  { id:1, unit:'Unit 42',  owner:'Sarah Chen',    amount:150, method:'ACH',   date:'Apr 26', status:'cleared'    },
  { id:2, unit:'Unit 7',   owner:'James Okonkwo', amount:150, method:'Card',  date:'Apr 25', status:'cleared'    },
  { id:3, unit:'Unit 119', owner:'Maria Garcia',  amount:150, method:'ACH',   date:'Apr 25', status:'processing' },
  { id:4, unit:'Unit 83',  owner:'Tom Nakamura',  amount:150, method:'Check', date:'Apr 24', status:'cleared'    },
];

const MOCK_HISTORY = [
  { month:'Nov', collected:20800, expected:22200 },
  { month:'Dec', collected:21000, expected:22200 },
  { month:'Jan', collected:20200, expected:22200 },
  { month:'Feb', collected:21600, expected:22200 },
  { month:'Mar', collected:21900, expected:22200 },
  { month:'Apr', collected:21150, expected:22200 },
];

const delinqMap = { collections:'red', escalated:'amber', reminder:'amber', overdue:'gray' };
const pmtMap    = { cleared:'green', processing:'blue', returned:'red' };

export default function Dues() {
  const [tab, setTab] = useState('delinquent');

  const { data: delinquent } = useQuery({ queryKey:['dues-delinquent'], queryFn:()=>duesAPI.delinquent(1).then(r=>r.data), placeholderData:MOCK_DELINQUENT });
  const { data: payments }   = useQuery({ queryKey:['dues-payments'],   queryFn:()=>duesAPI.payments(1).then(r=>r.data),   placeholderData:MOCK_PAYMENTS   });

  const list = delinquent || MOCK_DELINQUENT;
  const pmts  = payments  || MOCK_PAYMENTS;
  const total = list.reduce((s,a)=>s+a.amount,0);

  return (
    <div className="page-enter">
      <SectionHeader title="Dues & Payments" subtitle="Collections, delinquencies, and payment history"
        action={<><Button variant="secondary" size="sm"><Download size={12}/>Export</Button><Button variant="primary" size="sm"><Plus size={12}/>Record Payment</Button></>} />

      <Alert variant="warning" title="AB 130 Fine Cap">California fines capped at $100/violation. Ensure compliance before sending new notices.</Alert>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Collected (Apr)" value={formatCurrency(21150)} sub="141 of 148 units" subVariant="good" />
        <MetricCard label="Total Delinquent" value={formatCurrency(total)} sub={`${list.length} units`} subVariant="bad" />
        <MetricCard label="In Collections"  value={formatCurrency(900)}   sub="1 unit" subVariant="bad" />
        <MetricCard label="Collection Rate" value="94.6%"                  sub="+2.1% MoM" subVariant="good" />
      </div>

      <Tabs tabs={[{id:'delinquent',label:'Delinquent Accounts',count:list.length},{id:'payments',label:'Recent Payments'},{id:'history',label:'Collection History'}]} activeTab={tab} onChange={setTab} />

      {tab === 'delinquent' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700">Delinquent Accounts</h3>
            <Button variant="secondary" size="sm"><Send size={12}/>Send All Reminders</Button>
          </div>
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Days Past Due</Th><Th>Amount</Th><Th>Status</Th><Th>Action</Th></tr></thead>
              <tbody>{list.map(a => (
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
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs text-slate-400">Total delinquent: <span className="font-semibold text-rose-600">{formatCurrency(total)}</span></p>
            <Button variant="primary" size="sm">Draft Collection Letter</Button>
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Recent Payments</h3></div>
          <div className="px-5 py-1">
            <Table>
              <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Amount</Th><Th>Method</Th><Th>Date</Th><Th>Status</Th></tr></thead>
              <tbody>{pmts.map(p => (
                <Tr key={p.id}>
                  <Td><span className="font-semibold">{p.unit}</span></Td>
                  <Td>{p.owner}</Td>
                  <Td><span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span></Td>
                  <Td>{p.method}</Td>
                  <Td className="text-slate-400">{p.date}</Td>
                  <Td><Badge variant={pmtMap[p.status]||'gray'}>{p.status==='cleared'?'Cleared':p.status==='processing'?'Processing':'Returned'}</Badge></Td>
                </Tr>
              ))}</tbody>
            </Table>
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader title="Monthly Collection History" />
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
