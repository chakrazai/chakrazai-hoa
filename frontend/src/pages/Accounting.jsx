import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Plus, CheckCircle, Clock, AlertTriangle, Circle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard, Card, CardHeader, Button, ProgressBar, SectionHeader, formatCurrency, Badge } from '../components/ui';
import { accountingAPI, invoiceAPI } from '../lib/api';
import { getCommunityId } from '../lib/community';
import { clsx } from 'clsx';

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

// ─── Invoice store (shared with FinancialsPage and Vendor Detail) ─────────────

const MOCK_INVOICES_BASE = [
  { id:'INV-001', vendor:'Greenscape Landscaping', category:'Landscaping', invoiceNumber:'GS-2026-041', invoiceDate:'May 2, 2026', dueDate:'May 15, 2026', amount:4200, status:'unpaid', payments:[] },
  { id:'INV-002', vendor:'AquaCare Pool Services', category:'Pool & Spa', invoiceNumber:'AQ-2026-051', invoiceDate:'May 1, 2026', dueDate:'Jun 1, 2026', amount:1800, status:'unpaid', payments:[] },
  { id:'INV-003', vendor:'ProPlumb Emergency', category:'Plumbing', invoiceNumber:'PP-2026-0418', invoiceDate:'Apr 19, 2026', dueDate:'May 19, 2026', amount:1840, status:'paid', payments:[{ id:'PAY-001', date:'Apr 28, 2026', amount:1840, method:'Check', ref:'#4521', note:'Full payment' }] },
  { id:'INV-004', vendor:'SecureWatch Security', category:'Security', invoiceNumber:'SW-2026-MAY', invoiceDate:'May 1, 2026', dueDate:'May 15, 2026', amount:3200, status:'partial', payments:[{ id:'PAY-002', date:'May 5, 2026', amount:1600, method:'ACH', ref:'ACH-8821', note:'First installment — 50%' }] },
  { id:'INV-005', vendor:'Greenscape Landscaping', category:'Landscaping', invoiceNumber:'GS-2026-031', invoiceDate:'Apr 1, 2026', dueDate:'Apr 15, 2026', amount:4200, status:'paid', payments:[{ id:'PAY-003', date:'Apr 8, 2026', amount:4200, method:'Check', ref:'#4498', note:'Full payment' }] },
  { id:'INV-006', vendor:'PaintRight Contractors', category:'Painting & General', invoiceNumber:'PR-2026-002', invoiceDate:'Apr 15, 2026', dueDate:'May 1, 2026', amount:6000, status:'partial', payments:[{ id:'PAY-004', date:'Apr 20, 2026', amount:3000, method:'Check', ref:'#4510', note:'50% deposit' }, { id:'PAY-005', date:'May 1, 2026', amount:2000, method:'ACH', ref:'ACH-9103', note:'Progress payment' }] },
  { id:'INV-007', vendor:'AquaCare Pool Services', category:'Pool & Spa', invoiceNumber:'AQ-2026-041', invoiceDate:'Apr 1, 2026', dueDate:'May 1, 2026', amount:1800, status:'overdue', payments:[{ id:'PAY-006', date:'Apr 25, 2026', amount:900, method:'ACH', ref:'ACH-8740', note:'Partial payment' }] },
  { id:'INV-008', vendor:'SecureLock Inc.', category:'Locksmith & Gates', invoiceNumber:'SL-2026-Q1', invoiceDate:'Mar 31, 2026', dueDate:'Apr 15, 2026', amount:1700, status:'paid', payments:[{ id:'PAY-007', date:'Apr 10, 2026', amount:1700, method:'Check', ref:'#4505', note:'Full payment' }] },
  { id:'INV-009', vendor:'Metro Collection Group', category:'Collections', invoiceNumber:'MCG-2026-Q1', invoiceDate:'Apr 1, 2026', dueDate:'Apr 30, 2026', amount:630, status:'paid', payments:[{ id:'PAY-008', date:'Apr 22, 2026', amount:630, method:'ACH', ref:'ACH-8801', note:'Full payment' }] },
  { id:'INV-010', vendor:'SecureWatch Security', category:'Security', invoiceNumber:'SW-2026-APR', invoiceDate:'Apr 1, 2026', dueDate:'Apr 15, 2026', amount:3200, status:'paid', payments:[{ id:'PAY-009', date:'Apr 12, 2026', amount:2000, method:'Check', ref:'#4502', note:'First installment' }, { id:'PAY-010', date:'Apr 20, 2026', amount:1200, method:'ACH', ref:'ACH-8720', note:'Balance — final installment' }] },
];

