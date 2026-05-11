import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Download, FileText, Paperclip, X, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertTriangle, Circle, CreditCard, Building2,
} from 'lucide-react';
import { Card, Badge, Button, SectionHeader, MetricCard, formatCurrency } from '../components/ui';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INVOICES = [
  {
    id: 'INV-001',
    vendor: 'Greenscape Landscaping', category: 'Landscaping',
    invoiceNumber: 'GS-2026-041', invoiceDate: 'May 2, 2026', dueDate: 'May 15, 2026',
    amount: 4200, description: 'April 2026 landscaping services — 4 visits, mowing, trimming, seasonal planting',
    status: 'unpaid', doc: null,
    payments: [],
  },
  {
    id: 'INV-002',
    vendor: 'AquaCare Pool Services', category: 'Pool & Spa',
    invoiceNumber: 'AQ-2026-051', invoiceDate: 'May 1, 2026', dueDate: 'Jun 1, 2026',
    amount: 1800, description: 'May 2026 pool & spa maintenance — 8 visits, chemical balancing',
    status: 'unpaid', doc: null,
    payments: [],
  },
  {
    id: 'INV-003',
    vendor: 'ProPlumb Emergency', category: 'Plumbing',
    invoiceNumber: 'PP-2026-0418', invoiceDate: 'Apr 19, 2026', dueDate: 'May 19, 2026',
    amount: 1840, description: 'Emergency main water line repair Apr 18 — labor $960, materials $580, after-hours surcharge $300',
    status: 'paid', doc: null,
    payments: [
      { id: 'PAY-001', date: 'Apr 28, 2026', amount: 1840, method: 'Check', ref: '#4521', note: 'Full payment — check mailed Apr 27' },
    ],
  },
  {
    id: 'INV-004',
    vendor: 'SecureWatch Security', category: 'Security',
    invoiceNumber: 'SW-2026-MAY', invoiceDate: 'May 1, 2026', dueDate: 'May 15, 2026',
    amount: 3200, description: 'May 2026 security guard services + camera monitoring',
    status: 'partial', doc: null,
    payments: [
      { id: 'PAY-002', date: 'May 5, 2026', amount: 1600, method: 'ACH', ref: 'ACH-8821', note: 'First installment — 50%' },
    ],
  },
  {
    id: 'INV-005',
    vendor: 'Greenscape Landscaping', category: 'Landscaping',
    invoiceNumber: 'GS-2026-031', invoiceDate: 'Apr 1, 2026', dueDate: 'Apr 15, 2026',
    amount: 4200, description: 'March 2026 landscaping services — 4 visits',
    status: 'paid', doc: null,
    payments: [
      { id: 'PAY-003', date: 'Apr 8, 2026', amount: 4200, method: 'Check', ref: '#4498', note: 'Full payment' },
    ],
  },
  {
    id: 'INV-006',
    vendor: 'PaintRight Contractors', category: 'Painting & General',
    invoiceNumber: 'PR-2026-002', invoiceDate: 'Apr 15, 2026', dueDate: 'May 1, 2026',
    amount: 6000, description: 'Building A exterior painting — Phase 1 deposit (50%) + Phase 2 progress payment',
    status: 'partial', doc: null,
    payments: [
      { id: 'PAY-004', date: 'Apr 20, 2026', amount: 3000, method: 'Check', ref: '#4510', note: '50% deposit per contract' },
      { id: 'PAY-005', date: 'May 1, 2026',  amount: 2000, method: 'ACH',   ref: 'ACH-9103', note: 'Progress payment — Phase 2 milestone' },
    ],
  },
  {
    id: 'INV-007',
    vendor: 'AquaCare Pool Services', category: 'Pool & Spa',
    invoiceNumber: 'AQ-2026-041', invoiceDate: 'Apr 1, 2026', dueDate: 'May 1, 2026',
    amount: 1800, description: 'April 2026 pool & spa maintenance — partial payment pending COI resolution',
    status: 'overdue', doc: null,
    payments: [
      { id: 'PAY-006', date: 'Apr 25, 2026', amount: 900, method: 'ACH', ref: 'ACH-8740', note: 'Partial — holding balance pending COI renewal confirmation' },
    ],
  },
  {
    id: 'INV-008',
    vendor: 'SecureLock Inc.', category: 'Locksmith & Gates',
    invoiceNumber: 'SL-2026-Q1', invoiceDate: 'Mar 31, 2026', dueDate: 'Apr 15, 2026',
    amount: 1700, description: 'Q1 2026 gate PM (2 visits) + 12 new FOB programming + 1 emergency lockout',
    status: 'paid', doc: null,
    payments: [
      { id: 'PAY-007', date: 'Apr 10, 2026', amount: 1700, method: 'Check', ref: '#4505', note: 'Full payment' },
    ],
  },
  {
    id: 'INV-009',
    vendor: 'Metro Collection Group', category: 'Collections',
    invoiceNumber: 'MCG-2026-Q1', invoiceDate: 'Apr 1, 2026', dueDate: 'Apr 30, 2026',
    amount: 630, description: 'Q1 2026 collections services — 15% contingency on $4,200 collected',
    status: 'paid', doc: null,
    payments: [
      { id: 'PAY-008', date: 'Apr 22, 2026', amount: 630, method: 'ACH', ref: 'ACH-8801', note: 'Full payment' },
    ],
  },
  {
    id: 'INV-010',
    vendor: 'SecureWatch Security', category: 'Security',
    invoiceNumber: 'SW-2026-APR', invoiceDate: 'Apr 1, 2026', dueDate: 'Apr 15, 2026',
    amount: 3200, description: 'April 2026 security guard services + camera monitoring',
    status: 'paid', doc: null,
    payments: [
      { id: 'PAY-009', date: 'Apr 12, 2026', amount: 2000, method: 'Check', ref: '#4502', note: 'First installment' },
      { id: 'PAY-010', date: 'Apr 20, 2026', amount: 1200, method: 'ACH',   ref: 'ACH-8720', note: 'Balance — second and final installment' },
    ],
  },
];

