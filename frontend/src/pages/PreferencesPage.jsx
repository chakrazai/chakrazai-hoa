/**
 * Profile & Preferences — HOA Manager / Board Member settings
 * Also surfaces community-wide resident preference defaults and a
 * per-resident ballot + statement preference overview.
 */
import { useState, useEffect } from 'react';
import {
  User, Mail, Shield, Bell, Tablet, FileText, MessageSquare,
  Check, ChevronDown, ChevronUp, Edit2, Save, X, Globe, Printer,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../hooks/useStore';
import { residentAPI } from '../lib/api';
import { getCommunityId } from '../lib/community';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const PREFS_KEY = 'hoa_preferences_v1';
const defaultPrefs = {
  // Community-wide defaults for residents who have no individual preference set
  defaultBallotDelivery:   'physical',   // 'physical' | 'electronic'
  defaultStatements:       'email',      // 'email' | 'portal' | 'mail'
  defaultNotifyChannel:    'email',      // 'email' | 'sms' | 'both'
  // Logged-in user notification settings
  notifyViolations:        true,
  notifyDues:              true,
  notifyMaintenance:       true,
  notifyElections:         true,
  notifyMeetings:          true,
  notifyDocuments:         false,
  // UI
  language:                'en',
};

function loadPrefs() {
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return { ...defaultPrefs }; }
}
function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// ─── Shared components ────────────────────────────────────────────────────────
const SL = ({ children }) => (
  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-6 mb-3">{children}</p>
);

const Card = ({ children, className }) => (
  <div className={clsx('bg-white border border-slate-100 rounded-2xl p-5', className)}>{children}</div>
);

function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className={clsx(
          'flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
          value === opt.value ? 'bg-navy-50 border-navy-300' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
        )}>
          <input type="radio" name={name} value={opt.value} checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className={clsx('mt-0.5 flex-shrink-0 w-4 h-4', value === opt.value ? 'accent-navy-600' : '')}/>
          <div>
            <p className={clsx('text-sm font-medium', value === opt.value ? 'text-navy-800' : 'text-slate-700')}>
              {opt.label}
              {opt.default && <span className="text-[10px] text-slate-400 font-normal ml-1.5">(Default)</span>}
            </p>
            {opt.description && <p className="text-[11px] text-slate-500 mt-0.5">{opt.description}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={clsx('relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-navy-600' : 'bg-slate-200')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5')}/>
      </button>
    </label>
  );
}