function readInvoices() {
  try {
    const lsAll = JSON.parse(localStorage.getItem('hoa_invoices_v1') || '[]');
    const lsMap = {};
    lsAll.forEach(i => { if (i.id) lsMap[i.id] = i; });
    const base = MOCK_INVOICES_BASE.map(i => lsMap[i.id] || i);
    const extra = lsAll.filter(i => !MOCK_INVOICES_BASE.find(m => m.id === i.id));
    return [...extra, ...base];
  } catch { return MOCK_INVOICES_BASE; }
}

function paidAmt(inv) { return inv.payments.reduce((s, p) => s + p.amount, 0); }
function invStatus(inv) {
  const p = paidAmt(inv);
  if (p >= inv.amount) return 'paid';
  if (p > 0) return inv.status === 'overdue' ? 'overdue' : 'partial';
  return inv.status;
}

const STATUS_META = {
  paid:    { label:'Paid',    color:'green' },
  partial: { label:'Partial', color:'blue'  },
  unpaid:  { label:'Unpaid',  color:'amber' },
  overdue: { label:'Overdue', color:'red'   },
};

const METHOD_COLORS = {
  Check:'bg-slate-100 text-slate-700', ACH:'bg-blue-50 text-blue-700',
  'Wire Transfer':'bg-purple-50 text-purple-700', 'Credit Card':'bg-rose-50 text-rose-700',
  Zelle:'bg-violet-50 text-violet-700', Cash:'bg-green-50 text-green-700',
};