const PAYMENT_METHODS = ['Check', 'ACH', 'Wire Transfer', 'Credit Card', 'Zelle', 'Cash'];
const VENDORS_LIST = [
  'Greenscape Landscaping', 'AquaCare Pool Services', 'ProPlumb Emergency',
  'SecureWatch Security', 'PaintRight Contractors', 'Metro Collection Group',
  'SecureLock Inc.', 'Other',
];
const CATEGORIES = [
  'Landscaping', 'Pool & Spa', 'Plumbing', 'Security', 'Painting & General',
  'Collections', 'Locksmith & Gates', 'Electrical', 'HVAC', 'Insurance',
  'Utilities', 'Administrative', 'Other',
];

const LS_KEY = 'hoa_invoices_v1';
function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 500))); } catch {} }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paidAmount(inv) { return inv.payments.reduce((s, p) => s + p.amount, 0); }
function balance(inv)    { return Math.max(0, inv.amount - paidAmount(inv)); }

const STATUS_META = {
  paid:    { label: 'Paid',         color: 'green',  Icon: CheckCircle },
  partial: { label: 'Partial',      color: 'blue',   Icon: Clock },
  unpaid:  { label: 'Unpaid',       color: 'amber',  Icon: Circle },
  overdue: { label: 'Overdue',      color: 'red',    Icon: AlertTriangle },
};

function deriveStatus(inv) {
  const paid = paidAmount(inv);
  if (paid >= inv.amount) return 'paid';
  if (paid > 0) return inv.status === 'overdue' ? 'overdue' : 'partial';
  return inv.status;
}

const inp = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const lbl = 'block text-xs font-medium text-slate-500 mb-1';

// ─── Add Invoice Modal ────────────────────────────────────────────────────────

