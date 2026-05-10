import { useState, useMemo } from 'react';
import {
  Car, Key, CreditCard, MailOpen, Dumbbell, Waves,
  Users, ArrowUpDown, ChevronRight, Search, CheckCircle,
  XCircle, AlertCircle, Clock, Calendar, Plus, Edit2,
} from 'lucide-react';
import { Card, Badge, SectionHeader, Table, Th, Td, Tr, Button } from '../components/ui';
import { clsx } from 'clsx';

// ─── Read residents from localStorage (set by ResidentsPage) ──────────────────
function useResidents() {
  try {
    const rich = JSON.parse(localStorage.getItem('hoa_residents_rich_v1') || '[]');
    if (rich.length > 0) return rich;
    // fallback to minimal cache
    return JSON.parse(localStorage.getItem('hoa_residents_v1') || '[]').map(r => ({
      id: r.id, unit: r.unit,
      ownerName: r.owner_name || r.ownerName || '',
      parkingSpaces: [], guestParkingTags: [], garageFobs: [],
      commonAreaFobs: [], garageFobLog: [], commonAreaFobLog: [],
    }));
  } catch { return []; }
}

// ─── Sample data for non-resident-linked amenities ────────────────────────────
const MAILBOXES = [
  { box: 'MB-001', unit: 'Unit 1',   owner: 'Alex Thompson',   key: 'MK-001', status: 'active', packages: 0 },
  { box: 'MB-002', unit: 'Unit 12',  owner: 'Diana Foster',    key: 'MK-002', status: 'active', packages: 2 },
  { box: 'MB-003', unit: 'Unit 33',  owner: 'Michael Torres',  key: 'MK-003', status: 'active', packages: 0 },
  { box: 'MB-004', unit: 'Unit 42',  owner: 'Sarah Chen',      key: 'MK-004', status: 'active', packages: 1 },
  { box: 'MB-005', unit: 'Unit 44',  owner: 'Carlos Rivera',   key: 'MK-005', status: 'active', packages: 0 },
  { box: 'MB-006', unit: 'Unit 55',  owner: 'Kevin Zhang',     key: 'MK-006', status: 'active', packages: 0 },
  { box: 'MB-007', unit: 'Unit 67',  owner: 'Amanda Liu',      key: 'MK-007', status: 'lost',   packages: 0 },
  { box: 'MB-008', unit: 'Unit 83',  owner: 'Tom Nakamura',    key: 'MK-008', status: 'active', packages: 3 },
  { box: 'MB-009', unit: 'Unit 88',  owner: 'Laura Kim',       key: 'MK-009', status: 'active', packages: 0 },
  { box: 'MB-010', unit: 'Unit 119', owner: 'Maria Garcia',    key: 'MK-010', status: 'active', packages: 1 },
];

const GYM_EQUIPMENT = [
  { id: 1, name: 'Treadmill #1',      brand: 'Life Fitness', model: 'T5', installed: 'Jan 2022', lastService: 'Mar 2026', nextService: 'Sep 2026', status: 'operational' },
  { id: 2, name: 'Treadmill #2',      brand: 'Life Fitness', model: 'T5', installed: 'Jan 2022', lastService: 'Mar 2026', nextService: 'Sep 2026', status: 'operational' },
  { id: 3, name: 'Elliptical #1',     brand: 'Precor',       model: 'EFX 835', installed: 'Mar 2021', lastService: 'Feb 2026', nextService: 'Aug 2026', status: 'operational' },
  { id: 4, name: 'Elliptical #2',     brand: 'Precor',       model: 'EFX 835', installed: 'Mar 2021', lastService: 'Feb 2026', nextService: 'Aug 2026', status: 'maintenance' },
  { id: 5, name: 'Stationary Bike',   brand: 'Peloton',      model: 'Bike+',   installed: 'Jun 2022', lastService: 'Apr 2026', nextService: 'Oct 2026', status: 'operational' },
  { id: 6, name: 'Rowing Machine',    brand: 'Concept2',     model: 'Model D', installed: 'Jun 2022', lastService: 'Apr 2026', nextService: 'Oct 2026', status: 'operational' },
  { id: 7, name: 'Cable Machine',     brand: 'Technogym',    model: 'Dual Adjustable Pulley', installed: 'Jan 2022', lastService: 'Jan 2026', nextService: 'Jul 2026', status: 'operational' },
  { id: 8, name: 'Smith Machine',     brand: 'Body-Solid',   model: 'Series 7', installed: 'Jan 2022', lastService: 'Jan 2026', nextService: 'Jul 2026', status: 'operational' },
  { id: 9, name: 'Free Weights Rack', brand: 'Rogue',        model: 'Monster Lite', installed: 'Jan 2022', lastService: 'May 2026', nextService: 'Nov 2026', status: 'operational' },
  { id: 10, name: 'Leg Press',        brand: 'Cybex',        model: '4615', installed: 'Mar 2021', lastService: 'Mar 2026', nextService: 'Sep 2026', status: 'out_of_order' },
];

