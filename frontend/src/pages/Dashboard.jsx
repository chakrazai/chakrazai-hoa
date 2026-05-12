import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckSquare, Mail, FileText, Shield, CreditCard, Wrench, X, ChevronRight, Check } from 'lucide-react';
import { MetricCard, Card, CardHeader, Alert, Badge, Button, ProgressBar, StatusDot, LoadingSpinner, formatCurrency, formatPct } from '../components/ui';
import { communityAPI, complianceAPI, duesAPI } from '../lib/api';
import { getCommunityId } from '../lib/community';
import { MOCK_INBOX } from './OtherPages.jsx';

const MOCK_METRICS = {
  totalUnits: 148, collectionRate: 94.6, collectionRateChange: 2.1,
  monthlyRevenue: 22348, reserveFund: 184200, reserveFundPct: 61,
};
const MOCK_FINANCIALS = [
  { month:'Nov', income:20800, expenses:17200 }, { month:'Dec', income:21000, expenses:19800 },
  { month:'Jan', income:20200, expenses:16900 }, { month:'Feb', income:21600, expenses:17400 },
  { month:'Mar', income:21900, expenses:18100 }, { month:'Apr', income:22348, expenses:18205 },
];
const MOCK_COMPLIANCE = [
  { id:'ab130',  law:'AB 130', title:'Fine Schedule Caps',        status:'action_required', detail:'3 fines exceed the new $100/violation cap.' },
  { id:'sb326',  law:'SB 326', title:'Balcony Inspections',       status:'warning',         detail:'Not yet scheduled. 187 days remaining.' },
  { id:'ab2159', law:'AB 2159',title:'Electronic Voting',         status:'compliant',        detail:'System configured. Paper backup available.' },
  { id:'solar',  law:'Solar',  title:'Solar Panel Policy',        status:'compliant',        detail:'Policy adopted March 2025.' },
  { id:'sb900',  law:'SB 900', title:'Utility Repairs (14-Day)', status:'compliant',        detail:'SLA tracking active.' },
];

const PRIORITY_ORDER = { urgent: 0, normal: 1 };
const FILTER_TABS = [
  { id: 'all',        label: 'All'         },
  { id: 'email',      label: 'Emails'      },
  { id: 'invoice',    label: 'Invoices'    },
  { id: 'compliance', label: 'Compliance'  },
  { id: 'dues',       label: 'Dues'        },
  { id: 'maintenance',label: 'Maintenance' },
];

const TYPE_ICON = {
  email:       <Mail size={13} className="text-blue-500" />,
  invoice:     <FileText size={13} className="text-purple-500" />,
  compliance:  <Shield size={13} className="text-red-500" />,
  dues:        <CreditCard size={13} className="text-amber-500" />,
  maintenance: <Wrench size={13} className="text-emerald-500" />,
};

const TYPE_BG = {
  email:       'bg-blue-50',
  invoice:     'bg-purple-50',
  compliance:  'bg-red-50',
  dues:        'bg-amber-50',
  maintenance: 'bg-emerald-50',
};

function lsDismissed() {
  try { return JSON.parse(localStorage.getItem('hoa_todo_dismissed_v1') || '[]'); } catch { return []; }
}
function lsSetDismissed(ids) {
  try { localStorage.setItem('hoa_todo_dismissed_v1', JSON.stringify(ids)); } catch {}
}