function AddInvoiceModal({ onClose, onSave }) {
  const docRef = useRef(null);
  const [form, setForm] = useState({
    vendor: '', category: '', invoiceNumber: '', invoiceDate: '', dueDate: '',
    amount: '', description: '',
  });
  const [doc, setDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.vendor)         e.vendor = 'Required';
    if (!form.invoiceNumber)  e.invoiceNumber = 'Required';
    if (!form.invoiceDate)    e.invoiceDate = 'Required';
    if (!form.dueDate)        e.dueDate = 'Required';
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleDoc = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setDoc({ name: file.name, size: file.size, dataUrl: ev.target.result });
    reader.readAsDataURL(file); e.target.value = '';
  };

  const save = () => {
    if (!validate()) return;
    onSave({
      id: `INV-${Date.now()}`,
      vendor: form.vendor, category: form.category,
      invoiceNumber: form.invoiceNumber,
      invoiceDate: new Date(form.invoiceDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      dueDate: new Date(form.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      amount: parseFloat(form.amount),
      description: form.description,
      status: 'unpaid', doc, payments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">Add Invoice</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Vendor *</label>
              <select value={form.vendor} onChange={e => { f('vendor')(e.target.value); f('category')(CATEGORIES[VENDORS_LIST.indexOf(e.target.value)] || ''); }} className={clsx(inp, errors.vendor && 'border-rose-300')}>
                <option value="">Select vendor…</option>
                {VENDORS_LIST.map(v => <option key={v}>{v}</option>)}
              </select>
              {errors.vendor && <p className="text-[11px] text-rose-500 mt-1">{errors.vendor}</p>}
            </div>
            <div className="col-span-2">
              <label className={lbl}>Category</label>
              <select value={form.category} onChange={e => f('category')(e.target.value)} className={inp}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Invoice Number *</label>
              <input value={form.invoiceNumber} onChange={e => f('invoiceNumber')(e.target.value)} className={clsx(inp, errors.invoiceNumber && 'border-rose-300')} placeholder="e.g. GS-2026-042"/>
              {errors.invoiceNumber && <p className="text-[11px] text-rose-500 mt-1">{errors.invoiceNumber}</p>}
            </div>
            <div>
              <label className={lbl}>Amount ($) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => f('amount')(e.target.value)} className={clsx(inp, errors.amount && 'border-rose-300')} placeholder="0.00"/>
              {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className={lbl}>Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => f('invoiceDate')(e.target.value)} className={clsx(inp, errors.invoiceDate && 'border-rose-300')}/>
              {errors.invoiceDate && <p className="text-[11px] text-rose-500 mt-1">{errors.invoiceDate}</p>}
            </div>
            <div>
              <label className={lbl}>Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => f('dueDate')(e.target.value)} className={clsx(inp, errors.dueDate && 'border-rose-300')}/>
              {errors.dueDate && <p className="text-[11px] text-rose-500 mt-1">{errors.dueDate}</p>}
            </div>
            <div className="col-span-2">
              <label className={lbl}>Description</label>
              <textarea value={form.description} onChange={e => f('description')(e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="What services does this invoice cover?"/>
            </div>
            <div className="col-span-2">
              <input ref={docRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleDoc}/>
              <button type="button" onClick={() => docRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:border-navy-300 hover:bg-navy-50 transition-colors">
                <Paperclip size={11}/>{doc ? doc.name : 'Attach Invoice Document (PDF)'}
              </button>
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

// ─── Record Payment inline panel ──────────────────────────────────────────────

function RecordPaymentPanel({ invoice, onSave, onClose }) {
  const receiptRef = useRef(null);
  const remaining = balance(invoice);
  const [form, setForm] = useState({ date: '', amount: String(remaining), method: 'Check', ref: '', note: '' });
  const [receipt, setReceipt] = useState(null);
  const [err, setErr] = useState('');
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleReceipt = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setReceipt({ name: file.name, size: file.size, dataUrl: ev.target.result });
    reader.readAsDataURL(file); e.target.value = '';
  };

  const save = () => {
    if (!form.date) { setErr('Payment date is required'); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
    if (amt > remaining + 0.01) { setErr(`Amount exceeds balance of ${formatCurrency(remaining)}`); return; }
    onSave({
      id: `PAY-${Date.now()}`,
      date: new Date(form.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      amount: amt, method: form.method, ref: form.ref, note: form.note, receipt,
    });
  };

  return (
    <div className="mt-3 p-4 bg-navy-50 border border-navy-100 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-navy-900">Record Payment — Balance: {formatCurrency(remaining)}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
      </div>
      {err && <p className="text-[11px] text-rose-600 font-medium">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Payment Date *</label>
          <input type="date" value={form.date} onChange={e => f('date')(e.target.value)} className={inp}/>
        </div>
        <div>
          <label className={lbl}>Amount ($) *</label>
          <input type="number" min="0.01" step="0.01" max={remaining} value={form.amount} onChange={e => f('amount')(e.target.value)} className={inp}/>
        </div>
        <div>
          <label className={lbl}>Payment Method</label>
          <select value={form.method} onChange={e => f('method')(e.target.value)} className={inp}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>{form.method === 'Check' ? 'Check Number' : 'Reference / Transaction ID'}</label>
          <input value={form.ref} onChange={e => f('ref')(e.target.value)} className={inp} placeholder={form.method === 'Check' ? '#1234' : 'e.g. ACH-00123'}/>
        </div>
        <div className="col-span-2">
          <label className={lbl}>Note (optional)</label>
          <input value={form.note} onChange={e => f('note')(e.target.value)} className={inp} placeholder="e.g. First installment, final payment…"/>
        </div>
        <div className="col-span-2">
          <input ref={receiptRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleReceipt}/>
          <button type="button" onClick={() => receiptRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg hover:border-navy-300 hover:bg-navy-50 transition-colors">
            <Paperclip size={11}/>{receipt ? receipt.name : 'Attach Receipt (optional)'}
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
        <button onClick={save}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 transition-colors">
          <CreditCard size={11}/>Save Payment
        </button>
      </div>
    </div>
  );
}

// ─── Method icon ──────────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  const colors = { Check:'bg-slate-100 text-slate-700', ACH:'bg-blue-50 text-blue-700', 'Wire Transfer':'bg-purple-50 text-purple-700', 'Credit Card':'bg-rose-50 text-rose-700', Zelle:'bg-violet-50 text-violet-700', Cash:'bg-green-50 text-green-700' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold', colors[method] || 'bg-slate-100 text-slate-700')}>
      {method === 'Check' && <FileText size={9}/>}
      {(method === 'ACH' || method === 'Wire Transfer') && <Building2 size={9}/>}
      {(method === 'Credit Card' || method === 'Zelle') && <CreditCard size={9}/>}
      {method}
    </span>
  );
}

// ─── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ invoice, onPaymentAdded }) {
  const [expanded, setExpanded]       = useState(false);
  const [recording, setRecording]     = useState(false);
  const [payments, setPayments]       = useState(invoice.payments);
  const [localAmount, setLocalAmount] = useState(invoice.amount);

  const paid    = payments.reduce((s, p) => s + p.amount, 0);
  const bal     = Math.max(0, localAmount - paid);
  const status  = paid >= localAmount ? 'paid' : invoice.status;
  const meta    = STATUS_META[paid > 0 && paid < localAmount ? 'partial' : status] || STATUS_META.unpaid;
  const pct     = Math.min(100, localAmount > 0 ? Math.round((paid / localAmount) * 100) : 0);

  const handlePaymentSaved = pay => {
    const next = [...payments, pay];
    setPayments(next);
    onPaymentAdded(invoice.id, next);
    setRecording(false);
  };

  const fakeInv = { ...invoice, payments, amount: localAmount };

  return (
    <div className={clsx('border-b border-slate-50 last:border-0 transition-colors', expanded && 'bg-slate-50/60')}>
      {/* Main row */}
      <div className="px-5 py-4 flex items-center gap-4">
        <button onClick={() => setExpanded(v => !v)} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>

        {/* Status icon */}
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          meta.color === 'green' ? 'bg-emerald-50' : meta.color === 'red' ? 'bg-rose-50' : meta.color === 'blue' ? 'bg-blue-50' : 'bg-amber-50')}>
          <meta.Icon size={15} className={clsx(meta.color === 'green' ? 'text-emerald-600' : meta.color === 'red' ? 'text-rose-500' : meta.color === 'blue' ? 'text-blue-600' : 'text-amber-500')}/>
        </div>

        {/* Vendor + invoice */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-slate-800 truncate">{invoice.vendor}</p>
            <Badge variant="gray" className="flex-shrink-0">{invoice.category}</Badge>
          </div>
          <p className="text-[11px] text-slate-400">{invoice.invoiceNumber} · Issued {invoice.invoiceDate} · Due {invoice.dueDate}</p>
          {invoice.description && <p className="text-[11px] text-slate-500 truncate mt-0.5">{invoice.description}</p>}
        </div>

        {/* Progress bar (if partial) */}
        {paid > 0 && bal > 0 && (
          <div className="w-24 flex-shrink-0">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}/>
            </div>
            <p className="text-[10px] text-slate-400 text-right">{pct}% paid</p>
          </div>
        )}

        {/* Amounts */}
        <div className="text-right flex-shrink-0 min-w-[90px]">
          <p className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</p>
          {bal > 0 && <p className="text-[11px] text-rose-600 font-semibold">Balance: {formatCurrency(bal)}</p>}
          {bal === 0 && paid > 0 && <p className="text-[11px] text-emerald-600 font-semibold">Paid in full</p>}
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0 w-20 text-right">
          <Badge variant={meta.color}>{meta.label}</Badge>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          {bal > 0 && (
            <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); setExpanded(true); setRecording(true); }}>
              + Payment
            </Button>
          )}
          {bal === 0 && <span className="text-xs text-emerald-600 font-semibold">✓ Paid</span>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-14 pb-4 space-y-3">
          {/* Description */}
          {invoice.description && (
            <div className="text-xs text-slate-600 bg-white border border-slate-100 rounded-lg px-3 py-2">
              {invoice.description}
            </div>
          )}

          {/* Invoice doc */}
          {invoice.doc && (
            <a href={invoice.doc.dataUrl} download={invoice.doc.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-navy-50 border border-navy-100 text-navy-700 rounded-lg hover:bg-navy-100 transition-colors">
              <FileText size={11}/>{invoice.doc.name}
            </a>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment History</p>
              <div className="space-y-2">
                {payments.map((pay, i) => (
                  <div key={pay.id} className="flex items-start gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-emerald-700">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(pay.amount)}</span>
                        <MethodBadge method={pay.method}/>
                        {pay.ref && <span className="text-[11px] text-slate-400">{pay.ref}</span>}
                        <span className="text-[11px] text-slate-400">{pay.date}</span>
                      </div>
                      {pay.note && <p className="text-[11px] text-slate-500 mt-0.5">{pay.note}</p>}
                      {pay.receipt && (
                        <a href={pay.receipt.dataUrl} download={pay.receipt.name}
                          className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-600 rounded hover:bg-slate-100 transition-colors">
                          <Paperclip size={9}/>{pay.receipt.name}
                        </a>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {/* running balance */}
                      <p className="text-[10px] text-slate-400">
                        {i === payments.length - 1 ? `Balance: ${formatCurrency(bal)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Summary row */}
              <div className="flex items-center justify-between mt-2 px-3 py-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Total paid ({payments.length} installment{payments.length !== 1 ? 's' : ''})</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(paid)}</span>
              </div>
            </div>
          )}

          {/* Record Payment panel */}
          {recording && (
            <RecordPaymentPanel
              invoice={fakeInv}
              onSave={handlePaymentSaved}
              onClose={() => setRecording(false)}
            />
          )}

          {/* Record payment trigger (when not already recording) */}
          {!recording && bal > 0 && (
            <button onClick={() => setRecording(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-navy-700 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors">
              <Plus size={11}/>Record Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const [extra, setExtra]   = useState(() => lsGet());
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  const raw = [...extra, ...MOCK_INVOICES];
  const invoices = raw.map(inv => ({
    ...inv,
    _status: deriveStatus(inv),
    _paid: paidAmount(inv),
    _bal: balance(inv),
  }));

  // Metrics
  const totalInvoiced   = invoices.reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i._bal, 0);
  const totalOverdue    = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i._bal, 0);
  const paidThisMonth   = invoices.reduce((s, i) => s + i.payments.filter(p => p.date.includes('2026') && (p.date.includes('May') || p.date.includes('Apr'))).reduce((a, p) => a + p.amount, 0), 0);

  const filtered = invoices.filter(inv => {
    const matchTab = filter === 'all' ? true
      : filter === 'open' ? ['unpaid', 'partial', 'overdue'].includes(inv._status)
      : filter === 'overdue' ? inv._status === 'overdue'
      : inv._status === filter;
    const matchSearch = !search || inv.vendor.toLowerCase().includes(search.toLowerCase()) || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleAddInvoice = inv => {
    const next = [inv, ...extra];
    setExtra(next);
    lsSave(next);
  };

  const handlePaymentAdded = (invId, newPayments) => {
    // Update localStorage for user-added invoices
    const idx = extra.findIndex(i => i.id === invId);
    if (idx >= 0) {
      const next = extra.map(i => i.id === invId ? { ...i, payments: newPayments } : i);
      setExtra(next);
      lsSave(next);
    }
  };

  const TABS = [
    { id: 'all',     label: 'All Invoices' },
    { id: 'open',    label: 'Open' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'partial', label: 'Partial' },
    { id: 'paid',    label: 'Paid' },
  ];

  return (
    <div className="page-enter">
      <SectionHeader
        title="Invoices & Payments"
        subtitle="Track all vendor invoices, installment payments, and payment methods"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Download size={12}/>Export</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus size={12}/>Add Invoice</Button>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Invoiced"   value={formatCurrency(totalInvoiced)}   sub={`${invoices.length} invoices`} />
        <MetricCard label="Outstanding"      value={formatCurrency(totalOutstanding)} sub="Across all open invoices" subVariant="warn" />
        <MetricCard label="Overdue"          value={formatCurrency(totalOverdue)}     sub={`${invoices.filter(i => i._status === 'overdue').length} invoice(s)`} subVariant="bad" />
        <MetricCard label="Paid (Apr–May)"   value={formatCurrency(paidThisMonth)}    sub="This period" subVariant="good" />
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex gap-0.5 border-b border-slate-200">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={clsx('px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                filter === t.id ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
              {t.label}
              {t.id !== 'all' && (
                <span className={clsx('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                  filter === t.id ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-500')}>
                  {t.id === 'open'    ? invoices.filter(i => ['unpaid','partial','overdue'].includes(i._status)).length
                   : t.id === 'overdue' ? invoices.filter(i => i._status === 'overdue').length
                   : invoices.filter(i => i._status === t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendor or invoice #…"
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-52 transition-all"/>
      </div>

      {/* Invoice list */}
      <Card padding={false}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-600 flex-1">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"/>Paid</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"/>Partial</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"/>Unpaid</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1"/>Overdue</span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No invoices match your filter.</div>
        ) : filtered.map(inv => (
          <InvoiceRow key={inv.id} invoice={inv} onPaymentAdded={handlePaymentAdded}/>
        ))}
      </Card>

      {showAdd && <AddInvoiceModal onClose={() => setShowAdd(false)} onSave={handleAddInvoice}/>}
    </div>
  );
}
