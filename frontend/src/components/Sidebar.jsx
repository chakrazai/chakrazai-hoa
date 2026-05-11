import ChakrazLogo from './ChakrazLogo';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Shield, CreditCard, BarChart2, Receipt,
  AlertTriangle, Wrench, Users, FolderOpen, MessageSquare,
  ChevronDown, LogOut, Map, Layers, UserCheck, Vote, CalendarDays, ClipboardList, Building2, FileText, Settings,
} from 'lucide-react';
import { useAuthStore } from '../hooks/useStore';

const navGroups = [
  { label: 'Overview', items: [
    { id: 'dashboard',    Icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'compliance',   Icon: Shield,           label: 'Compliance',      badge: 2, badgeColor: 'red' },
  ]},
  { label: 'Finance', items: [
    { id: 'dues',         Icon: CreditCard,       label: 'Dues & Payments', badge: 5, badgeColor: 'amber' },
    { id: 'accounting',   Icon: BarChart2,        label: 'Accounting' },
    { id: 'financials',   Icon: Receipt,          label: 'Invoices & Payments' },
    { id: 'tax',          Icon: FileText,         label: 'Tax Reports' },
  ]},
  { label: 'Operations', items: [
    { id: 'violations',   Icon: AlertTriangle,    label: 'Violations',      badge: 7, badgeColor: 'amber' },
    { id: 'maintenance',  Icon: Wrench,           label: 'Maintenance' },
    { id: 'vendors',      Icon: Users,            label: 'Vendors' },
  ]},
  { label: 'Community', items: [
    { id: 'residents',    Icon: Users,            label: 'Residents' },
    { id: 'amenities',    Icon: Building2,        label: 'Amenities' },
    { id: 'documents',    Icon: FolderOpen,       label: 'Documents' },
    { id: 'communications', Icon: MessageSquare,  label: 'Communications' },
    { id: 'map',          Icon: Map,              label: 'Map' },
  ]},
  { label: 'Property', items: [
    { id: 'building',     Icon: Layers,           label: 'Building Maps' },
  ]},
  { label: 'Governance', items: [
    { id: 'boardmembers', Icon: UserCheck,     label: 'Board Members' },
    { id: 'elections',    Icon: Vote,          label: 'Elections' },
    { id: 'ballots',      Icon: ClipboardList, label: 'Ballot Management' },
    { id: 'meetings',     Icon: CalendarDays,  label: 'Meetings' },
  ]},
];

const badgeColors = {
  red:   'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
};

export default function Sidebar({ currentPage, onNavigate, community }) {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-56 bg-white border-r border-slate-100 flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <ChakrazLogo size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-none">ChakrazAI HOA</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Management Platform</p>
          </div>
        </div>
      </div>

      {/* Community selector */}
      <button onClick={() => onNavigate('communities')}
        className="mx-3 my-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100 transition-all text-left group">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{community?.name || 'Oakwood Estates HOA'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{community?.units || 148} units · {community?.tier || 'Full Service'}</p>
          </div>
          <ChevronDown size={12} className="text-slate-400 flex-shrink-0 ml-1 group-hover:text-slate-600 transition-colors" />
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-3 mt-4 mb-1">{group.label}</p>
            {group.items.map(item => {
              const active = currentPage === item.id;
              return (
                <button key={item.id} onClick={() => onNavigate(item.id)}
                  className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 mb-0.5',
                    active ? 'bg-navy-50 text-navy-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700')}>
                  <item.Icon size={13} className="flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', badgeColors[item.badgeColor])}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Legal links */}
      <div className="px-3 pb-1 flex gap-3">
        <button onClick={() => onNavigate('privacy')}
          className={clsx('flex items-center gap-1 text-[10px] transition-colors', currentPage === 'privacy' ? 'text-navy-600 font-semibold' : 'text-slate-400 hover:text-slate-600')}>
          <Shield size={9} />Privacy
        </button>
        <button onClick={() => onNavigate('terms')}
          className={clsx('flex items-center gap-1 text-[10px] transition-colors', currentPage === 'terms' ? 'text-navy-600 font-semibold' : 'text-slate-400 hover:text-slate-600')}>
          <FileText size={9} />Terms
        </button>
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <button onClick={() => onNavigate('preferences')}
            className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0 hover:bg-navy-600 transition-colors">
            <span className="text-[10px] font-semibold text-white">
              {user ? `${user.firstName?.[0]}${user.lastName?.[0]}` : 'JR'}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <button onClick={() => onNavigate('preferences')}
              className="text-left hover:text-navy-700 transition-colors w-full">
              <p className="text-xs font-medium text-slate-800 truncate">{user?.name || 'Jane Ramirez'}</p>
              <p className="text-[10px] text-slate-400">{user?.role || 'Board President'}</p>
            </button>
          </div>
          <button onClick={() => onNavigate('preferences')} title="Preferences"
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <Settings size={13} />
          </button>
          <button onClick={logout} title="Sign out"
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
