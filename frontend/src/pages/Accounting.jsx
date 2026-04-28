import { useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard, Card, CardHeader, Button, ProgressBar, SectionHeader, formatCurrency } from '../components/ui';
import { accountingAPI } from '../lib/api';

const MOCK_SUMMARY = { operatingBalance:48320, reserveBalance:184200, reservePct:61, monthlyIncome:22348, monthlyExpenses:18205, netIncome:4143 };
const MOCK_HISTORY = [
  { month:'Nov', income:20800, expenses:17200 },
  { month:'Dec', income:21000, expenses:19800 },
  { month:'Jan', income:20200, expenses:16900 },
  { month:'Feb', income:21600, expenses:17400 },
  { month:'Mar', income:21900, expenses:18100 },
  { month:'Apr', income:22348, expenses:18205 },
];
const MOCK_EXPENSES = [
  { category:'Landscaping',         vendor:'Greenscape',  amount:4200 },
  { category:'Pool & Spa',          vendor:'AquaCare',    amount:1800 },
  { category:'Security',            vendor:'SecureWatch', amount:3200 },
  { category:'Insurance',           vendor:'HOA Mutual',  amount:2400 },
  { category:'Utilities',           vendor:'Various',     amount:1950 },
  { category:'Administrative',      vendor:'Internal',    amount:820  },
  { category:'Reserve contribution', vendor:'Reserve',    amount:3835 },
];

export default function Accounting() {
  const { data: summary } = useQuery({ queryKey:['accounting-summary'], queryFn:()=>accountingAPI.summary(1).then(r=>r.data), placeholderData:MOCK_SUMMARY });
  const { data: history }  = useQuery({ queryKey:['accounting-history'], queryFn:()=>accountingAPI.history(1).then(r=>r.data),  placeholderData:MOCK_HISTORY  });

  const s = summary || MOCK_SUMMARY;
  const h = history || MOCK_HISTORY;
  const total = MOCK_EXPENSES.reduce((acc,e)=>acc+e.amount,0);

  return (
    <div className="page-enter">
      <SectionHeader title="Accounting" subtitle="Bank-synced financials, reserve tracking, and budget reporting"
        action={<><Button variant="secondary" size="sm"><Download size={12}/>Export</Button><Button variant="primary" size="sm"><Plus size={12}/>Add Transaction</Button></>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Operating Account" value={formatCurrency(s.operatingBalance)} sub="Synced Apr 26" subVariant="good" />
        <MetricCard label="Reserve Fund"       value={formatCurrency(s.reserveBalance)}  sub={`${s.reservePct}% funded`} subVariant="warn" />
        <MetricCard label="Monthly Income"     value={formatCurrency(s.monthlyIncome)}   sub="April 2026" />
        <MetricCard label="Net Income"         value={formatCurrency(s.netIncome)}        sub={`vs ${formatCurrency(s.monthlyExpenses)} expenses`} subVariant="good" />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader title="Income vs. Expenses (6 months)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={h} margin={{top:0,right:0,left:-18,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7"/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:'#737f96'}}/>
              <YAxis tick={{fontSize:9,fill:'#737f96'}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
              <Bar dataKey="income"   fill="#1e3a7a" radius={[3,3,0,0]} name="Income"/>
              <Bar dataKey="expenses" fill="#c5cad6" radius={[3,3,0,0]} name="Expenses"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Expense Breakdown — April 2026" />
          {MOCK_EXPENSES.map(e => (
            <div key={e.category} className="mb-2.5">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">{e.category}</span>
                <span className="text-xs font-bold text-slate-800">{formatCurrency(e.amount)}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-navy-600 rounded-full" style={{width:`${Math.round(e.amount/total*100)}%`}}/>
              </div>
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
            <p className="text-2xl font-display text-slate-900">{formatCurrency(s.reserveBalance)}</p>
            <p className="text-xs text-amber-600 mt-1 mb-3">{s.reservePct}% funded — below recommended 70%</p>
            <ProgressBar value={s.reservePct} color="amber" />
          </div>
          <div className="text-xs space-y-0">
            {[['Fully funded target',formatCurrency(302000)],['Monthly contribution',formatCurrency(3835)],['Next reserve study','2027'],['10-year repair forecast',formatCurrency(480000)]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-2.5 border-b border-slate-50">
                <span className="text-slate-500">{l}</span>
                <span className="font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Underfunding Risk</p>
            <p className="text-xs text-amber-700 leading-relaxed">At current rate, fund reaches 70% by Q3 2028. Consider a special assessment if major repairs arise sooner.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