// ─── Resident preferences overview table ─────────────────────────────────────
function ResidentPrefsTable({ residents, loading }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? residents : residents.slice(0, 8);
  const electronicCount = residents.filter(r => r.electronicVoting).length;
  const statementsCount = residents.filter(r => r.electronicStatements).length;

  if (loading) return <p className="text-xs text-slate-400 italic py-4 text-center">Loading residents…</p>;
  if (!residents.length) return <p className="text-xs text-slate-400 italic py-4 text-center">No residents found</p>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">{residents.length}</p>
          <p className="text-[10px] text-slate-500">Total residents</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{electronicCount}</p>
          <p className="text-[10px] text-slate-500">Electronic ballot</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">{statementsCount}</p>
          <p className="text-[10px] text-slate-500">Paperless statements</p>
        </div>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span className="col-span-1">Unit</span>
          <span className="col-span-4">Resident</span>
          <span className="col-span-4">Ballot Delivery</span>
          <span className="col-span-3">Statements</span>
        </div>
        {display.map(r => (
          <div key={r.id || r.unit} className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-slate-50 last:border-0 items-center text-xs hover:bg-slate-50 transition-colors">
            <span className="col-span-1 font-medium text-slate-500">{r.unit}</span>
            <span className="col-span-4 text-slate-800 truncate">{r.ownerName || r.owner_name || r.name}</span>
            <span className="col-span-4">
              {r.electronicVoting
                ? <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    <Tablet size={8}/>Electronic
                  </span>
                : <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                    <Printer size={8}/>Physical
                  </span>
              }
            </span>
            <span className="col-span-3">
              {r.electronicStatements
                ? <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                    <Mail size={8}/>Electronic
                  </span>
                : <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                    <FileText size={8}/>Mail
                  </span>
              }
            </span>
          </div>
        ))}
      </div>

      {residents.length > 8 && (
        <button onClick={() => setExpanded(v => !v)}
          className="w-full mt-2 text-[11px] text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 py-1.5">
          {expanded ? <><ChevronUp size={11}/>Show less</> : <><ChevronDown size={11}/>Show all {residents.length} residents</>}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PreferencesPage() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [residents, setResidents] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);

  // Load residents to show preference overview
  useEffect(() => {
    (async () => {
      try {
        const commId = await resolveCommunityId();
        const { data } = await residentAPI.list(commId);
        setResidents(data || []);
      } catch {
        // fall back to localStorage seed if API fails
        try {
          const local = JSON.parse(localStorage.getItem('hoa_residents_v1') || '[]');
          setResidents(local);
        } catch { setResidents([]); }
      } finally { setLoadingRes(false); }
    })();
  }, []);

  const update = (key, value) => setPrefs(p => ({ ...p, [key]: value }));

  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const roleLabel = {
    board_president: 'Board President',
    board_member:    'Board Member',
    manager:         'HOA Manager',
    inspector:       'Inspector of Elections',
    auditor:         'Financial Auditor',
    resident:        'Resident',
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Profile &amp; Preferences</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your account settings and community-wide defaults</p>
        </div>
        <button onClick={handleSave}
          className={clsx('inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all',
            saved ? 'bg-emerald-600 text-white' : 'bg-navy-600 text-white hover:bg-navy-700')}>
          {saved ? <><Check size={12}/>Saved</> : <><Save size={12}/>Save Preferences</>}
        </button>
      </div>

      {/* ── Profile ── */}
      <Card className="mb-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-white">
              {user ? `${user.firstName?.[0] || user.first_name?.[0] || 'J'}${user.lastName?.[0] || user.last_name?.[0] || 'R'}` : 'JR'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{user?.name || `${user?.firstName || user?.first_name || 'Jane'} ${user?.lastName || user?.last_name || 'Ramirez'}`}</p>
            <p className="text-xs text-slate-500">{user?.email || 'admin@demo.com'}</p>
            <span className="inline-block mt-1 text-[10px] bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full font-medium">
              {roleLabel[user?.role] || user?.role || 'Board President'}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Ballot Delivery Default ── */}
      <SL>Ballot Delivery — Community Default (Civil Code § 5105)</SL>
      <Card>
        <p className="text-xs text-slate-500 mb-4">
          Set the community-wide default for ballot delivery. Individual residents can override this in their resident profile. Members must affirmatively opt in to receive electronic ballots (AB 2159).
        </p>
        <RadioGroup
          name="defaultBallotDelivery"
          value={prefs.defaultBallotDelivery}
          onChange={v => update('defaultBallotDelivery', v)}
          options={[
            {
              value: 'physical',
              label: 'Physical Ballots',
              default: true,
              description: 'Ballot package mailed to each member\'s unit address. Davis-Stirling double-envelope system (Civil Code § 5115, § 5120).',
            },
            {
              value: 'electronic',
              label: 'Electronic Ballots',
              description: 'Ballot sent to member\'s email on file. Only applies to members who have individually opted in. Members without opt-in still receive physical ballots.',
            },
          ]}
        />
      </Card>

      {/* ── Electronic Statements ── */}
      <SL>Electronic Statements — Community Default</SL>
      <Card>
        <p className="text-xs text-slate-500 mb-4">
          Choose how HOA financial statements, assessment notices, and account summaries are delivered to members by default.
        </p>
        <RadioGroup
          name="defaultStatements"
          value={prefs.defaultStatements}
          onChange={v => update('defaultStatements', v)}
          options={[
            {
              value: 'mail',
              label: 'Physical Mail',
              default: true,
              description: 'Statements printed and mailed to member\'s unit address.',
            },
            {
              value: 'email',
              label: 'Email (Electronic)',
              description: 'Statements delivered to member\'s email on file. Reduces paper and postage costs.',
            },
            {
              value: 'portal',
              label: 'Resident Portal Only',
              description: 'Statements posted to the resident portal. Members log in to view and download.',
            },
          ]}
        />
      </Card>

      {/* ── Communication Channel ── */}
      <SL>Default Communication Channel</SL>
      <Card>
        <p className="text-xs text-slate-500 mb-4">
          Default channel used when sending notices, alerts, and updates to residents.
        </p>
        <RadioGroup
          name="defaultNotifyChannel"
          value={prefs.defaultNotifyChannel}
          onChange={v => update('defaultNotifyChannel', v)}
          options={[
            {
              value: 'email',
              label: 'Email Only',
              default: true,
              description: 'All notices sent via email.',
            },
            {
              value: 'sms',
              label: 'SMS / Text Only',
              description: 'Notices sent via SMS. Requires resident phone number on file.',
            },
            {
              value: 'both',
              label: 'Email + SMS',
              description: 'Notices sent via both email and SMS for maximum reach.',
            },
          ]}
        />
      </Card>

      {/* ── Your Notification Settings ── */}
      <SL>Your Notification Settings</SL>
      <Card>
        <p className="text-xs text-slate-500 mb-4">Choose which events generate notifications for your account.</p>
        <div className="divide-y divide-slate-50">
          <Toggle checked={prefs.notifyViolations}  onChange={v => update('notifyViolations',  v)} label="Violations"       description="New violation reports and status changes"/>
          <Toggle checked={prefs.notifyDues}         onChange={v => update('notifyDues',         v)} label="Dues & Payments"  description="Late payments, new charges, and payment confirmations"/>
          <Toggle checked={prefs.notifyMaintenance}  onChange={v => update('notifyMaintenance',  v)} label="Maintenance"      description="New maintenance requests and status updates"/>
          <Toggle checked={prefs.notifyElections}    onChange={v => update('notifyElections',    v)} label="Elections"        description="Nomination opens, ballot distribution, results certified"/>
          <Toggle checked={prefs.notifyMeetings}     onChange={v => update('notifyMeetings',     v)} label="Meetings"         description="Meeting scheduled, agenda published, minutes posted"/>
          <Toggle checked={prefs.notifyDocuments}    onChange={v => update('notifyDocuments',    v)} label="Documents"        description="New documents uploaded to the community library"/>
        </div>
      </Card>

      {/* ── Language ── */}
      <SL>Language</SL>
      <Card>
        <div className="flex items-center gap-3">
          <Globe size={16} className="text-slate-400 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-1.5">Display Language</p>
            <select value={prefs.language} onChange={e => update('language', e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400">
              <option value="en">English</option>
              <option value="es">Español (Spanish)</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="vi">Tiếng Việt (Vietnamese)</option>
              <option value="tl">Tagalog (Filipino)</option>
              <option value="ko">한국어 (Korean)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── Per-Resident Preference Overview ── */}
      <SL>Resident Preference Overview</SL>
      <Card>
        <p className="text-xs text-slate-500 mb-4">
          Current ballot delivery and statement preferences for each resident. To change an individual resident's preference, open their profile in the <strong>Residents</strong> page.
        </p>
        <ResidentPrefsTable residents={residents} loading={loadingRes}/>
      </Card>

      {/* Save button (bottom) */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleSave}
          className={clsx('inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all',
            saved ? 'bg-emerald-600 text-white' : 'bg-navy-600 text-white hover:bg-navy-700')}>
          {saved ? <><Check size={13}/>Preferences Saved</> : <><Save size={13}/>Save Preferences</>}
        </button>
      </div>
    </div>
  );
}

// helper used in useEffect above — mirrors what ResidentsPage uses
async function resolveCommunityId() {
  try {
    const stored = localStorage.getItem('hoa_community_id');
    if (stored) return JSON.parse(stored);
    const { resolveCommunityId: resolve } = await import('../lib/community.js');
    return await resolve();
  } catch { return 1; }
}