const POOL_RULES = [
  'Hours: 6:00 AM – 10:00 PM daily',
  'Maximum occupancy: 30 persons',
  'No diving in shallow end (under 5 ft)',
  'Children under 14 must be supervised by an adult',
  'No glass containers in pool area',
  'Shower before entering pool',
  'No pets in pool area',
  'Pool is closed during lightning/thunder',
];

const POOL_PASSES = [
  { unit: 'Unit 1',   owner: 'Alex Thompson',  passes: 4, status: 'active' },
  { unit: 'Unit 12',  owner: 'Diana Foster',   passes: 2, status: 'active' },
  { unit: 'Unit 33',  owner: 'Michael Torres', passes: 3, status: 'suspended' },
  { unit: 'Unit 42',  owner: 'Sarah Chen',     passes: 4, status: 'active' },
  { unit: 'Unit 44',  owner: 'Carlos Rivera',  passes: 2, status: 'active' },
  { unit: 'Unit 55',  owner: 'Kevin Zhang',    passes: 3, status: 'active' },
  { unit: 'Unit 67',  owner: 'Amanda Liu',     passes: 2, status: 'active' },
  { unit: 'Unit 83',  owner: 'Tom Nakamura',   passes: 5, status: 'active' },
  { unit: 'Unit 88',  owner: 'Laura Kim',      passes: 2, status: 'active' },
  { unit: 'Unit 119', owner: 'Maria Garcia',   passes: 4, status: 'active' },
];

const COMMUNITY_ROOM_RESERVATIONS = [
  { id: 1, unit: 'Unit 42',  owner: 'Sarah Chen',    date: 'May 24, 2026', time: '3:00 PM – 7:00 PM', purpose: 'Birthday Party',   attendees: 25, status: 'confirmed', deposit: 200 },
  { id: 2, unit: 'Unit 1',   owner: 'Alex Thompson', date: 'Jun 1, 2026',  time: '6:00 PM – 9:00 PM', purpose: 'HOA Town Hall',    attendees: 50, status: 'confirmed', deposit: 0   },
  { id: 3, unit: 'Unit 119', owner: 'Maria Garcia',  date: 'Jun 14, 2026', time: '2:00 PM – 6:00 PM', purpose: 'Graduation Party', attendees: 30, status: 'pending',   deposit: 200 },
  { id: 4, unit: 'Unit 83',  owner: 'Tom Nakamura',  date: 'Jun 21, 2026', time: '5:00 PM – 8:00 PM', purpose: 'Book Club',        attendees: 12, status: 'confirmed', deposit: 100 },
  { id: 5, unit: 'Unit 55',  owner: 'Kevin Zhang',   date: 'Jul 4, 2026',  time: '12:00 PM – 6:00 PM', purpose: 'Holiday BBQ',     attendees: 40, status: 'confirmed', deposit: 200 },
];