export default function Accounting() {
  const communityId = getCommunityId();
  const { data: summary } = useQuery({ queryKey:['accounting-summary'], queryFn:()=>accountingAPI.summary(communityId).then(r=>r.data), placeholderData:MOCK_SUMMARY });
  const { data: history }  = useQuery({ queryKey:['accounting-history'], queryFn:()=>accountingAPI.history(communityId).then(r=>r.data),  placeholderData:MOCK_HISTORY  });

  const { data: dbInvoices = [] } = useQuery({ queryKey:['invoices', communityId], queryFn:()=>invoiceAPI.list(communityId).then(r=>r.data), placeholderData:[] });
  const invoices = useMemo(() => dbInvoices.length ? dbInvoices : readInvoices(), [dbInvoices]);

  const s = summary || MOCK_SUMMARY;
  const h = history || MOCK_HISTORY;
  const total = MOCK_EXPENSES.reduce((acc,e)=>acc+e.amount,0);

  // Flatten all payments across all invoices, sorted newest first
  const allPayments = invoices
    .flatMap(inv => inv.payments.map(p => ({ ...p, vendor: inv.vendor, category: inv.category, invoiceNumber: inv.invoiceNumber, invAmount: inv.amount })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Compute per-vendor spend from actual paid amounts
  const vendorSpend = {};
  invoices.forEach(inv => {
    const paid = paidAmt(inv);
    if (paid > 0) vendorSpend[inv.vendor] = (vendorSpend[inv.vendor] || 0) + paid;
  });

  // Invoice status summary
  const invSummary = {
    totalInvoiced: invoices.reduce((s, i) => s + i.amount, 0),
    totalPaid:     invoices.reduce((s, i) => s + paidAmt(i), 0),
    outstanding:   invoices.reduce((s, i) => s + Math.max(0, i.amount - paidAmt(i)), 0),
    overdue:       invoices.filter(i => invStatus(i) === 'overdue').reduce((s, i) => s + Math.max(0, i.amount - paidAmt(i)), 0),
  };

  return (
    <div className="page-enter">
      <SectionHeader title="Accounting" subtitle="Bank-synced financials, reserve tracking, and vendor payment ledger"
        action={<><Button variant="secondary" size="sm"><Download size={12}/>Export</Button><Button variant="primary" size="sm"><Plus size={12}/>Add Transaction</Button></>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Operating Account" value={formatCurrency(s.operatingBalance)} sub="Synced Apr 26" subVariant="good" />
        <MetricCard label="Reserve Fund"       value={formatCurrency(s.reserveBalance)}  sub={`${s.reservePct}% funded`} subVariant="warn" />
        <MetricCard label="Monthly Income"     value={formatCurrency(s.monthlyIncome)}   sub="April 2026" />
        <MetricCard label="Net Income"         value={formatCurrency(s.netIncome)}        sub={`vs ${formatCurrency(s.monthlyExpenses)} expenses`} subVariant="good" />
      </div>

      {/* Invoice spend summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Invoiced"  value={formatCurrency(invSummary.totalInvoiced)} sub={`${invoices.length} invoices`} />
        <MetricCard label="Paid to Vendors" value={formatCurrency(invSummary.totalPaid)}     sub="All time" subVariant="good" />
        <MetricCard label="Outstanding"     value={formatCurrency(invSummary.outstanding)}   sub="Unpaid balance" subVariant="warn" />
        <MetricCard label="Overdue"         value={formatCurrency(invSummary.overdue)}       sub="Past due date" subVariant="bad" />
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

      {/* Vendor payment ledger — live from invoices store */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Vendor Payment Ledger</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">All payments recorded in Invoices & Payments</p>
            </div>
            <span className="text-[11px] text-slate-400">{allPayments.length} payments</span>
          </div>
          {allPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No payments recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {allPayments.map(pay => (
                <div key={pay.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-slate-800">{pay.vendor}</p>
                      <span className={clsx('inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold', METHOD_COLORS[pay.method] || 'bg-slate-100 text-slate-700')}>{pay.method}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pay.invoiceNumber} · {pay.category}</p>
                    {pay.ref && <p className="text-[11px] text-slate-400">Ref: {pay.ref}</p>}
                    {pay.note && <p className="text-[11px] text-slate-500 italic">{pay.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(pay.amount)}</p>
                    <p className="text-[11px] text-slate-400">{pay.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {allPayments.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Paid</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(allPayments.reduce((s, p) => s + p.amount, 0))}</span>
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Invoice Status Summary</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Live from Invoices & Payments</p>
          </div>
          <div className="divide-y divide-slate-50">
            {invoices.map(inv => {
              const paid = paidAmt(inv);
              const bal  = Math.max(0, inv.amount - paid);
              const st   = invStatus(inv);
              const meta = STATUS_META[st] || STATUS_META.unpaid;
              const pct  = inv.amount > 0 ? Math.min(100, Math.round(paid / inv.amount * 100)) : 0;
              return (
                <div key={inv.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-800 flex-1 truncate">{inv.vendor}</p>
                    <Badge variant={meta.color}>{meta.label}</Badge>
                    <p className="text-sm font-bold text-slate-900 flex-shrink-0">{formatCurrency(inv.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-slate-400 flex-1">{inv.invoiceNumber}</p>
                    {paid > 0 && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-navy-600 rounded-full" style={{ width:`${pct}%` }}/>
                        </div>
                        <span className="text-[10px] text-slate-400">{pct}%</span>
                      </div>
                    )}
                    {bal > 0 && <p className="text-[11px] text-rose-600 font-semibold flex-shrink-0">Bal: {formatCurrency(bal)}</p>}
                    {bal === 0 && paid > 0 && <p className="text-[11px] text-emerald-600 font-semibold flex-shrink-0">Paid in full</p>}
                  </div>
                </div>
              );
            })}
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