export default function Dashboard({ onNavigate }) {
  const communityId = getCommunityId();
  const [dismissed, setDismissed] = useState(() => lsDismissed());
  const [filter, setFilter] = useState('all');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard', communityId],
    queryFn: () => communityAPI.dashboard(communityId).then(r => r.data),
    placeholderData: MOCK_METRICS,
  });

  const { data: compliance } = useQuery({
    queryKey: ['compliance', 'ca'],
    queryFn: () => complianceAPI.alerts('ca').then(r => r.data),
    placeholderData: MOCK_COMPLIANCE,
  });

  const { data: financials } = useQuery({
    queryKey: ['financials', communityId],
    queryFn: () => communityAPI.dashboard(communityId).then(r => r.data?.monthlyFinancials),
    placeholderData: MOCK_FINANCIALS,
  });

  const { data: delinquentData } = useQuery({
    queryKey: ['dues-delinquent', communityId],
    queryFn: () => duesAPI.delinquent(communityId).then(r => r.data),
    placeholderData: [],
  });

  const m = metrics || MOCK_METRICS;
  const complianceData = compliance || MOCK_COMPLIANCE;
  const financialData = financials || MOCK_FINANCIALS;
  const urgentAlerts = complianceData.filter(a => a.status === 'action_required' || a.status === 'warning');
  const passing = complianceData.filter(a => a.status === 'compliant').length;

  const todoItems = useMemo(() => {
    const items = [];

    // Unread resident emails
    MOCK_INBOX.filter(e => !e.read && e.fromType === 'resident').forEach(e => {
      items.push({
        id: `email-${e.id}`,
        type: 'email',
        priority: 'urgent',
        title: `Reply to ${e.from}`,
        sub: e.subject,
        date: e.date,
        actionLabel: 'Respond',
        page: 'communications',
        params: { openEmailId: e.id },
      });
    });

    // Unread vendor invoices
    MOCK_INBOX.filter(e => !e.read && e.fromType === 'vendor' && e.hasInvoice).forEach(e => {
      items.push({
        id: `invoice-${e.id}`,
        type: 'invoice',
        priority: 'normal',
        title: `Review invoice from ${e.from}`,
        sub: `${e.invoiceNumber} — ${formatCurrency(e.invoiceAmount || 0)}`,
        date: e.date,
        actionLabel: 'View Invoice',
        page: 'financials',
        params: null,
      });
    });

    // Compliance action items
    complianceData.filter(a => a.status === 'action_required').forEach(a => {
      items.push({
        id: `compliance-${a.id}`,
        type: 'compliance',
        priority: 'urgent',
        title: `${a.law} — ${a.title}`,
        sub: a.detail,
        date: 'Due now',
        actionLabel: 'Fix Now',
        page: 'compliance',
        params: null,
      });
    });

    // Delinquent accounts 60+ days
    const severe = (delinquentData || []).filter(d => (d.days_past_due || 0) >= 60);
    if (severe.length > 0) {
      items.push({
        id: 'dues-severe',
        type: 'dues',
        priority: 'urgent',
        title: `${severe.length} account${severe.length > 1 ? 's' : ''} 60+ days overdue`,
        sub: `Total: ${formatCurrency(severe.reduce((s, d) => s + Number(d.balance || 0), 0))}`,
        date: 'Action needed',
        actionLabel: 'Send Notice',
        page: 'dues',
        params: null,
      });
    }

    // AquaCare COI expiring
    items.push({
      id: 'coi-aquacare',
      type: 'invoice',
      priority: 'urgent',
      title: 'AquaCare COI expires May 20',
      sub: 'Certificate of Insurance renewal pending — confirm receipt',
      date: 'May 20',
      actionLabel: 'Review',
      page: 'vendors',
      params: null,
    });

    // Maintenance SLA
    items.push({
      id: 'maintenance-wo088',
      type: 'maintenance',
      priority: 'urgent',
      title: 'WO-088 — Gas line repair SLA',
      sub: 'SB 900 14-day deadline: April 29 · Assign vendor immediately',
      date: 'Apr 29',
      actionLabel: 'View Work Order',
      page: 'maintenance',
      params: null,
    });

    return items
      .filter(i => !dismissed.includes(i.id))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [complianceData, delinquentData, dismissed]);

  const visibleItems = filter === 'all' ? todoItems : todoItems.filter(i => i.type === filter);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    lsSetDismissed(next);
  };

  if (metricsLoading) return <LoadingSpinner />;

  return (
    <div className="page-enter">
      {/* Compliance alerts */}
      {urgentAlerts.slice(0, 2).map(a => (
        <Alert key={a.id} variant={a.status === 'action_required' ? 'danger' : 'warning'}
          title={`${a.law} — ${a.title}`}>
          {a.detail}{' '}
          <button onClick={() => onNavigate('compliance')} className="font-medium underline">View compliance →</button>
        </Alert>
      ))}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Units"     value={m.totalUnits}                       sub="Oakwood Estates" />
        <MetricCard label="Collection Rate" value={formatPct(m.collectionRate)}         sub={`+${m.collectionRateChange}% vs last month`} subVariant="good" />
        <MetricCard label="Monthly Revenue" value={formatCurrency(m.monthlyRevenue)}    sub="$150/unit average" />
        <MetricCard label="Reserve Fund"    value={formatCurrency(m.reserveFund)}       sub={`${m.reserveFundPct}% funded`} subVariant="warn" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader title="Revenue vs. Expenses (6 mo)"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate('accounting')}>Full report →</Button>} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={financialData} margin={{ top:0, right:0, left:-22, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f5f7" />
              <XAxis dataKey="month" tick={{ fontSize:10, fill:'#737f96' }} />
              <YAxis tick={{ fontSize:9, fill:'#737f96' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ fontSize:11, borderRadius:8 }} />
              <Bar dataKey="income"   fill="#1e3a7a" radius={[3,3,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#e2e5ec" radius={[3,3,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Compliance — California"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate('compliance')}>View all →</Button>} />
          {complianceData.map(a => (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <StatusDot status={a.status === 'action_required' ? 'red' : a.status === 'warning' ? 'amber' : 'green'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700">{a.law} — {a.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{a.detail}</p>
              </div>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Overall compliance</span>
              <span className="font-medium text-slate-700">{passing}/{complianceData.length} passing</span>
            </div>
            <ProgressBar value={passing} max={complianceData.length}
              color={passing/complianceData.length >= 0.8 ? 'emerald' : 'amber'} />
          </div>
        </Card>
      </div>

      {/* To-Do List */}
      <Card padding={false} className="mb-5">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-slate-700">Action Items</h3>
            {todoItems.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-rose-500 text-white rounded-full">{todoItems.length}</span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                  filter === tab.id
                    ? 'bg-navy-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Check size={24} className="mb-2 text-emerald-400" />
            <p className="text-sm font-medium text-slate-500">All clear — no action items</p>
            <p className="text-xs mt-0.5">You're up to date in this category</p>
          </div>
        ) : (
          visibleItems.map(item => (
            <div key={item.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-center gap-3 hover:bg-slate-50 transition-colors group">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_BG[item.type]}`}>
                {TYPE_ICON[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {item.priority === 'urgent' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-600 uppercase tracking-wide">Urgent</span>
                  )}
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-slate-400">{item.date}</span>
                <button
                  onClick={() => onNavigate(item.page, item.params)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-navy-600 bg-navy-50 border border-navy-200 rounded-lg hover:bg-navy-100 transition-colors opacity-0 group-hover:opacity-100">
                  {item.actionLabel} <ChevronRight size={10} />
                </button>
                <button
                  onClick={() => dismiss(item.id)}
                  title="Dismiss"
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Delinquent Accounts"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate('dues')}>View →</Button>} />
          {[{l:'30 days',u:4,a:600,c:'text-amber-600'},{l:'60 days',u:2,a:450,c:'text-amber-800'},{l:'Collections',u:1,a:900,c:'text-rose-600'}].map(b=>(
            <div key={b.l} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div><p className="text-xs font-medium text-slate-700">{b.l} past due</p><p className="text-[11px] text-slate-400">{b.u} units</p></div>
              <p className={`text-sm font-semibold ${b.c}`}>{formatCurrency(b.a)}</p>
            </div>
          ))}
          <Button variant="secondary" size="sm" className="w-full justify-center mt-3" onClick={() => onNavigate('dues')}>Send Reminders</Button>
        </Card>

        <Card>
          <CardHeader title="Open Violations"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate('violations')}>View →</Button>} />
          {[{t:'Parking',n:3},{t:'Landscaping',n:2},{t:'Noise',n:1},{t:'Modification',n:1}].map(v=>(
            <div key={v.t} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2"><AlertTriangle size={11} className="text-amber-500" /><span className="text-xs text-slate-700">{v.t}</span></div>
              <Badge variant="amber">{v.n} open</Badge>
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader title="Maintenance"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate('maintenance')}>View →</Button>} />
          {[{l:'New today',v:'2 requests',c:'text-slate-800'},{l:'In progress',v:'3 open',c:'text-navy-700'},{l:'Pending vendor',v:'2 waiting',c:'text-amber-600'},{l:'Completed (30d)',v:'14 done',c:'text-emerald-600'}].map(m=>(
            <div key={m.l} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-xs text-slate-500">{m.l}</span>
              <span className={`text-xs font-semibold ${m.c}`}>{m.v}</span>
            </div>
          ))}
          <Alert variant="info" title="SB 900 SLA" className="mt-3">WO-088 gas line — deadline April 29</Alert>
        </Card>
      </div>
    </div>
  );
}