const ELEVATORS = [
  {
    id: 'EL-01', name: 'Main Lobby Elevator', location: 'Building A – Main Entrance',
    brand: 'Otis', model: 'Gen2', installed: 'Sep 2012', capacity: '2500 lbs / 16 persons',
    status: 'operational', lastInspection: 'Jan 15, 2026', nextInspection: 'Jan 15, 2027',
    lastService: 'Apr 1, 2026', serviceCompany: 'Otis Elevator Co.',
    log: [
      { date: 'Apr 1, 2026',  action: 'Routine Service',  tech: 'Otis Tech #42', notes: 'Lubricated rails, tested emergency phone' },
      { date: 'Jan 15, 2026', action: 'Annual Inspection', tech: 'CA State Inspector', notes: 'Passed — Certificate #2026-0042' },
      { date: 'Nov 3, 2025',  action: 'Emergency Repair', tech: 'Otis Tech #17',  notes: 'Door sensor replaced after entrapment event' },
    ],
  },
  {
    id: 'EL-02', name: 'Parking Garage Elevator', location: 'Building A – Garage Level',
    brand: 'Kone',  model: 'MonoSpace 500', installed: 'Sep 2012', capacity: '2000 lbs / 13 persons',
    status: 'maintenance', lastInspection: 'Jan 20, 2026', nextInspection: 'Jan 20, 2027',
    lastService: 'May 5, 2026', serviceCompany: 'Kone Inc.',
    log: [
      { date: 'May 5, 2026',  action: 'Repair',           tech: 'Kone Tech #8',   notes: 'Control board replacement — estimated 3 days' },
      { date: 'Jan 20, 2026', action: 'Annual Inspection', tech: 'CA State Inspector', notes: 'Passed — Certificate #2026-0071' },
      { date: 'Oct 12, 2025', action: 'Routine Service',  tech: 'Kone Tech #8',   notes: 'Checked cable tension, lubricated pulleys' },
    ],
  },
];

// ─── Amenity menu items ───────────────────────────────────────────────────────
const AMENITIES = [
  { id: 'parking_tags',   Icon: Car,         label: 'Parking Tags',          sub: 'Guest parking' },
  { id: 'parking_fobs',   Icon: Key,         label: 'Parking Fobs',          sub: 'Garage access' },
  { id: 'access_cards',   Icon: CreditCard,  label: 'Access Cards',          sub: 'Common areas' },
  { id: 'mailbox',        Icon: MailOpen,    label: 'Mailbox',               sub: 'Unit mailboxes' },
  { id: 'gym',            Icon: Dumbbell,    label: 'Gym Equipment',         sub: 'Fitness center' },
  { id: 'pool',           Icon: Waves,       label: 'Swimming Pool',         sub: 'Pool access' },
  { id: 'community_room', Icon: Users,       label: 'Community Room',        sub: 'Reservations' },
  { id: 'elevators',      Icon: ArrowUpDown, label: 'Elevators',             sub: 'Status & service' },
];

const statusBadge = (s) => {
  const m = {
    active: 'green', operational: 'green', confirmed: 'green',
    suspended: 'amber', maintenance: 'amber', pending: 'amber', lost: 'amber',
    out_of_order: 'red', inactive: 'gray',
  };
  return m[s] || 'gray';
};
const statusLabel = (s) => ({
  active: 'Active', operational: 'Operational', confirmed: 'Confirmed',
  suspended: 'Suspended', maintenance: 'In Service', pending: 'Pending',
  lost: 'Key Lost', out_of_order: 'Out of Order', inactive: 'Inactive',
}[s] || s);

// ─── Views ────────────────────────────────────────────────────────────────────

