import { useState, useMemo } from 'react';
import {
  Search, Plus, Phone, Mail, MapPin, X, Car, Key,
  AlertTriangle, Users, ChevronRight, Home, Shield,
  LogIn, LogOut, Edit2, Check, Trash2, Layers, ZoomIn, FileText,
} from 'lucide-react';
import { getResidentFloor } from './BuildingPage';
import { clsx } from 'clsx';
import {
  Card, Badge, Button, SectionHeader, Tabs, Table, Th, Td, Tr,
  MetricCard, formatCurrency,
} from '../components/ui';

// ─── Shared style helpers ─────────────────────────────────────────────────────

const iCls = (err) => clsx(
  'w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all',
  err ? 'border-rose-300' : 'border-slate-200',
);
const selCls = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-400 transition-all';
const fLabel = 'block text-xs font-medium text-slate-500 mb-1';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SEED_RESIDENTS = [
  {
    id: 1, unit: 'Unit 1', nitNumber: '1-A',
    address: '1 Oakwood Drive, Unit 1-A, Sacramento, CA 95814',
    ownerName: 'Alex Thompson', coOwner: 'Jennifer Thompson',
    phone: '(916) 555-0101', email: 'a.thompson@email.com',
    moveInDate: 'Mar 2018', moveOutDate: '', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current', parkingSpaces: ['P-12', 'P-13'],
    violations: [],
    relatives: [
      { id: 1, name: 'Jennifer Thompson', relation: 'Spouse', phone: '(916) 555-0102', email: 'j.thompson@email.com' },
      { id: 2, name: 'Emma Thompson', relation: 'Child', phone: '', email: '' },
    ],
    tenants: [],
    guestParkingTags: [
      { id: 1, tagId: 'GP-012', issuedDate: 'Jan 15, 2026', expiryDate: 'Jan 15, 2027', licensePlate: 'ABC1234', vehicle: '2022 Toyota Camry', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-001', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'May 1, 2026' },
      { id: 2, fobId: 'GF-002', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 29, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 1, 2026', time: '8:32 AM', action: 'Entry', fobId: 'GF-001', gate: 'Gate A' },
      { id: 2, date: 'May 1, 2026', time: '6:15 PM', action: 'Exit', fobId: 'GF-001', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-001', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 30, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 30, 2026', time: '7:15 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-001' },
      { id: 2, date: 'Apr 29, 2026', time: '3:40 PM', area: 'Pool', action: 'Entry', fobId: 'CA-001' },
    ],
  },
  {
    id: 2, unit: 'Unit 12', nitNumber: '12-B',
    address: '12 Oakwood Drive, Unit 12-B, Sacramento, CA 95814',
    ownerName: 'Diana Foster', coOwner: '',
    phone: '(916) 555-0212', email: 'd.foster@email.com',
    moveInDate: 'Jun 2020', moveOutDate: '', balance: 150, portal: 'invited', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late', parkingSpaces: ['P-24'],
    violations: [
      { id: 1, type: 'Parking', description: 'Guest spot occupied 7+ days', fine: 50, issuedDate: 'Apr 24, 2026', status: 'hearing_pending' },
    ],
    relatives: [{ id: 1, name: 'Robert Foster', relation: 'Parent', phone: '(916) 555-0300', email: '' }],
    tenants: [],
    guestParkingTags: [],
    garageFobs: [{ id: 1, fobId: 'GF-024', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 28, 2026' }],
    garageFobLog: [
      { id: 1, date: 'Apr 28, 2026', time: '9:05 AM', action: 'Entry', fobId: 'GF-024', gate: 'Gate A' },
      { id: 2, date: 'Apr 28, 2026', time: '7:30 PM', action: 'Exit', fobId: 'GF-024', gate: 'Gate A' },
    ],
    commonAreaFobs: [{ id: 1, fobId: 'CA-024', areas: 'Pool, Gym', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 20, 2026' }],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 20, 2026', time: '11:00 AM', area: 'Pool', action: 'Entry', fobId: 'CA-024' },
    ],
  },
  {
    id: 3, unit: 'Unit 33', nitNumber: '33-A',
    address: '33 Oakwood Drive, Unit 33-A, Sacramento, CA 95814',
    ownerName: 'Michael Torres', coOwner: 'Rosa Torres',
    phone: '(916) 555-0333', email: 'm.torres@email.com',
    moveInDate: 'Jan 2016', moveOutDate: '', balance: 900, portal: 'none', autoPay: false, status: 'collections',
    hoaAmount: 150, hoaPaymentStatus: 'collections', parkingSpaces: ['P-33'],
    violations: [
      { id: 1, type: 'Landscaping', description: 'Unapproved front yard modification', fine: 100, issuedDate: 'Apr 22, 2026', status: 'escalated' },
    ],
    relatives: [],
    tenants: [],
    guestParkingTags: [{ id: 1, tagId: 'GP-033', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'XYZ9876', vehicle: '2019 Honda Civic', status: 'active' }],
    garageFobs: [{ id: 1, fobId: 'GF-033', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 15, 2026' }],
    garageFobLog: [{ id: 1, date: 'Mar 15, 2026', time: '10:22 AM', action: 'Entry', fobId: 'GF-033', gate: 'Gate B' }],
    commonAreaFobs: [{ id: 1, fobId: 'CA-033', areas: 'Gym', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 10, 2026' }],
    commonAreaFobLog: [{ id: 1, date: 'Mar 10, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-033' }],
  },
  {
    id: 4, unit: 'Unit 42', nitNumber: '42-C',
    address: '42 Oakwood Drive, Unit 42-C, Sacramento, CA 95814',
    ownerName: 'Sarah Chen', coOwner: 'David Chen',
    phone: '(916) 555-0442', email: 's.chen@email.com',
    moveInDate: 'Sep 2019', moveOutDate: '', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current', parkingSpaces: ['P-42', 'P-43'],
    violations: [],
    relatives: [
      { id: 1, name: 'David Chen', relation: 'Spouse', phone: '(916) 555-0443', email: 'd.chen@email.com' },
      { id: 2, name: 'Leo Chen', relation: 'Child', phone: '', email: '' },
    ],
    tenants: [],
    guestParkingTags: [
      { id: 1, tagId: 'GP-042', issuedDate: 'Mar 1, 2026', expiryDate: 'Mar 1, 2027', licensePlate: 'DEF5678', vehicle: '2021 Subaru Outback', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-042', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 2, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '7:55 AM', action: 'Entry', fobId: 'GF-042', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '5:40 PM', action: 'Exit', fobId: 'GF-042', gate: 'Gate A' },
    ],
    commonAreaFobs: [{ id: 1, fobId: 'CA-042', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 1, 2026' }],
    commonAreaFobLog: [
      { id: 1, date: 'May 1, 2026', time: '4:30 PM', area: 'Tennis Court', action: 'Entry', fobId: 'CA-042' },
    ],
  },
  {
    id: 5, unit: 'Unit 44', nitNumber: '44-A',
    address: '44 Oakwood Drive, Unit 44-A, Sacramento, CA 95814',
    ownerName: 'Carlos Rivera', coOwner: '',
    phone: '(916) 555-0544', email: 'c.rivera@email.com',
    moveInDate: 'Feb 2021', moveOutDate: '', balance: 100, portal: 'active', autoPay: false, status: 'violation',
    hoaAmount: 150, hoaPaymentStatus: 'current', parkingSpaces: ['P-44'],
    violations: [{ id: 1, type: 'Noise', description: 'Repeated late-night disturbance', fine: 100, issuedDate: 'Apr 15, 2026', status: 'hearing_scheduled' }],
    relatives: [{ id: 1, name: 'Maria Rivera', relation: 'Parent', phone: '(916) 555-0545', email: '' }],
    tenants: [],
    guestParkingTags: [],
    garageFobs: [{ id: 1, fobId: 'GF-044', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'May 2, 2026' }],
    garageFobLog: [{ id: 1, date: 'May 2, 2026', time: '11:45 PM', action: 'Entry', fobId: 'GF-044', gate: 'Gate A' }],
    commonAreaFobs: [{ id: 1, fobId: 'CA-044', areas: 'Pool, Gym', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'Apr 10, 2026' }],
    commonAreaFobLog: [{ id: 1, date: 'Apr 10, 2026', time: '2:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-044' }],
  },
  {
    id: 6, unit: 'Unit 55', nitNumber: '55-B',
    address: '55 Oakwood Drive, Unit 55-B, Sacramento, CA 95814',
    ownerName: 'Kevin Zhang', coOwner: 'Linda Zhang',
    phone: '(916) 555-0655', email: 'k.zhang@email.com',
    moveInDate: 'Nov 2017', moveOutDate: '', balance: 150, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late', parkingSpaces: ['P-55'],
    violations: [],
    relatives: [{ id: 1, name: 'Linda Zhang', relation: 'Spouse', phone: '(916) 555-0656', email: 'l.zhang@email.com' }],
    tenants: [],
    guestParkingTags: [{ id: 1, tagId: 'GP-055', issuedDate: 'Dec 1, 2025', expiryDate: 'Dec 1, 2026', licensePlate: 'JKL3456', vehicle: '2023 Tesla Model 3', status: 'active' }],
    garageFobs: [{ id: 1, fobId: 'GF-055', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'May 1, 2026' }],
    garageFobLog: [{ id: 1, date: 'May 1, 2026', time: '8:00 AM', action: 'Entry', fobId: 'GF-055', gate: 'Gate B' }],
    commonAreaFobs: [{ id: 1, fobId: 'CA-055', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'Apr 25, 2026' }],
    commonAreaFobLog: [{ id: 1, date: 'Apr 25, 2026', time: '5:00 PM', area: 'Clubhouse', action: 'Entry', fobId: 'CA-055' }],
  },
  {
    id: 7, unit: 'Unit 67', nitNumber: '67-A',
    address: '67 Oakwood Drive, Unit 67-A, Sacramento, CA 95814',
    ownerName: 'Amanda Liu', coOwner: '',
    phone: '(916) 555-0767', email: 'a.liu@email.com',
    moveInDate: 'Apr 2022', moveOutDate: '', balance: 300, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'delinquent', parkingSpaces: ['P-67'],
    violations: [], relatives: [], tenants: [], guestParkingTags: [],
    garageFobs: [{ id: 1, fobId: 'GF-067', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 30, 2026' }],
    garageFobLog: [{ id: 1, date: 'Apr 30, 2026', time: '9:30 AM', action: 'Entry', fobId: 'GF-067', gate: 'Gate A' }],
    commonAreaFobs: [{ id: 1, fobId: 'CA-067', areas: 'Gym', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 15, 2026' }],
    commonAreaFobLog: [{ id: 1, date: 'Apr 15, 2026', time: '6:30 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-067' }],
  },
  {
    id: 8, unit: 'Unit 83', nitNumber: '83-A',
    address: '83 Oakwood Drive, Unit 83-A, Sacramento, CA 95814',
    ownerName: 'Tom Nakamura', coOwner: 'Yuki Nakamura',
    phone: '(916) 555-0883', email: 't.nakamura@email.com',
    moveInDate: 'Jul 2015', moveOutDate: '', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current', parkingSpaces: ['P-83', 'P-84'],
    violations: [],
    relatives: [
      { id: 1, name: 'Yuki Nakamura', relation: 'Spouse', phone: '(916) 555-0884', email: 'y.nakamura@email.com' },
      { id: 2, name: 'Hiro Nakamura', relation: 'Child', phone: '', email: '' },
    ],
    tenants: [],
    guestParkingTags: [{ id: 1, tagId: 'GP-083', issuedDate: 'Jan 1, 2026', expiryDate: 'Jan 1, 2027', licensePlate: 'MNO7890', vehicle: '2020 Lexus RX', status: 'active' }],
    garageFobs: [
      { id: 1, fobId: 'GF-083', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
      { id: 2, fobId: 'GF-084', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '7:20 AM', action: 'Entry', fobId: 'GF-083', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '5:50 PM', action: 'Exit', fobId: 'GF-083', gate: 'Gate A' },
    ],
    commonAreaFobs: [{ id: 1, fobId: 'CA-083', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 1, 2026' }],
    commonAreaFobLog: [
      { id: 1, date: 'May 1, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-083' },
      { id: 2, date: 'May 1, 2026', time: '8:15 AM', area: 'Fitness Center', action: 'Exit', fobId: 'CA-083' },
    ],
  },
  {
    id: 9, unit: 'Unit 88', nitNumber: '88-B',
    address: '88 Oakwood Drive, Unit 88-B, Sacramento, CA 95814',
    ownerName: 'Laura Kim', coOwner: '',
    phone: '(916) 555-0988', email: 'l.kim@email.com',
    moveInDate: 'Aug 2023', moveOutDate: '', balance: 150, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late', parkingSpaces: ['P-88'],
    violations: [{ id: 1, type: 'Parking', description: 'Vehicle in fire lane', fine: 75, issuedDate: 'Apr 26, 2026', status: 'notice_sent' }],
    relatives: [{ id: 1, name: 'James Kim', relation: 'Sibling', phone: '(916) 555-0989', email: 'j.kim@email.com' }],
    tenants: [],
    guestParkingTags: [],
    garageFobs: [{ id: 1, fobId: 'GF-088', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'May 2, 2026' }],
    garageFobLog: [{ id: 1, date: 'May 2, 2026', time: '10:05 AM', action: 'Entry', fobId: 'GF-088', gate: 'Gate B' }],
    commonAreaFobs: [{ id: 1, fobId: 'CA-088', areas: 'Pool, Gym', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'Apr 22, 2026' }],
    commonAreaFobLog: [{ id: 1, date: 'Apr 22, 2026', time: '1:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-088' }],
  },
  {
    id: 10, unit: 'Unit 119', nitNumber: '119-A',
    address: '119 Oakwood Drive, Unit 119-A, Sacramento, CA 95814',
    ownerName: 'Maria Garcia', coOwner: 'Jose Garcia',
    phone: '(916) 555-1190', email: 'm.garcia@email.com',
    moveInDate: 'May 2014', moveOutDate: '', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current', parkingSpaces: ['P-119', 'P-120'],
    violations: [],
    relatives: [
      { id: 1, name: 'Jose Garcia', relation: 'Spouse', phone: '(916) 555-1191', email: 'j.garcia@email.com' },
      { id: 2, name: 'Sofia Garcia', relation: 'Child', phone: '(916) 555-1192', email: 's.garcia@email.com' },
    ],
    tenants: [],
    guestParkingTags: [{ id: 1, tagId: 'GP-119', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'PQR2345', vehicle: '2022 BMW 3 Series', status: 'active' }],
    garageFobs: [
      { id: 1, fobId: 'GF-119', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' },
      { id: 2, fobId: 'GF-120', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 1, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '8:45 AM', action: 'Entry', fobId: 'GF-119', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '6:10 PM', action: 'Exit', fobId: 'GF-119', gate: 'Gate A' },
    ],
    commonAreaFobs: [{ id: 1, fobId: 'CA-119', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' }],
    commonAreaFobLog: [
      { id: 1, date: 'May 2, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-119' },
      { id: 2, date: 'May 2, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Exit', fobId: 'CA-119' },
    ],
  },
];

// ─── Status maps ──────────────────────────────────────────────────────────────

const rStMap = {
  good:        { l: 'Good Standing', c: 'green' },
  delinquent:  { l: 'Delinquent',    c: 'amber' },
  violation:   { l: 'Violation',     c: 'amber' },
  collections: { l: 'Collections',   c: 'red'   },
};
const payStMap = {
  current:     { l: 'Current',     c: 'green' },
  late:        { l: 'Late',        c: 'amber' },
  delinquent:  { l: 'Delinquent',  c: 'red'   },
  collections: { l: 'Collections', c: 'red'   },
};
const vStMap = {
  notice_sent:       { l: 'Notice Sent',       c: 'amber' },
  hearing_pending:   { l: 'Hearing Pending',   c: 'amber' },
  hearing_scheduled: { l: 'Hearing Scheduled', c: 'red'   },
  escalated:         { l: 'Escalated',         c: 'red'   },
  second_notice:     { l: '2nd Notice',        c: 'amber' },
  under_review:      { l: 'Under Review',      c: 'blue'  },
  resolved:          { l: 'Resolved',          c: 'green' },
};
const portalMap = {
  active:  { l: 'Active',        c: 'green' },
  invited: { l: 'Invited',       c: 'blue'  },
  none:    { l: 'Not Activated', c: 'gray'  },
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2">{children}</p>;
}

function TabEditBar({ editing, onEdit, onSave, onCancel }) {
  return editing ? (
    <div className="flex gap-1.5">
      <Button variant="primary" size="sm" onClick={onSave}><Check size={11} />Save</Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </div>
  ) : (
    <Button variant="ghost" size="sm" onClick={onEdit}><Edit2 size={11} />Edit</Button>
  );
}

// ─── Add Resident Modal ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  unit: '', nitNumber: '', address: '', ownerName: '', coOwner: '',
  phone: '', email: '', moveInDate: '', moveOutDate: '', hoaAmount: 150,
  hoaPaymentStatus: 'current', portal: 'none', autoPay: false,
  status: 'good', balance: 0, parkingSpaces: [],
  violations: [], relatives: [], tenants: [], guestParkingTags: [],
  garageFobs: [], garageFobLog: [], commonAreaFobs: [], commonAreaFobLog: [],
};

function AddResidentModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [parkingInput, setParkingInput] = useState('');
  const [errors, setErrors] = useState({});

  const set = (f) => (v) => setForm(prev => ({ ...prev, [f]: v }));

  const addSpace = () => {
    const s = parkingInput.trim().toUpperCase();
    if (s && !form.parkingSpaces.includes(s)) {
      set('parkingSpaces')([...form.parkingSpaces, s]);
      setParkingInput('');
    }
  };

  const handleSave = () => {
    const e = {};
    if (!form.unit.trim())      e.unit      = 'Required';
    if (!form.ownerName.trim()) e.ownerName = 'Required';
    if (!form.phone.trim())     e.phone     = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: Date.now() });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">Add New Resident</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Unit */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Unit</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fLabel}>Unit <span className="text-rose-500">*</span></label>
                <input value={form.unit} onChange={e => set('unit')(e.target.value)} placeholder="e.g. Unit 15" className={iCls(errors.unit)} />
                {errors.unit && <p className="text-xs text-rose-600 mt-0.5">{errors.unit}</p>}
              </div>
              <div>
                <label className={fLabel}>Nit Number</label>
                <input value={form.nitNumber} onChange={e => set('nitNumber')(e.target.value)} placeholder="e.g. 15-A" className={iCls()} />
              </div>
            </div>
            <div className="mt-3">
              <label className={fLabel}>Address</label>
              <input value={form.address} onChange={e => set('address')(e.target.value)} placeholder="Full street address" className={iCls()} />
            </div>
          </div>

          {/* Ownership */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Ownership</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fLabel}>Owner Name <span className="text-rose-500">*</span></label>
                <input value={form.ownerName} onChange={e => set('ownerName')(e.target.value)} placeholder="Full name" className={iCls(errors.ownerName)} />
                {errors.ownerName && <p className="text-xs text-rose-600 mt-0.5">{errors.ownerName}</p>}
              </div>
              <div>
                <label className={fLabel}>Co-Owner</label>
                <input value={form.coOwner} onChange={e => set('coOwner')(e.target.value)} placeholder="Optional" className={iCls()} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fLabel}>Phone <span className="text-rose-500">*</span></label>
                <input value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="(916) 555-0000" className={iCls(errors.phone)} />
                {errors.phone && <p className="text-xs text-rose-600 mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <label className={fLabel}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="email@example.com" className={iCls()} />
              </div>
            </div>
          </div>

          {/* HOA */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">HOA Details</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={fLabel}>Move-in Date</label>
                <input type="date" value={form.moveInDate} onChange={e => set('moveInDate')(e.target.value)} className={iCls()} />
              </div>
              <div>
                <label className={fLabel}>Move-out Date</label>
                <input type="date" value={form.moveOutDate} onChange={e => set('moveOutDate')(e.target.value)} className={iCls()} />
                <p className="text-[11px] text-slate-400 mt-0.5">(leave blank if still residing)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fLabel}>Monthly HOA ($)</label>
                <input type="number" min="0" value={form.hoaAmount} onChange={e => set('hoaAmount')(Number(e.target.value))} className={iCls()} />
              </div>
              <div>
                <label className={fLabel}>Portal Status</label>
                <select value={form.portal} onChange={e => set('portal')(e.target.value)} className={selCls}>
                  <option value="none">Not Activated</option>
                  <option value="invited">Invited</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input type="checkbox" id="autoPay" checked={form.autoPay} onChange={e => set('autoPay')(e.target.checked)} className="w-4 h-4 text-navy-600 rounded border-slate-300" />
              <label htmlFor="autoPay" className="text-sm text-slate-700 cursor-pointer">Enrolled in Auto-Pay</label>
            </div>
          </div>

          {/* Parking */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Parking Spaces</p>
            <div className="flex gap-2 mb-2">
              <input
                value={parkingInput} onChange={e => setParkingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSpace()}
                placeholder="e.g. P-15" className={clsx(iCls(), 'flex-1')}
              />
              <Button variant="secondary" size="sm" onClick={addSpace}><Plus size={12} />Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.parkingSpaces.map(s => (
                <div key={s} className="flex items-center gap-1 px-2 py-1 bg-navy-50 rounded-lg">
                  <Car size={11} className="text-navy-600" />
                  <span className="text-xs font-semibold text-navy-700">{s}</span>
                  <button onClick={() => set('parkingSpaces')(form.parkingSpaces.filter(x => x !== s))} className="text-slate-400 hover:text-rose-500 ml-0.5 transition-colors">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}><Check size={13} />Add Resident</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview (editable) ─────────────────────────────────────────────────

function OverviewTab({ r, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});

  const startEdit = () => {
    setDraft({
      phone: r.phone, email: r.email, address: r.address,
      ownerName: r.ownerName, coOwner: r.coOwner || '',
      moveInDate: r.moveInDate, moveOutDate: r.moveOutDate || '',
      portal: r.portal, autoPay: r.autoPay,
    });
    setEditing(true);
  };
  const save = () => { onUpdate(draft); setEditing(false); };
  const cancel = () => setEditing(false);
  const d = (f) => (v) => setDraft(prev => ({ ...prev, [f]: v }));

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mt-1 mb-4">
        <p className="text-xs font-semibold text-slate-500">Editing contact info</p>
        <TabEditBar editing onSave={save} onCancel={cancel} />
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fLabel}>Owner Name</label><input value={draft.ownerName} onChange={e => d('ownerName')(e.target.value)} className={iCls()} /></div>
          <div><label className={fLabel}>Co-Owner</label><input value={draft.coOwner} onChange={e => d('coOwner')(e.target.value)} placeholder="Optional" className={iCls()} /></div>
        </div>
        <div><label className={fLabel}>Phone</label><input value={draft.phone} onChange={e => d('phone')(e.target.value)} className={iCls()} /></div>
        <div><label className={fLabel}>Email</label><input type="email" value={draft.email} onChange={e => d('email')(e.target.value)} className={iCls()} /></div>
        <div><label className={fLabel}>Address</label><input value={draft.address} onChange={e => d('address')(e.target.value)} className={iCls()} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fLabel}>Portal Status</label>
            <select value={draft.portal} onChange={e => d('portal')(e.target.value)} className={selCls}>
              <option value="none">Not Activated</option>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fLabel}>Move-in Date</label><input type="date" value={draft.moveInDate} onChange={e => d('moveInDate')(e.target.value)} className={iCls()} /></div>
          <div><label className={fLabel}>Move-out Date</label><input type="date" value={draft.moveOutDate} onChange={e => d('moveOutDate')(e.target.value)} className={iCls()} /></div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ep-ap" checked={draft.autoPay} onChange={e => d('autoPay')(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
          <label htmlFor="ep-ap" className="text-sm text-slate-700 cursor-pointer">Auto-Pay enrolled</label>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Contact Information</SectionLabel>
        <TabEditBar editing={false} onEdit={startEdit} />
      </div>
      {[
        { icon: Phone,  label: 'Phone',           value: r.phone },
        { icon: Mail,   label: 'Email',           value: r.email },
        { icon: MapPin, label: 'Address',         value: r.address },
        { icon: Home,   label: 'Unit / Nit No.',  value: `${r.unit} · ${r.nitNumber}` },
      ].map(({ icon: Icon, label, value }) => value ? (
        <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon size={13} className="text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm text-slate-800 mt-0.5">{value}</p>
          </div>
        </div>
      ) : null)}

      <SectionLabel>Ownership</SectionLabel>
      {[
        { label: 'Primary Owner', value: r.ownerName },
        r.coOwner ? { label: 'Co-Owner', value: r.coOwner } : null,
      ].filter(Boolean).map(({ label, value }) => (
        <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users size={13} className="text-slate-400" />
          </div>
          <div><p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p><p className="text-sm text-slate-800 mt-0.5">{value}</p></div>
        </div>
      ))}

      <SectionLabel>Account</SectionLabel>
      <div className="flex items-center gap-3 py-2.5 border-b border-slate-50">
        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield size={13} className="text-slate-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Portal Status</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={portalMap[r.portal]?.c || 'gray'}>{portalMap[r.portal]?.l || r.portal}</Badge>
            {r.autoPay && <Badge variant="green">Auto-Pay On</Badge>}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 py-2.5">
        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Home size={13} className="text-slate-400" />
        </div>
        <div><p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Move-in Date</p><p className="text-sm text-slate-800 mt-0.5">{r.moveInDate}</p></div>
      </div>
    </div>
  );
}

// ─── Tab: Financials (editable) ───────────────────────────────────────────────

function FinancialsTab({ r, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});

  const startEdit = () => {
    setDraft({ hoaAmount: r.hoaAmount, hoaPaymentStatus: r.hoaPaymentStatus, autoPay: r.autoPay, balance: r.balance });
    setEditing(true);
  };
  const save   = () => { onUpdate(draft); setEditing(false); };
  const cancel = () => setEditing(false);
  const d = (f) => (v) => setDraft(prev => ({ ...prev, [f]: v }));

  const paySt = payStMap[r.hoaPaymentStatus] || { l: 'Unknown', c: 'gray' };

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mt-1 mb-4">
        <p className="text-xs font-semibold text-slate-500">Editing financials</p>
        <TabEditBar editing onSave={save} onCancel={cancel} />
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fLabel}>Monthly HOA ($)</label>
            <input type="number" min="0" value={draft.hoaAmount} onChange={e => d('hoaAmount')(Number(e.target.value))} className={iCls()} />
          </div>
          <div>
            <label className={fLabel}>Balance Due ($)</label>
            <input type="number" min="0" value={draft.balance} onChange={e => d('balance')(Number(e.target.value))} className={iCls()} />
          </div>
        </div>
        <div>
          <label className={fLabel}>Payment Status</label>
          <select value={draft.hoaPaymentStatus} onChange={e => d('hoaPaymentStatus')(e.target.value)} className={selCls}>
            <option value="current">Current</option>
            <option value="late">Late</option>
            <option value="delinquent">Delinquent</option>
            <option value="collections">Collections</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="fi-ap" checked={draft.autoPay} onChange={e => d('autoPay')(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
          <label htmlFor="fi-ap" className="text-sm text-slate-700 cursor-pointer">Auto-Pay enrolled</label>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <span />
        <TabEditBar editing={false} onEdit={startEdit} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Monthly HOA</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(r.hoaAmount)}</p>
          <p className="text-xs text-slate-400 mt-0.5">per month</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Balance Due</p>
          <p className={clsx('text-2xl font-bold', r.balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {r.balance > 0 ? formatCurrency(r.balance) : '$0'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{r.balance > 0 ? 'outstanding' : 'up to date'}</p>
        </div>
      </div>
      <SectionLabel>Payment Details</SectionLabel>
      {[
        { label: 'HOA Payment Status', value: <Badge variant={paySt.c}>{paySt.l}</Badge> },
        { label: 'Auto-Pay', value: <Badge variant={r.autoPay ? 'green' : 'gray'}>{r.autoPay ? 'Enrolled' : 'Manual'}</Badge> },
        { label: 'Annual HOA Total', value: <span className="text-sm font-semibold text-slate-800">{formatCurrency(r.hoaAmount * 12)}</span> },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
          <span className="text-sm text-slate-600">{label}</span>{value}
        </div>
      ))}
      {r.balance > 0 && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-xs font-semibold text-rose-800 mb-1">Outstanding Balance</p>
          <p className="text-xs text-rose-600">{formatCurrency(r.balance)} past due. Automated reminder will be sent in 3 days.</p>
          <div className="flex gap-2 mt-3">
            <Button variant="danger" size="sm">Send Notice</Button>
            <Button variant="secondary" size="sm">Payment Plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Parking (interactive) ───────────────────────────────────────────────

function ParkingTab({ r, onUpdate }) {
  const [spaceInput, setSpaceInput]   = useState('');
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagDraft, setTagDraft]       = useState({ tagId: '', vehicle: '', licensePlate: '', issuedDate: '', expiryDate: '' });

  const addSpace = () => {
    const s = spaceInput.trim().toUpperCase();
    if (s && !r.parkingSpaces.includes(s)) {
      onUpdate({ parkingSpaces: [...r.parkingSpaces, s] });
      setSpaceInput('');
    }
  };
  const removeSpace = (s) => onUpdate({ parkingSpaces: r.parkingSpaces.filter(x => x !== s) });

  const addTag = () => {
    if (!tagDraft.tagId.trim()) return;
    onUpdate({ guestParkingTags: [...r.guestParkingTags, { ...tagDraft, id: Date.now(), status: 'active' }] });
    setTagDraft({ tagId: '', vehicle: '', licensePlate: '', issuedDate: '', expiryDate: '' });
    setShowTagForm(false);
  };
  const removeTag = (id) => onUpdate({ guestParkingTags: r.guestParkingTags.filter(t => t.id !== id) });

  const toggleFob = (id) => onUpdate({
    garageFobs: r.garageFobs.map(f => f.id === id ? { ...f, status: f.status === 'active' ? 'suspended' : 'active' } : f),
  });

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Assigned Parking Spaces</SectionLabel>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {r.parkingSpaces.map(s => (
          <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-50 rounded-lg">
            <Car size={11} className="text-navy-600" />
            <span className="text-sm font-semibold text-navy-700">{s}</span>
            <button onClick={() => removeSpace(s)} className="text-slate-400 hover:text-rose-500 ml-0.5 transition-colors"><X size={10} /></button>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <input value={spaceInput} onChange={e => setSpaceInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSpace()}
            placeholder="P-00" className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-20 focus:outline-none focus:ring-2 focus:ring-navy-300" />
          <Button variant="secondary" size="sm" onClick={addSpace}><Plus size={11} /></Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <SectionLabel>Guest Parking Tags</SectionLabel>
        <button onClick={() => setShowTagForm(v => !v)}
          className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 transition-colors mb-[-4px]">
          <Plus size={11} />Issue Tag
        </button>
      </div>
      {showTagForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fLabel}>Tag ID</label><input value={tagDraft.tagId} onChange={e => setTagDraft(d => ({ ...d, tagId: e.target.value }))} placeholder="GP-000" className={iCls()} /></div>
            <div><label className={fLabel}>License Plate</label><input value={tagDraft.licensePlate} onChange={e => setTagDraft(d => ({ ...d, licensePlate: e.target.value }))} className={iCls()} /></div>
          </div>
          <div><label className={fLabel}>Vehicle</label><input value={tagDraft.vehicle} onChange={e => setTagDraft(d => ({ ...d, vehicle: e.target.value }))} placeholder="Year Make Model" className={iCls()} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fLabel}>Issued</label><input value={tagDraft.issuedDate} onChange={e => setTagDraft(d => ({ ...d, issuedDate: e.target.value }))} placeholder="Jan 1, 2026" className={iCls()} /></div>
            <div><label className={fLabel}>Expires</label><input value={tagDraft.expiryDate} onChange={e => setTagDraft(d => ({ ...d, expiryDate: e.target.value }))} placeholder="Jan 1, 2027" className={iCls()} /></div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={addTag}><Check size={11} />Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowTagForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {r.guestParkingTags.length > 0 ? (
        <div className="space-y-2 mb-2">
          {r.guestParkingTags.map(tag => (
            <div key={tag.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 font-mono">{tag.tagId}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant={tag.status === 'active' ? 'green' : 'gray'}>{tag.status}</Badge>
                  <button onClick={() => removeTag(tag.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
              <p className="text-xs text-slate-600">{tag.vehicle} · {tag.licensePlate}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued: {tag.issuedDate} · Expires: {tag.expiryDate}</p>
            </div>
          ))}
        </div>
      ) : !showTagForm && <p className="text-sm text-slate-400 italic mb-2">No guest parking tags issued</p>}

      <SectionLabel>Parking Garage Fobs</SectionLabel>
      {r.garageFobs.length > 0 ? (
        <div className="space-y-2 mb-4">
          {r.garageFobs.map(fob => (
            <div key={fob.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Key size={13} className="text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-800 font-mono">{fob.fobId}</p>
                  <p className="text-[11px] text-slate-400">Issued: {fob.issuedDate} · Last used: {fob.lastUsed}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={fob.status === 'active' ? 'green' : 'red'}>{fob.status}</Badge>
                <button onClick={() => toggleFob(fob.id)}
                  className="text-xs text-navy-600 hover:text-navy-800 font-medium underline transition-colors">
                  {fob.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-slate-400 italic mb-4">No garage fobs issued</p>}

      <SectionLabel>Garage Fob Entry / Exit Log</SectionLabel>
      {r.garageFobLog.length > 0 ? (
        <Table>
          <thead><tr><Th>Date</Th><Th>Time</Th><Th>Action</Th><Th>Fob</Th><Th>Gate</Th></tr></thead>
          <tbody>
            {r.garageFobLog.map(log => (
              <Tr key={log.id}>
                <Td className="text-xs text-slate-500">{log.date}</Td>
                <Td className="text-xs text-slate-500">{log.time}</Td>
                <Td>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-semibold', log.action === 'Entry' ? 'text-emerald-600' : 'text-rose-500')}>
                    {log.action === 'Entry' ? <LogIn size={11} /> : <LogOut size={11} />} {log.action}
                  </div>
                </Td>
                <Td className="text-xs font-mono text-slate-500">{log.fobId}</Td>
                <Td className="text-xs text-slate-500">{log.gate}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : <p className="text-sm text-slate-400 italic">No log entries</p>}
    </div>
  );
}

// ─── Tab: Access (interactive) ────────────────────────────────────────────────

function AccessTab({ r, onUpdate }) {
  const toggleFob = (id) => onUpdate({
    commonAreaFobs: r.commonAreaFobs.map(f => f.id === id ? { ...f, status: f.status === 'active' ? 'suspended' : 'active' } : f),
  });

  return (
    <div>
      <SectionLabel>Common Area Fobs</SectionLabel>
      {r.commonAreaFobs.length > 0 ? (
        <div className="space-y-2 mb-4">
          {r.commonAreaFobs.map(fob => (
            <div key={fob.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Key size={13} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-800 font-mono">{fob.fobId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={fob.status === 'active' ? 'green' : 'red'}>{fob.status}</Badge>
                  <button onClick={() => toggleFob(fob.id)}
                    className="text-xs text-navy-600 hover:text-navy-800 font-medium underline transition-colors">
                    {fob.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600">Areas: {fob.areas}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued: {fob.issuedDate} · Last used: {fob.lastUsed}</p>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-slate-400 italic mb-4">No common area fobs issued</p>}

      <SectionLabel>Common Area Activity Log</SectionLabel>
      {r.commonAreaFobLog.length > 0 ? (
        <Table>
          <thead><tr><Th>Date</Th><Th>Time</Th><Th>Area</Th><Th>Action</Th><Th>Fob</Th></tr></thead>
          <tbody>
            {r.commonAreaFobLog.map(log => (
              <Tr key={log.id}>
                <Td className="text-xs text-slate-500">{log.date}</Td>
                <Td className="text-xs text-slate-500">{log.time}</Td>
                <Td className="text-xs font-medium text-slate-700">{log.area}</Td>
                <Td>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-semibold', log.action === 'Entry' ? 'text-emerald-600' : 'text-rose-500')}>
                    {log.action === 'Entry' ? <LogIn size={11} /> : <LogOut size={11} />} {log.action}
                  </div>
                </Td>
                <Td className="text-xs font-mono text-slate-500">{log.fobId}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : <p className="text-sm text-slate-400 italic">No activity logged</p>}
    </div>
  );
}

// ─── Tab: Violations (interactive) ───────────────────────────────────────────

function ViolationsTab({ r, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ type: 'Parking', description: '', fine: 75, status: 'notice_sent' });

  const issue = () => {
    if (!draft.description.trim()) return;
    onUpdate({
      violations: [...r.violations, { ...draft, id: Date.now(), issuedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }],
      status: 'violation',
    });
    setDraft({ type: 'Parking', description: '', fine: 75, status: 'notice_sent' });
    setShowForm(false);
  };
  const resolve = (id) => onUpdate({ violations: r.violations.map(v => v.id === id ? { ...v, status: 'resolved' } : v) });

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Violation History</SectionLabel>
        <button onClick={() => setShowForm(v => !v)}
          className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 transition-colors mb-[-4px]">
          <Plus size={11} />Issue Violation
        </button>
      </div>

      {showForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={fLabel}>Type</label>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} className={selCls}>
                {['Parking', 'Noise', 'Landscaping', 'Modification', 'Pet', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={fLabel}>Fine ($)</label>
              <input type="number" min="0" max="100" value={draft.fine} onChange={e => setDraft(d => ({ ...d, fine: Number(e.target.value) }))} className={iCls()} />
            </div>
          </div>
          <div>
            <label className={fLabel}>Description</label>
            <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe the violation…" className={iCls()} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={issue}><Check size={11} />Issue</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {r.violations.length === 0 && !showForm ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield size={20} className="text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">No violations on record</p>
          <p className="text-xs text-slate-400 mt-1">This resident has a clean violation history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {r.violations.map(v => {
            const st = vStMap[v.status] || { l: 'Open', c: 'gray' };
            return (
              <div key={v.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{v.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={st.c}>{st.l}</Badge>
                    {v.status !== 'resolved' && (
                      <button onClick={() => resolve(v.id)} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline transition-colors">Resolve</button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-2">{v.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Issued: {v.issuedDate}</span>
                  <span className="text-xs font-bold text-slate-700">Fine: ${v.fine}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Household (interactive) ────────────────────────────────────────────

function HouseholdTab({ r, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', relation: 'Spouse', phone: '', email: '' });

  const add = () => {
    if (!draft.name.trim()) return;
    onUpdate({ relatives: [...r.relatives, { ...draft, id: Date.now() }] });
    setDraft({ name: '', relation: 'Spouse', phone: '', email: '' });
    setShowForm(false);
  };
  const remove = (id) => onUpdate({ relatives: r.relatives.filter(rel => rel.id !== id) });

  return (
    <div>
      <div className="flex items-center justify-between mt-1">
        <SectionLabel>Household Members</SectionLabel>
        <button onClick={() => setShowForm(v => !v)}
          className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 transition-colors mb-[-4px]">
          <Plus size={11} />Add Member
        </button>
      </div>

      {showForm && (
        <div className="p-3 bg-slate-50 rounded-xl mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={fLabel}>Name</label>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Full name" className={iCls()} />
            </div>
            <div>
              <label className={fLabel}>Relation</label>
              <select value={draft.relation} onChange={e => setDraft(d => ({ ...d, relation: e.target.value }))} className={selCls}>
                {['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={fLabel}>Phone</label><input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="Optional" className={iCls()} /></div>
            <div><label className={fLabel}>Email</label><input value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="Optional" className={iCls()} /></div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={add}><Check size={11} />Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {r.relatives.length > 0 ? (
        <div className="space-y-2">
          {r.relatives.map(rel => (
            <div key={rel.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">{rel.name}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="gray">{rel.relation}</Badge>
                  <button onClick={() => remove(rel.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
              {rel.phone && <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><Phone size={10} /> {rel.phone}</div>}
              {rel.email && <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5"><Mail size={10} /> {rel.email}</div>}
            </div>
          ))}
        </div>
      ) : !showForm && <p className="text-sm text-slate-400 italic">No household members on record</p>}
    </div>
  );
}

// ─── Tab: Floor Map ───────────────────────────────────────────────────────────

function FloorMapTab({ r }) {
  const [viewing, setViewing] = useState(false);
  const info = getResidentFloor(r.unit);

  const svgMap = {
    ground:    () => import('./BuildingPage').then(m => m),
    standard:  () => import('./BuildingPage').then(m => m),
  };

  // Inline mini SVG previewer for the resident's floor
  function MiniBlueprint() {
    if (info.svgType === 'ground') {
      return (
        <svg viewBox="0 0 560 370" className="w-full h-full">
          <rect width="560" height="370" fill="#050e1a" />
          <rect x={10} y={10} width={540} height={335} fill="none" stroke="#3b82f6" strokeWidth="2" />
          <rect x={10} y={10} width={200} height={100} fill="#071825" stroke="#7dd3fc" strokeWidth="1.2" />
          <text x={110} y={65} textAnchor="middle" fill="#93c5fd" fontSize="14" fontFamily="monospace" fontWeight="bold">LOBBY</text>
          <rect x={10} y={140} width={255} height={85} fill="#102a47" stroke="#38bdf8" strokeWidth="2" />
          <text x={132} y={186} textAnchor="middle" fill="#7dd3fc" fontSize="13" fontFamily="monospace" fontWeight="bold">UNIT G-1 ★</text>
          <rect x={375} y={140} width={175} height={85} fill="#071825" stroke="#7dd3fc" strokeWidth="1.2" />
          <text x={462} y={186} textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">UNIT G-2</text>
          <rect x={265} y={140} width={55} height={85} fill="#040c16" stroke="#1e40af" strokeWidth="1" />
          <text x={292} y={183} textAnchor="middle" fill="#2563eb" fontSize="9" fontFamily="monospace">ELEV</text>
          <rect x={10} y={225} width={540} height={100} fill="#04090f" stroke="#1e40af" strokeWidth="1" />
          <text x={280} y={280} textAnchor="middle" fill="#3b82f6" fontSize="13" fontFamily="monospace">PARKING GARAGE</text>
          <rect x={10} y={345} width={540} height={16} fill="#071120" stroke="#1e3a5c" strokeWidth="0.5" />
          <text x={280} y={356} textAnchor="middle" fill="#3d6a8a" fontSize="7" fontFamily="monospace">OAKWOOD ESTATES HOA · GROUND FLOOR · DWG-A1.0 · REV D</text>
        </svg>
      );
    }
    const f = info.floorNum;
    return (
      <svg viewBox="0 0 560 370" className="w-full h-full">
        <rect width="560" height="370" fill="#050e1a" />
        <rect x={10} y={10} width={540} height={335} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <rect x={10} y={10} width={230} height={155} fill="#102a47" stroke="#38bdf8" strokeWidth="2" />
        <text x={125} y={90} textAnchor="middle" fill="#7dd3fc" fontSize="13" fontFamily="monospace" fontWeight="bold">UNIT {f}A ★</text>
        <rect x={320} y={10} width={230} height={155} fill="#071825" stroke="#7dd3fc" strokeWidth="1.2" />
        <text x={435} y={90} textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">UNIT {f}B</text>
        <rect x={240} y={10} width={80} height={335} fill="#040c16" stroke="#1e40af" strokeWidth="1.2" />
        <text x={280} y={185} textAnchor="middle" fill="#2563eb" fontSize="9" fontFamily="monospace">CORE</text>
        <rect x={10} y={190} width={230} height={155} fill="#071825" stroke="#7dd3fc" strokeWidth="1.2" />
        <text x={125} y={270} textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">UNIT {f}C</text>
        <rect x={320} y={190} width={230} height={155} fill="#071825" stroke="#7dd3fc" strokeWidth="1.2" />
        <text x={435} y={270} textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">UNIT {f}D</text>
        <rect x={10} y={345} width={540} height={16} fill="#071120" stroke="#1e3a5c" strokeWidth="0.5" />
        <text x={280} y={356} textAnchor="middle" fill="#3d6a8a" fontSize="7" fontFamily="monospace">OAKWOOD ESTATES HOA · FLOOR {f} PLAN · {info.dwg} · {info.revision}</text>
      </svg>
    );
  }

  return (
    <div>
      {/* Full-screen viewer overlay */}
      {viewing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-slate-700" style={{ maxHeight: '90vh' }}>
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Layers size={15} className="text-blue-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">{info.floor} — {r.unit}</h2>
                  <p className="text-xs text-slate-400">{info.dwg} · {info.revision}</p>
                </div>
              </div>
              <button onClick={() => setViewing(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-950">
              <MiniBlueprint />
            </div>
          </div>
        </div>
      )}

      <SectionLabel>Unit Location</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Floor</p>
          <p className="text-lg font-bold text-slate-900">{info.floor}</p>
          <p className="text-xs text-slate-400 mt-0.5">Building A</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Unit on Floor</p>
          <p className="text-lg font-bold text-slate-900">{info.unit}</p>
          <p className="text-xs text-slate-400 mt-0.5">{r.nitNumber}</p>
        </div>
      </div>

      <SectionLabel>Floor Blueprint</SectionLabel>
      <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-4 cursor-pointer group" onClick={() => setViewing(true)}>
        <div className="h-52 bg-slate-950">
          <MiniBlueprint />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex items-center gap-2">
            <ZoomIn size={14} className="text-white" />
            <span className="text-white text-xs font-medium">View Full Blueprint</span>
          </div>
        </div>
      </div>

      <SectionLabel>Drawing Details</SectionLabel>
      {[
        { label: 'Drawing Number', value: info.dwg },
        { label: 'Revision',       value: info.revision },
        { label: 'Floor Level',    value: info.floorNum === 0 ? 'Ground (G)' : `Level ${info.floorNum}` },
        { label: 'Blueprint Type', value: 'Architectural Floor Plan' },
        { label: 'Scale',          value: '1:100' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
          <span className="text-sm text-slate-500">{label}</span>
          <span className="text-sm font-medium text-slate-800 font-mono">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Resident Detail Panel ────────────────────────────────────────────────────

function ResidentDetail({ resident, onUpdate, onClose }) {
  const [tab, setTab] = useState('overview');
  const st = rStMap[resident.status] || { l: 'Unknown', c: 'gray' };
  const initials = resident.ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'parking',    label: 'Parking' },
    { id: 'access',     label: 'Access' },
    { id: 'violations', label: 'Violations', count: resident.violations?.length || 0 },
    { id: 'household',  label: 'Household' },
    { id: 'floormap',   label: 'Floor Map' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-bold text-slate-900">{resident.ownerName}</h2>
                <Badge variant={st.c}>{st.l}</Badge>
              </div>
              <p className="text-xs text-slate-400">{resident.unit} · {resident.nitNumber} · Since {resident.moveInDate}</p>
              {resident.coOwner && <p className="text-xs text-slate-400">Co-owner: {resident.coOwner}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-3 flex-shrink-0">
        <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview'   && <OverviewTab   r={resident} onUpdate={onUpdate} />}
        {tab === 'financials' && <FinancialsTab r={resident} onUpdate={onUpdate} />}
        {tab === 'parking'    && <ParkingTab    r={resident} onUpdate={onUpdate} />}
        {tab === 'access'     && <AccessTab     r={resident} onUpdate={onUpdate} />}
        {tab === 'violations' && <ViolationsTab r={resident} onUpdate={onUpdate} />}
        {tab === 'household'  && <HouseholdTab  r={resident} onUpdate={onUpdate} />}
        {tab === 'floormap'   && <FloorMapTab   r={resident} />}
      </div>
    </div>
  );
}

// ─── Resident List Item ───────────────────────────────────────────────────────

function ResidentListItem({ r, isSelected, onSelect }) {
  const st = rStMap[r.status] || { l: 'Unknown', c: 'gray' };
  return (
    <button onClick={() => onSelect(r)}
      className={clsx(
        'w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors',
        isSelected ? 'bg-navy-50 border-l-[3px] border-l-navy-600' : 'border-l-[3px] border-l-transparent',
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-slate-800">{r.unit}</span>
            <Badge variant={st.c} className="text-[10px] py-0">{st.l}</Badge>
          </div>
          <p className="text-xs font-medium text-slate-700 truncate">{r.ownerName}</p>
          {r.coOwner && <p className="text-[11px] text-slate-400 truncate">+ {r.coOwner}</p>}
          <div className="flex items-center gap-1 mt-1">
            <Phone size={9} className="text-slate-300" />
            <span className="text-[11px] text-slate-400">{r.phone}</span>
          </div>
        </div>
        <ChevronRight size={12} className={clsx('flex-shrink-0 mt-1', isSelected ? 'text-navy-500' : 'text-slate-300')} />
      </div>
    </button>
  );
}

// ─── Full Table View ──────────────────────────────────────────────────────────

function ResidentTable({ residents, onSelect, search, onSearch, statusFilter, onStatusFilter }) {
  const filters = [
    { id: 'all',         label: 'All' },
    { id: 'good',        label: 'Good Standing' },
    { id: 'delinquent',  label: 'Delinquent' },
    { id: 'violation',   label: 'Violations' },
    { id: 'collections', label: 'Collections' },
  ];

  return (
    <div>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1">
          {filters.map(f => (
            <button key={f.id} onClick={() => onStatusFilter(f.id)}
              className={clsx(
                'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.id ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search residents..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-52" />
        </div>
      </div>
      <div className="px-5 py-1">
        <Table>
          <thead>
            <tr>
              <Th>Unit</Th><Th>Owner</Th><Th>Co-Owner</Th><Th>Phone</Th>
              <Th>Email</Th><Th>Parking</Th><Th>HOA Status</Th><Th>Balance</Th><Th>Standing</Th>
            </tr>
          </thead>
          <tbody>
            {residents.map(r => {
              const st  = rStMap[r.status]             || { l: 'Unknown', c: 'gray' };
              const pay = payStMap[r.hoaPaymentStatus] || { l: 'Unknown', c: 'gray' };
              return (
                <Tr key={r.id} onClick={() => onSelect(r)}>
                  <Td><p className="font-bold text-slate-800">{r.unit}</p><p className="text-[11px] text-slate-400">{r.nitNumber}</p></Td>
                  <Td><p className="font-medium text-slate-800">{r.ownerName}</p><p className="text-[11px] text-slate-400">Since {r.moveInDate}</p></Td>
                  <Td className="text-xs text-slate-500">{r.coOwner || <span className="text-slate-300">—</span>}</Td>
                  <Td><div className="flex items-center gap-1 text-xs text-slate-500"><Phone size={10} className="text-slate-300" />{r.phone}</div></Td>
                  <Td className="text-xs text-slate-400">{r.email}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.parkingSpaces.map(s => (
                        <span key={s} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </Td>
                  <Td><Badge variant={pay.c}>{pay.l}</Badge></Td>
                  <Td><span className={clsx('text-sm font-bold', r.balance > 0 ? 'text-rose-600' : 'text-slate-300')}>{r.balance > 0 ? formatCurrency(r.balance) : '—'}</span></Td>
                  <Td><Badge variant={st.c}>{st.l}</Badge></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Residents() {
  const [residents, setResidents]     = useState(SEED_RESIDENTS);
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const updateResident = (id, patch) => {
    setResidents(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  };

  const addResident = (data) => {
    setResidents(prev => [...prev, data]);
    setShowAddModal(false);
    setSelected(data);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return residents.filter(r => {
      const matchesSearch =
        r.ownerName.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        (r.coOwner || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.email || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'violation' ? r.violations?.length > 0 :
        r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, residents]);

  const goodCount       = residents.filter(r => r.status === 'good').length;
  const delinquentCount = residents.filter(r => r.status === 'delinquent' || r.status === 'collections').length;
  const violationCount  = residents.filter(r => r.violations?.length > 0).length;
  const autoPayCount    = residents.filter(r => r.autoPay).length;

  return (
    <div className="page-enter">
      {showAddModal && <AddResidentModal onSave={addResident} onClose={() => setShowAddModal(false)} />}

      <SectionHeader title="Residents" subtitle="Homeowner directory with complete resident profiles"
        action={<Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}><Plus size={12} />Add Resident</Button>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Residents" value={residents.length} sub="Oakwood Estates" />
        <MetricCard label="Good Standing"   value={goodCount}       sub={`${Math.round(goodCount / residents.length * 100)}% of residents`} subVariant="good" />
        <MetricCard label="Delinquent"      value={delinquentCount} sub="Past due or collections" subVariant={delinquentCount > 0 ? 'bad' : 'good'} />
        <MetricCard label="Auto-Pay"        value={autoPayCount}    sub={`${Math.round(autoPayCount / residents.length * 100)}% enrolled`} subVariant="good" />
      </div>

      <Card padding={false} className={clsx('overflow-hidden', selected && 'flex')}>
        {selected ? (
          <div className="w-72 flex-shrink-0 flex flex-col" style={{ height: 'calc(100vh - 260px)' }}>
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(r => (
                <ResidentListItem key={r.id} r={r} isSelected={selected?.id === r.id} onSelect={setSelected} />
              ))}
              {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No residents found</p>}
            </div>
          </div>
        ) : (
          <ResidentTable
            residents={filtered} onSelect={setSelected}
            search={search} onSearch={setSearch}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
          />
        )}

        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 260px)' }}>
            <ResidentDetail
              resident={selected}
              onUpdate={(patch) => updateResident(selected.id, patch)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
