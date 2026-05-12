import { useRef } from 'react';
import { clsx } from 'clsx';
import { CheckCircle, AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';

// ─── Date helpers ─────────────────────────────────────────────────────────────
// "Apr 28, 2026"  →  "2026-04-28"  (for HTML date input value)
export const toInputDate = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
// "2026-04-28"  →  "Apr 28, 2026"  (for storing formatted display string)
export const fromInputDate = (val) => {
  if (!val) return '';
  const d = new Date(val + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── DateField ────────────────────────────────────────────────────────────────
export function DateField({ value, onChange, className, error, min, max, required, label }) {
  const ref = useRef(null);
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type="date"
          value={value || ''}
          onChange={onChange}
          min={min}
          max={max}
          required={required}
          className={clsx(
            'w-full pr-8',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            error ? 'border-rose-300' : '',
            className,
          )}
        />
        <button type="button" tabIndex={-1}
          onClick={() => ref.current?.showPicker?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-700 transition-colors pointer-events-none">
          <Calendar size={13} />
        </button>
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants = {
  green: 'bg-emerald-50 text-emerald-700',
  red:   'bg-rose-50 text-rose-700',
  amber: 'bg-amber-50 text-amber-700',
  blue:  'bg-navy-50 text-navy-700',
  gray:  'bg-slate-100 text-slate-600',
  navy:  'bg-navy-700 text-white',
};

export function Badge({ variant = 'gray', children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full', badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
const alertStyles = {
  warning: { wrap: 'bg-amber-50 border border-amber-200', icon: <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />, title: 'text-amber-900', body: 'text-amber-700' },
  danger:  { wrap: 'bg-rose-50 border border-rose-200',   icon: <AlertCircle   size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />,   title: 'text-rose-900',  body: 'text-rose-700' },
  info:    { wrap: 'bg-navy-50 border border-navy-200',   icon: <Info          size={14} className="text-navy-600 flex-shrink-0 mt-0.5" />,   title: 'text-navy-900',  body: 'text-navy-700' },
  success: { wrap: 'bg-emerald-50 border border-emerald-200', icon: <CheckCircle size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />, title: 'text-emerald-900', body: 'text-emerald-700' },
};

export function Alert({ variant = 'info', title, children, className }) {
  const s = alertStyles[variant];
  return (
    <div className={clsx('flex items-start gap-3 p-3.5 rounded-xl text-sm mb-4', s.wrap, className)}>
      {s.icon}
      <div>
        {title && <p className={clsx('font-semibold leading-snug', s.title)}>{title}</p>}
        {children && <p className={clsx('text-xs mt-0.5 leading-relaxed', s.body)}>{children}</p>}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className, padding = true }) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-card border border-slate-100', padding && 'p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {action}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, subVariant = 'neutral' }) {
  const subColors = { good: 'text-emerald-600', bad: 'text-rose-600', warn: 'text-amber-600', neutral: 'text-slate-400' };
  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-2xl font-display text-slate-900">{value}</p>
      {sub && <p className={clsx('text-xs mt-1.5', subColors[subVariant])}>{sub}</p>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
const buttonVariants = {
  primary:   'bg-navy-600 text-white border-transparent hover:bg-navy-700',
  secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
  ghost:     'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700',
  danger:    'bg-rose-600 text-white border-transparent hover:bg-rose-700',
  success:   'bg-emerald-600 text-white border-transparent hover:bg-emerald-700',
};
const buttonSizes = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-5 py-2.5 text-sm gap-2' };

export function Button({ variant = 'secondary', size = 'md', children, onClick, className, disabled, type = 'button' }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={clsx('inline-flex items-center font-medium rounded-lg border transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed', buttonSizes[size], buttonVariants[variant], className)}>
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, type = 'text', placeholder, value, onChange, className, error, ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className={clsx('w-full px-3 py-2 text-sm bg-white border rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 transition-all', error ? 'border-rose-300' : 'border-slate-200')}
        {...props} />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, children, className }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <select value={value} onChange={onChange}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all">
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, placeholder, value, onChange, rows = 4, className }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all resize-y" />
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ children }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}
export function Th({ children, className }) {
  return <th className={clsx('text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 text-left pr-4', className)}>{children}</th>;
}
export function Td({ children, className }) {
  return <td className={clsx('py-3 border-t border-slate-50 text-slate-700 align-middle pr-4', className)}>{children}</td>;
}
export function Tr({ children, onClick }) {
  return <tr onClick={onClick} className={clsx(onClick && 'cursor-pointer', 'hover:bg-slate-50 transition-colors')}>{children}</tr>;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-5">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={clsx('flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all',
            activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full',
              activeTab === tab.id ? 'bg-navy-100 text-navy-700' : 'bg-slate-200 text-slate-500')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'navy' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = { navy: 'bg-navy-600', emerald: 'bg-emerald-500', amber: 'bg-amber-400', rose: 'bg-rose-500' };
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all duration-700', colors[color])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatusDot({ status }) {
  const colors = { green: 'bg-emerald-500', red: 'bg-rose-500', amber: 'bg-amber-400', gray: 'bg-slate-300' };
  return <span className={clsx('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[status] || colors.gray)} />;
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-display text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-rose-600 mb-3">{message || 'Something went wrong'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try Again</Button>}
    </div>
  );
}

export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const formatPct = (n) => `${Number(n).toFixed(1)}%`;