function ParkingTagsView({ residents }) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const all = [];
    for (const r of residents) {
      for (const t of (r.guestParkingTags || [])) {
        all.push({ ...t, unit: r.unit, ownerName: r.ownerName || r.owner_name || '' });
      }
    }
    const q = search.toLowerCase();
    return q ? all.filter(t => t.unit?.toLowerCase().includes(q) || t.ownerName?.toLowerCase().includes(q) || t.tagId?.toLowerCase().includes(q) || t.licensePlate?.toLowerCase().includes(q)) : all;
  }, [residents, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Guest Parking Tags</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rows.length} tags issued across all units</p>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-48"/>
        </div>
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Tag ID</Th><Th>Unit</Th><Th>Owner</Th><Th>Vehicle</Th><Th>License</Th><Th>Issued</Th><Th>Expires</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">No parking tags found</td></tr>}
            {rows.map((t, i) => (
              <Tr key={i}>
                <Td><span className="font-mono text-xs font-bold text-slate-800">{t.tagId}</span></Td>
                <Td className="text-xs font-semibold text-slate-700">{t.unit}</Td>
                <Td className="text-xs text-slate-600">{t.ownerName}</Td>
                <Td className="text-xs text-slate-600">{t.vehicle || '—'}</Td>
                <Td><span className="font-mono text-xs text-slate-600">{t.licensePlate || '—'}</span></Td>
                <Td className="text-xs text-slate-500">{t.issuedDate}</Td>
                <Td className="text-xs text-slate-500">{t.expiryDate}</Td>
                <Td><Badge variant={statusBadge(t.status)}>{statusLabel(t.status)}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function ParkingFobsView({ residents }) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const all = [];
    for (const r of residents) {
      for (const f of (r.garageFobs || [])) {
        all.push({ ...f, unit: r.unit, ownerName: r.ownerName || r.owner_name || '',
          vehicles: (r.parkingSpaces || []).map(p => typeof p === 'string' ? p : `${p.space} – ${p.year||''} ${p.make||''} ${p.model||''}`.trim()).join(', ') });
      }
    }
    const q = search.toLowerCase();
    return q ? all.filter(f => f.unit?.toLowerCase().includes(q) || f.ownerName?.toLowerCase().includes(q) || f.fobId?.toLowerCase().includes(q)) : all;
  }, [residents, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Parking Garage Fobs</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rows.length} fobs issued · {rows.filter(f=>f.status==='active').length} active</p>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-48"/>
        </div>
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Fob ID</Th><Th>Unit</Th><Th>Owner</Th><Th>Assigned Vehicles</Th><Th>Issued</Th><Th>Last Used</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">No fobs found</td></tr>}
            {rows.map((f, i) => (
              <Tr key={i}>
                <Td><span className="font-mono text-xs font-bold text-slate-800">{f.fobId}</span></Td>
                <Td className="text-xs font-semibold text-slate-700">{f.unit}</Td>
                <Td className="text-xs text-slate-600">{f.ownerName}</Td>
                <Td className="text-xs text-slate-500 max-w-[200px] truncate">{f.vehicles || '—'}</Td>
                <Td className="text-xs text-slate-500">{f.issuedDate}</Td>
                <Td className="text-xs text-slate-500">{f.lastUsed}</Td>
                <Td><Badge variant={statusBadge(f.status)}>{statusLabel(f.status)}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function AccessCardsView({ residents }) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const all = [];
    for (const r of residents) {
      for (const f of (r.commonAreaFobs || [])) {
        all.push({ ...f, unit: r.unit, ownerName: r.ownerName || r.owner_name || '' });
      }
    }
    const q = search.toLowerCase();
    return q ? all.filter(f => f.unit?.toLowerCase().includes(q) || f.ownerName?.toLowerCase().includes(q) || f.fobId?.toLowerCase().includes(q) || f.areas?.toLowerCase().includes(q)) : all;
  }, [residents, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Common Area Access Cards</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rows.length} cards issued · {rows.filter(f=>f.status==='active').length} active</p>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-48"/>
        </div>
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Card ID</Th><Th>Unit</Th><Th>Owner</Th><Th>Areas</Th><Th>Issued</Th><Th>Last Used</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">No access cards found</td></tr>}
            {rows.map((f, i) => (
              <Tr key={i}>
                <Td><span className="font-mono text-xs font-bold text-slate-800">{f.fobId}</span></Td>
                <Td className="text-xs font-semibold text-slate-700">{f.unit}</Td>
                <Td className="text-xs text-slate-600">{f.ownerName}</Td>
                <Td className="text-xs text-slate-500">{f.areas}</Td>
                <Td className="text-xs text-slate-500">{f.issuedDate}</Td>
                <Td className="text-xs text-slate-500">{f.lastUsed}</Td>
                <Td><Badge variant={statusBadge(f.status)}>{statusLabel(f.status)}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function MailboxView() {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return q ? MAILBOXES.filter(m => m.unit.toLowerCase().includes(q) || m.owner.toLowerCase().includes(q) || m.box.toLowerCase().includes(q)) : MAILBOXES;
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Mailboxes</h2>
          <p className="text-xs text-slate-400 mt-0.5">{MAILBOXES.length} units · {MAILBOXES.reduce((s,m)=>s+m.packages,0)} packages waiting</p>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 w-48"/>
        </div>
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Mailbox</Th><Th>Unit</Th><Th>Owner</Th><Th>Key #</Th><Th>Packages</Th><Th>Key Status</Th></tr></thead>
          <tbody>
            {rows.map((m, i) => (
              <Tr key={i}>
                <Td><span className="font-mono text-xs font-bold text-slate-800">{m.box}</span></Td>
                <Td className="text-xs font-semibold text-slate-700">{m.unit}</Td>
                <Td className="text-xs text-slate-600">{m.owner}</Td>
                <Td><span className="font-mono text-xs text-slate-600">{m.key}</span></Td>
                <Td>
                  {m.packages > 0
                    ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{m.packages} waiting</span>
                    : <span className="text-xs text-slate-400">—</span>}
                </Td>
                <Td><Badge variant={m.status === 'active' ? 'green' : 'amber'}>{m.status === 'active' ? 'Active' : 'Key Lost'}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function GymView() {
  const eqStatus = { operational: { l: 'Operational', c: 'green', Icon: CheckCircle }, maintenance: { l: 'In Service', c: 'amber', Icon: AlertCircle }, out_of_order: { l: 'Out of Order', c: 'red', Icon: XCircle } };
  const operational = GYM_EQUIPMENT.filter(e=>e.status==='operational').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Gym Equipment</h2>
          <p className="text-xs text-slate-400 mt-0.5">{GYM_EQUIPMENT.length} pieces · {operational} operational · Hours: 5:00 AM – 11:00 PM</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(['operational','maintenance','out_of_order']).map(s => {
          const count = GYM_EQUIPMENT.filter(e=>e.status===s).length;
          const { l, c } = eqStatus[s];
          return (
            <Card key={s} className="text-center">
              <p className="text-2xl font-bold text-slate-800">{count}</p>
              <Badge variant={c} className="mt-1">{l}</Badge>
            </Card>
          );
        })}
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Equipment</Th><Th>Brand / Model</Th><Th>Installed</Th><Th>Last Service</Th><Th>Next Service</Th><Th>Status</Th></tr></thead>
          <tbody>
            {GYM_EQUIPMENT.map(e => {
              const s = eqStatus[e.status] || eqStatus.operational;
              return (
                <Tr key={e.id}>
                  <Td className="text-xs font-semibold text-slate-800">{e.name}</Td>
                  <Td className="text-xs text-slate-500">{e.brand} {e.model}</Td>
                  <Td className="text-xs text-slate-500">{e.installed}</Td>
                  <Td className="text-xs text-slate-500">{e.lastService}</Td>
                  <Td className="text-xs text-slate-500">{e.nextService}</Td>
                  <Td><Badge variant={s.c}>{s.l}</Badge></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function PoolView() {
  const active = POOL_PASSES.filter(p=>p.status==='active').length;
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-900">Swimming Pool</h2>
        <p className="text-xs text-slate-400 mt-0.5">Hours: 6:00 AM – 10:00 PM · Max occupancy: 30</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Pool Rules</p>
          <ul className="space-y-1.5">
            {POOL_RULES.map((r,i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-navy-400 mt-1.5 flex-shrink-0"/>
                {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Pool Status</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-600"/><span className="text-xs font-semibold text-green-800">Pool Open</span></div>
              <Badge variant="green">Operational</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between"><span className="text-slate-400">Last cleaned</span><span>May 9, 2026</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Water temp</span><span>82°F</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Chemical check</span><span>May 10, 2026</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Next inspection</span><span>Jun 1, 2026</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Active passes</span><span>{active} of {POOL_PASSES.length} units</span></div>
            </div>
          </div>
        </Card>
      </div>
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-700">Pool Pass Assignments</p>
        </div>
        <Table>
          <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Passes Issued</Th><Th>Status</Th></tr></thead>
          <tbody>
            {POOL_PASSES.map((p,i) => (
              <Tr key={i}>
                <Td className="text-xs font-semibold text-slate-700">{p.unit}</Td>
                <Td className="text-xs text-slate-600">{p.owner}</Td>
                <Td className="text-xs text-slate-600">{p.passes} pass{p.passes !== 1 ? 'es' : ''}</Td>
                <Td><Badge variant={statusBadge(p.status)}>{statusLabel(p.status)}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function CommunityRoomView() {
  const upcoming = COMMUNITY_ROOM_RESERVATIONS.filter(r=>r.status!=='cancelled');
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Community Room</h2>
          <p className="text-xs text-slate-400 mt-0.5">Capacity: 75 · Deposit: $100–$200 · Hours: 8:00 AM – 11:00 PM</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="text-center"><p className="text-2xl font-bold text-slate-800">{upcoming.length}</p><p className="text-xs text-slate-400 mt-1">Upcoming Reservations</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-slate-800">{upcoming.filter(r=>r.status==='confirmed').length}</p><p className="text-xs text-slate-400 mt-1">Confirmed</p></Card>
        <Card className="text-center"><p className="text-2xl font-bold text-slate-800">${upcoming.reduce((s,r)=>s+r.deposit,0)}</p><p className="text-xs text-slate-400 mt-1">Deposits Held</p></Card>
      </div>
      <Card padding={false}>
        <Table>
          <thead><tr><Th>Unit</Th><Th>Owner</Th><Th>Date</Th><Th>Time</Th><Th>Purpose</Th><Th>Attendees</Th><Th>Deposit</Th><Th>Status</Th></tr></thead>
          <tbody>
            {COMMUNITY_ROOM_RESERVATIONS.map(r => (
              <Tr key={r.id}>
                <Td className="text-xs font-semibold text-slate-700">{r.unit}</Td>
                <Td className="text-xs text-slate-600">{r.owner}</Td>
                <Td className="text-xs text-slate-600">{r.date}</Td>
                <Td className="text-xs text-slate-500">{r.time}</Td>
                <Td className="text-xs text-slate-600">{r.purpose}</Td>
                <Td className="text-xs text-slate-600 text-center">{r.attendees}</Td>
                <Td className="text-xs text-slate-600">{r.deposit > 0 ? `$${r.deposit}` : '—'}</Td>
                <Td><Badge variant={statusBadge(r.status)}>{statusLabel(r.status)}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function ElevatorsView() {
  const [selected, setSelected] = useState(ELEVATORS[0]);
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-900">Elevators</h2>
        <p className="text-xs text-slate-400 mt-0.5">{ELEVATORS.length} elevators · {ELEVATORS.filter(e=>e.status==='operational').length} operational</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {ELEVATORS.map(el => (
          <button key={el.id} onClick={() => setSelected(el)}
            className={clsx('text-left p-4 rounded-xl border transition-all', selected?.id === el.id ? 'border-navy-300 bg-navy-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-slate-800">{el.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{el.location}</p>
              </div>
              <Badge variant={statusBadge(el.status)}>{statusLabel(el.status)}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-slate-400">Brand</span><span className="text-slate-600">{el.brand} {el.model}</span>
              <span className="text-slate-400">Capacity</span><span className="text-slate-600">{el.capacity}</span>
              <span className="text-slate-400">Next inspection</span><span className="text-slate-600">{el.nextInspection}</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <Card>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Service Log — {selected.name}</p>
          <div className="space-y-3">
            {selected.log.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-navy-400 mt-1 flex-shrink-0"/>
                  {i < selected.log.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1"/>}
                </div>
                <div className="pb-3 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-slate-800">{entry.action}</p>
                    <span className="text-[10px] text-slate-400">{entry.date}</span>
                  </div>
                  <p className="text-xs text-slate-500">Tech: {entry.tech}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{entry.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AmenitiesPage() {
  const [activeId, setActiveId] = useState('parking_tags');
  const residents = useResidents();

  const renderView = () => {
    switch (activeId) {
      case 'parking_tags':   return <ParkingTagsView residents={residents} />;
      case 'parking_fobs':   return <ParkingFobsView residents={residents} />;
      case 'access_cards':   return <AccessCardsView residents={residents} />;
      case 'mailbox':        return <MailboxView />;
      case 'gym':            return <GymView />;
      case 'pool':           return <PoolView />;
      case 'community_room': return <CommunityRoomView />;
      case 'elevators':      return <ElevatorsView />;
      default:               return null;
    }
  };

  return (
    <div className="page-enter">
      <SectionHeader title="Amenities" subtitle="Property amenities, access control, and resident assignments" />
      <div className="flex gap-5">
        {/* Left amenity list */}
        <div className="w-52 flex-shrink-0">
          <Card padding={false}>
            {AMENITIES.map(({ id, Icon, label, sub }) => (
              <button key={id} onClick={() => setActiveId(id)}
                className={clsx('w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0 transition-colors text-left',
                  activeId === id ? 'bg-navy-50 border-l-[3px] border-l-navy-600' : 'border-l-[3px] border-l-transparent hover:bg-slate-50')}>
                <Icon size={15} className={activeId === id ? 'text-navy-600' : 'text-slate-400'} />
                <div className="min-w-0">
                  <p className={clsx('text-xs font-semibold truncate', activeId === id ? 'text-navy-800' : 'text-slate-700')}>{label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{sub}</p>
                </div>
                {activeId === id && <ChevronRight size={11} className="text-navy-400 flex-shrink-0 ml-auto"/>}
              </button>
            ))}
          </Card>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
