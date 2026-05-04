import { useState, useMemo } from 'react';
import {
  Search, Plus, Phone, Mail, MapPin, X, Car, Key, Activity,
  AlertTriangle, Users, ChevronRight, Home, DollarSign, Shield,
  LogIn, LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  Card, Badge, Button, SectionHeader, Tabs, Table, Th, Td, Tr,
  MetricCard, formatCurrency,
} from '../components/ui';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RESIDENTS = [
  {
    id: 1,
    unit: 'Unit 1', nitNumber: '1-A',
    address: '1 Oakwood Drive, Unit 1-A, Sacramento, CA 95814',
    ownerName: 'Alex Thompson', coOwner: 'Jennifer Thompson',
    phone: '(916) 555-0101', email: 'a.thompson@email.com',
    moveInDate: 'Mar 2018', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current',
    parkingSpaces: ['P-12', 'P-13'],
    violations: [],
    relatives: [
      { id: 1, name: 'Jennifer Thompson', relation: 'Spouse', phone: '(916) 555-0102', email: 'j.thompson@email.com' },
      { id: 2, name: 'Emma Thompson', relation: 'Child', phone: '', email: '' },
    ],
    guestParkingTags: [
      { id: 1, tagId: 'GP-012', issuedDate: 'Jan 15, 2026', expiryDate: 'Jan 15, 2027', licensePlate: 'ABC1234', vehicle: '2022 Toyota Camry', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-001', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'May 1, 2026' },
      { id: 2, fobId: 'GF-002', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 29, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 1, 2026', time: '8:32 AM', action: 'Entry', fobId: 'GF-001', gate: 'Gate A' },
      { id: 2, date: 'May 1, 2026', time: '6:15 PM', action: 'Exit',  fobId: 'GF-001', gate: 'Gate A' },
      { id: 3, date: 'Apr 30, 2026', time: '7:45 AM', action: 'Entry', fobId: 'GF-002', gate: 'Gate A' },
      { id: 4, date: 'Apr 30, 2026', time: '5:58 PM', action: 'Exit',  fobId: 'GF-002', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-001', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Mar 15, 2018', lastUsed: 'Apr 30, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 30, 2026', time: '7:15 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-001' },
      { id: 2, date: 'Apr 29, 2026', time: '3:40 PM', area: 'Pool',           action: 'Entry', fobId: 'CA-001' },
      { id: 3, date: 'Apr 29, 2026', time: '5:20 PM', area: 'Pool',           action: 'Exit',  fobId: 'CA-001' },
    ],
  },
  {
    id: 2,
    unit: 'Unit 12', nitNumber: '12-B',
    address: '12 Oakwood Drive, Unit 12-B, Sacramento, CA 95814',
    ownerName: 'Diana Foster', coOwner: '',
    phone: '(916) 555-0212', email: 'd.foster@email.com',
    moveInDate: 'Jun 2020', balance: 150, portal: 'invited', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late',
    parkingSpaces: ['P-24'],
    violations: [
      { id: 1, type: 'Parking', description: 'Guest spot occupied 7+ days', fine: 50, issuedDate: 'Apr 24, 2026', status: 'hearing_pending' },
    ],
    relatives: [
      { id: 1, name: 'Robert Foster', relation: 'Parent', phone: '(916) 555-0300', email: '' },
    ],
    guestParkingTags: [],
    garageFobs: [
      { id: 1, fobId: 'GF-024', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 28, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'Apr 28, 2026', time: '9:05 AM', action: 'Entry', fobId: 'GF-024', gate: 'Gate A' },
      { id: 2, date: 'Apr 28, 2026', time: '7:30 PM', action: 'Exit',  fobId: 'GF-024', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-024', areas: 'Pool, Gym', status: 'active', issuedDate: 'Jun 10, 2020', lastUsed: 'Apr 20, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 20, 2026', time: '11:00 AM', area: 'Pool', action: 'Entry', fobId: 'CA-024' },
      { id: 2, date: 'Apr 20, 2026', time: '12:45 PM', area: 'Pool', action: 'Exit',  fobId: 'CA-024' },
    ],
  },
  {
    id: 3,
    unit: 'Unit 33', nitNumber: '33-A',
    address: '33 Oakwood Drive, Unit 33-A, Sacramento, CA 95814',
    ownerName: 'Michael Torres', coOwner: 'Rosa Torres',
    phone: '(916) 555-0333', email: 'm.torres@email.com',
    moveInDate: 'Jan 2016', balance: 900, portal: 'none', autoPay: false, status: 'collections',
    hoaAmount: 150, hoaPaymentStatus: 'collections',
    parkingSpaces: ['P-33'],
    violations: [
      { id: 1, type: 'Landscaping', description: 'Unapproved front yard modification', fine: 100, issuedDate: 'Apr 22, 2026', status: 'escalated' },
    ],
    relatives: [],
    guestParkingTags: [
      { id: 1, tagId: 'GP-033', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'XYZ9876', vehicle: '2019 Honda Civic', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-033', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 15, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'Mar 15, 2026', time: '10:22 AM', action: 'Entry', fobId: 'GF-033', gate: 'Gate B' },
      { id: 2, date: 'Mar 15, 2026', time: '6:45 PM', action: 'Exit',  fobId: 'GF-033', gate: 'Gate B' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-033', areas: 'Gym', status: 'suspended', issuedDate: 'Jan 5, 2016', lastUsed: 'Mar 10, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Mar 10, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-033' },
    ],
  },
  {
    id: 4,
    unit: 'Unit 42', nitNumber: '42-C',
    address: '42 Oakwood Drive, Unit 42-C, Sacramento, CA 95814',
    ownerName: 'Sarah Chen', coOwner: 'David Chen',
    phone: '(916) 555-0442', email: 's.chen@email.com',
    moveInDate: 'Sep 2019', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current',
    parkingSpaces: ['P-42', 'P-43'],
    violations: [],
    relatives: [
      { id: 1, name: 'David Chen', relation: 'Spouse', phone: '(916) 555-0443', email: 'd.chen@email.com' },
      { id: 2, name: 'Leo Chen', relation: 'Child', phone: '', email: '' },
      { id: 3, name: 'Mei Chen', relation: 'Child', phone: '', email: '' },
    ],
    guestParkingTags: [
      { id: 1, tagId: 'GP-042', issuedDate: 'Mar 1, 2026', expiryDate: 'Mar 1, 2027', licensePlate: 'DEF5678', vehicle: '2021 Subaru Outback', status: 'active' },
      { id: 2, tagId: 'GP-043', issuedDate: 'Apr 1, 2026', expiryDate: 'Apr 1, 2027', licensePlate: 'GHI9012', vehicle: '2020 Ford Explorer', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-042', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 2, 2026' },
      { id: 2, fobId: 'GF-043', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 1, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '7:55 AM', action: 'Entry', fobId: 'GF-042', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '5:40 PM', action: 'Exit',  fobId: 'GF-042', gate: 'Gate A' },
      { id: 3, date: 'May 1, 2026', time: '8:10 AM', action: 'Entry', fobId: 'GF-043', gate: 'Gate A' },
      { id: 4, date: 'May 1, 2026', time: '6:00 PM', action: 'Exit',  fobId: 'GF-043', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-042', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Sep 20, 2019', lastUsed: 'May 1, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'May 1, 2026', time: '4:30 PM', area: 'Tennis Court', action: 'Entry', fobId: 'CA-042' },
      { id: 2, date: 'Apr 30, 2026', time: '9:00 AM', area: 'Pool',         action: 'Entry', fobId: 'CA-042' },
      { id: 3, date: 'Apr 30, 2026', time: '10:30 AM', area: 'Pool',        action: 'Exit',  fobId: 'CA-042' },
    ],
  },
  {
    id: 5,
    unit: 'Unit 44', nitNumber: '44-A',
    address: '44 Oakwood Drive, Unit 44-A, Sacramento, CA 95814',
    ownerName: 'Carlos Rivera', coOwner: '',
    phone: '(916) 555-0544', email: 'c.rivera@email.com',
    moveInDate: 'Feb 2021', balance: 100, portal: 'active', autoPay: false, status: 'violation',
    hoaAmount: 150, hoaPaymentStatus: 'current',
    parkingSpaces: ['P-44'],
    violations: [
      { id: 1, type: 'Noise', description: 'Repeated late-night disturbance', fine: 100, issuedDate: 'Apr 15, 2026', status: 'hearing_scheduled' },
    ],
    relatives: [
      { id: 1, name: 'Maria Rivera', relation: 'Parent', phone: '(916) 555-0545', email: '' },
    ],
    guestParkingTags: [],
    garageFobs: [
      { id: 1, fobId: 'GF-044', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'May 2, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '11:45 PM', action: 'Entry', fobId: 'GF-044', gate: 'Gate A' },
      { id: 2, date: 'May 1, 2026', time: '11:30 PM', action: 'Entry', fobId: 'GF-044', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-044', areas: 'Pool, Gym', status: 'active', issuedDate: 'Feb 14, 2021', lastUsed: 'Apr 10, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 10, 2026', time: '2:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-044' },
      { id: 2, date: 'Apr 10, 2026', time: '4:00 PM', area: 'Pool', action: 'Exit',  fobId: 'CA-044' },
    ],
  },
  {
    id: 6,
    unit: 'Unit 55', nitNumber: '55-B',
    address: '55 Oakwood Drive, Unit 55-B, Sacramento, CA 95814',
    ownerName: 'Kevin Zhang', coOwner: 'Linda Zhang',
    phone: '(916) 555-0655', email: 'k.zhang@email.com',
    moveInDate: 'Nov 2017', balance: 150, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late',
    parkingSpaces: ['P-55'],
    violations: [],
    relatives: [
      { id: 1, name: 'Linda Zhang', relation: 'Spouse', phone: '(916) 555-0656', email: 'l.zhang@email.com' },
    ],
    guestParkingTags: [
      { id: 1, tagId: 'GP-055', issuedDate: 'Dec 1, 2025', expiryDate: 'Dec 1, 2026', licensePlate: 'JKL3456', vehicle: '2023 Tesla Model 3', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-055', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'May 1, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 1, 2026', time: '8:00 AM', action: 'Entry', fobId: 'GF-055', gate: 'Gate B' },
      { id: 2, date: 'May 1, 2026', time: '7:00 PM', action: 'Exit',  fobId: 'GF-055', gate: 'Gate B' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-055', areas: 'Pool, Gym, Clubhouse', status: 'active', issuedDate: 'Nov 3, 2017', lastUsed: 'Apr 25, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 25, 2026', time: '5:00 PM', area: 'Clubhouse', action: 'Entry', fobId: 'CA-055' },
      { id: 2, date: 'Apr 25, 2026', time: '8:00 PM', area: 'Clubhouse', action: 'Exit',  fobId: 'CA-055' },
    ],
  },
  {
    id: 7,
    unit: 'Unit 67', nitNumber: '67-A',
    address: '67 Oakwood Drive, Unit 67-A, Sacramento, CA 95814',
    ownerName: 'Amanda Liu', coOwner: '',
    phone: '(916) 555-0767', email: 'a.liu@email.com',
    moveInDate: 'Apr 2022', balance: 300, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'delinquent',
    parkingSpaces: ['P-67'],
    violations: [],
    relatives: [],
    guestParkingTags: [],
    garageFobs: [
      { id: 1, fobId: 'GF-067', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 30, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'Apr 30, 2026', time: '9:30 AM', action: 'Entry', fobId: 'GF-067', gate: 'Gate A' },
      { id: 2, date: 'Apr 30, 2026', time: '6:20 PM', action: 'Exit',  fobId: 'GF-067', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-067', areas: 'Gym', status: 'active', issuedDate: 'Apr 5, 2022', lastUsed: 'Apr 15, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 15, 2026', time: '6:30 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-067' },
      { id: 2, date: 'Apr 15, 2026', time: '7:30 AM', area: 'Fitness Center', action: 'Exit',  fobId: 'CA-067' },
    ],
  },
  {
    id: 8,
    unit: 'Unit 83', nitNumber: '83-A',
    address: '83 Oakwood Drive, Unit 83-A, Sacramento, CA 95814',
    ownerName: 'Tom Nakamura', coOwner: 'Yuki Nakamura',
    phone: '(916) 555-0883', email: 't.nakamura@email.com',
    moveInDate: 'Jul 2015', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current',
    parkingSpaces: ['P-83', 'P-84'],
    violations: [],
    relatives: [
      { id: 1, name: 'Yuki Nakamura', relation: 'Spouse', phone: '(916) 555-0884', email: 'y.nakamura@email.com' },
      { id: 2, name: 'Hiro Nakamura', relation: 'Child', phone: '', email: '' },
    ],
    guestParkingTags: [
      { id: 1, tagId: 'GP-083', issuedDate: 'Jan 1, 2026', expiryDate: 'Jan 1, 2027', licensePlate: 'MNO7890', vehicle: '2020 Lexus RX', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-083', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
      { id: 2, fobId: 'GF-084', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 2, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '7:20 AM', action: 'Entry', fobId: 'GF-083', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '5:50 PM', action: 'Exit',  fobId: 'GF-083', gate: 'Gate A' },
      { id: 3, date: 'May 2, 2026', time: '8:00 AM', action: 'Entry', fobId: 'GF-084', gate: 'Gate A' },
      { id: 4, date: 'May 2, 2026', time: '4:30 PM', action: 'Exit',  fobId: 'GF-084', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-083', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'Jul 10, 2015', lastUsed: 'May 1, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'May 1, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-083' },
      { id: 2, date: 'May 1, 2026', time: '8:15 AM', area: 'Fitness Center', action: 'Exit',  fobId: 'CA-083' },
      { id: 3, date: 'Apr 30, 2026', time: '3:00 PM', area: 'Tennis Court',  action: 'Entry', fobId: 'CA-083' },
      { id: 4, date: 'Apr 30, 2026', time: '5:00 PM', area: 'Tennis Court',  action: 'Exit',  fobId: 'CA-083' },
    ],
  },
  {
    id: 9,
    unit: 'Unit 88', nitNumber: '88-B',
    address: '88 Oakwood Drive, Unit 88-B, Sacramento, CA 95814',
    ownerName: 'Laura Kim', coOwner: '',
    phone: '(916) 555-0988', email: 'l.kim@email.com',
    moveInDate: 'Aug 2023', balance: 150, portal: 'active', autoPay: false, status: 'delinquent',
    hoaAmount: 150, hoaPaymentStatus: 'late',
    parkingSpaces: ['P-88'],
    violations: [
      { id: 1, type: 'Parking', description: 'Vehicle in fire lane', fine: 75, issuedDate: 'Apr 26, 2026', status: 'notice_sent' },
    ],
    relatives: [
      { id: 1, name: 'James Kim', relation: 'Sibling', phone: '(916) 555-0989', email: 'j.kim@email.com' },
    ],
    guestParkingTags: [],
    garageFobs: [
      { id: 1, fobId: 'GF-088', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'May 2, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '10:05 AM', action: 'Entry', fobId: 'GF-088', gate: 'Gate B' },
      { id: 2, date: 'May 2, 2026', time: '8:30 PM',  action: 'Exit',  fobId: 'GF-088', gate: 'Gate B' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-088', areas: 'Pool, Gym', status: 'active', issuedDate: 'Aug 15, 2023', lastUsed: 'Apr 22, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'Apr 22, 2026', time: '1:00 PM', area: 'Pool', action: 'Entry', fobId: 'CA-088' },
      { id: 2, date: 'Apr 22, 2026', time: '3:00 PM', area: 'Pool', action: 'Exit',  fobId: 'CA-088' },
    ],
  },
  {
    id: 10,
    unit: 'Unit 119', nitNumber: '119-A',
    address: '119 Oakwood Drive, Unit 119-A, Sacramento, CA 95814',
    ownerName: 'Maria Garcia', coOwner: 'Jose Garcia',
    phone: '(916) 555-1190', email: 'm.garcia@email.com',
    moveInDate: 'May 2014', balance: 0, portal: 'active', autoPay: true, status: 'good',
    hoaAmount: 150, hoaPaymentStatus: 'current',
    parkingSpaces: ['P-119', 'P-120'],
    violations: [],
    relatives: [
      { id: 1, name: 'Jose Garcia', relation: 'Spouse', phone: '(916) 555-1191', email: 'j.garcia@email.com' },
      { id: 2, name: 'Sofia Garcia', relation: 'Child', phone: '(916) 555-1192', email: 's.garcia@email.com' },
    ],
    guestParkingTags: [
      { id: 1, tagId: 'GP-119', issuedDate: 'Feb 1, 2026', expiryDate: 'Feb 1, 2027', licensePlate: 'PQR2345', vehicle: '2022 BMW 3 Series', status: 'active' },
    ],
    garageFobs: [
      { id: 1, fobId: 'GF-119', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' },
      { id: 2, fobId: 'GF-120', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 1, 2026' },
    ],
    garageFobLog: [
      { id: 1, date: 'May 2, 2026', time: '8:45 AM', action: 'Entry', fobId: 'GF-119', gate: 'Gate A' },
      { id: 2, date: 'May 2, 2026', time: '6:10 PM', action: 'Exit',  fobId: 'GF-119', gate: 'Gate A' },
      { id: 3, date: 'May 1, 2026', time: '9:00 AM', action: 'Entry', fobId: 'GF-120', gate: 'Gate A' },
      { id: 4, date: 'May 1, 2026', time: '5:00 PM', action: 'Exit',  fobId: 'GF-120', gate: 'Gate A' },
    ],
    commonAreaFobs: [
      { id: 1, fobId: 'CA-119', areas: 'Pool, Gym, Clubhouse, Tennis', status: 'active', issuedDate: 'May 1, 2014', lastUsed: 'May 2, 2026' },
    ],
    commonAreaFobLog: [
      { id: 1, date: 'May 2, 2026', time: '6:00 AM', area: 'Fitness Center', action: 'Entry', fobId: 'CA-119' },
      { id: 2, date: 'May 2, 2026', time: '7:00 AM', area: 'Fitness Center', action: 'Exit',  fobId: 'CA-119' },
      { id: 3, date: 'May 1, 2026', time: '4:00 PM', area: 'Pool',           action: 'Entry', fobId: 'CA-119' },
      { id: 4, date: 'May 1, 2026', time: '6:00 PM', area: 'Pool',           action: 'Exit',  fobId: 'CA-119' },
    ],
  },
];

// ─── Status maps ──────────────────────────────────────────────────────────────

const rStMap = {
  good:       { l: 'Good Standing', c: 'green' },
  delinquent: { l: 'Delinquent',    c: 'amber' },
  violation:  { l: 'Violation',     c: 'amber' },
  collections:{ l: 'Collections',  c: 'red'   },
};
const payStMap = {
  current:    { l: 'Current',     c: 'green' },
  late:       { l: 'Late',        c: 'amber' },
  delinquent: { l: 'Delinquent',  c: 'red'   },
  collections:{ l: 'Collections', c: 'red'   },
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
  active:  { l: 'Active',         c: 'green' },
  invited: { l: 'Invited',        c: 'blue'  },
  none:    { l: 'Not Activated',  c: 'gray'  },
};

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={clsx('text-sm text-slate-800 mt-0.5', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2">{children}</p>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ r }) {
  return (
    <div>
      <SectionLabel>Contact Information</SectionLabel>
      <InfoRow icon={Phone}  label="Phone"     value={r.phone} />
      <InfoRow icon={Mail}   label="Email"     value={r.email} />
      <InfoRow icon={MapPin} label="Address"   value={r.address} />
      <InfoRow icon={Home}   label="Unit / Nit Number" value={`${r.unit} · ${r.nitNumber}`} />

      <SectionLabel>Ownership</SectionLabel>
      <InfoRow icon={Users} label="Primary Owner" value={r.ownerName} />
      {r.coOwner && <InfoRow icon={Users} label="Co-Owner" value={r.coOwner} />}

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
      <InfoRow icon={Home} label="Move-In Date" value={r.moveInDate} />
    </div>
  );
}

// ─── Tab: Financials ─────────────────────────────────────────────────────────

function FinancialsTab({ r }) {
  const paySt = payStMap[r.hoaPaymentStatus] || { l: 'Unknown', c: 'gray' };
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mt-1 mb-4">
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
      <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
        <span className="text-sm text-slate-600">HOA Payment Status</span>
        <Badge variant={paySt.c}>{paySt.l}</Badge>
      </div>
      <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
        <span className="text-sm text-slate-600">Auto-Pay</span>
        <Badge variant={r.autoPay ? 'green' : 'gray'}>{r.autoPay ? 'Enrolled' : 'Manual'}</Badge>
      </div>
      <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
        <span className="text-sm text-slate-600">Annual HOA Total</span>
        <span className="text-sm font-semibold text-slate-800">{formatCurrency(r.hoaAmount * 12)}</span>
      </div>

      {r.balance > 0 && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-xs font-semibold text-rose-800 mb-1">Outstanding Balance</p>
          <p className="text-xs text-rose-600">
            {formatCurrency(r.balance)} is past due. Automated reminder will be sent in 3 days.
          </p>
          <div className="flex gap-2 mt-3">
            <Button variant="danger" size="sm">Send Notice</Button>
            <Button variant="secondary" size="sm">Payment Plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Parking ─────────────────────────────────────────────────────────────

function ParkingTab({ r }) {
  return (
    <div>
      <SectionLabel>Assigned Parking Spaces</SectionLabel>
      {r.parkingSpaces.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {r.parkingSpaces.map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-2 bg-navy-50 rounded-lg">
              <Car size={12} className="text-navy-600" />
              <span className="text-sm font-semibold text-navy-700">{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No assigned parking spaces</p>
      )}

      <SectionLabel>Guest Parking Tags Issued</SectionLabel>
      {r.guestParkingTags.length > 0 ? (
        <div className="space-y-2">
          {r.guestParkingTags.map(tag => (
            <div key={tag.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 font-mono">{tag.tagId}</span>
                <Badge variant={tag.status === 'active' ? 'green' : 'gray'}>{tag.status}</Badge>
              </div>
              <p className="text-xs text-slate-600">{tag.vehicle} · {tag.licensePlate}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued: {tag.issuedDate} · Expires: {tag.expiryDate}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No guest parking tags issued</p>
      )}

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
              <Badge variant={fob.status === 'active' ? 'green' : 'red'}>{fob.status}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic mb-4">No garage fobs issued</p>
      )}

      <SectionLabel>Garage Fob Entry / Exit Log</SectionLabel>
      {r.garageFobLog.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th><Th>Time</Th><Th>Action</Th><Th>Fob</Th><Th>Gate</Th>
            </tr>
          </thead>
          <tbody>
            {r.garageFobLog.map(log => (
              <Tr key={log.id}>
                <Td className="text-xs text-slate-500">{log.date}</Td>
                <Td className="text-xs text-slate-500">{log.time}</Td>
                <Td>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-semibold',
                    log.action === 'Entry' ? 'text-emerald-600' : 'text-rose-500')}>
                    {log.action === 'Entry' ? <LogIn size={11} /> : <LogOut size={11} />}
                    {log.action}
                  </div>
                </Td>
                <Td className="text-xs font-mono text-slate-500">{log.fobId}</Td>
                <Td className="text-xs text-slate-500">{log.gate}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-slate-400 italic">No log entries</p>
      )}
    </div>
  );
}

// ─── Tab: Access ──────────────────────────────────────────────────────────────

function AccessTab({ r }) {
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
                <Badge variant={fob.status === 'active' ? 'green' : 'red'}>{fob.status}</Badge>
              </div>
              <p className="text-xs text-slate-600">Areas: {fob.areas}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued: {fob.issuedDate} · Last used: {fob.lastUsed}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic mb-4">No common area fobs issued</p>
      )}

      <SectionLabel>Common Area Activity Log</SectionLabel>
      {r.commonAreaFobLog.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th><Th>Time</Th><Th>Area</Th><Th>Action</Th><Th>Fob</Th>
            </tr>
          </thead>
          <tbody>
            {r.commonAreaFobLog.map(log => (
              <Tr key={log.id}>
                <Td className="text-xs text-slate-500">{log.date}</Td>
                <Td className="text-xs text-slate-500">{log.time}</Td>
                <Td className="text-xs font-medium text-slate-700">{log.area}</Td>
                <Td>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-semibold',
                    log.action === 'Entry' ? 'text-emerald-600' : 'text-rose-500')}>
                    {log.action === 'Entry' ? <LogIn size={11} /> : <LogOut size={11} />}
                    {log.action}
                  </div>
                </Td>
                <Td className="text-xs font-mono text-slate-500">{log.fobId}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-slate-400 italic">No activity logged</p>
      )}
    </div>
  );
}

// ─── Tab: Violations ──────────────────────────────────────────────────────────

function ViolationsTab({ r }) {
  if (!r.violations || r.violations.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Shield size={20} className="text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">No violations on record</p>
        <p className="text-xs text-slate-400 mt-1">This resident has a clean violation history</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>Violation History</SectionLabel>
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
                <Badge variant={st.c}>{st.l}</Badge>
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
      <div className="mt-4">
        <Button variant="primary" size="sm"><Plus size={12} />Issue Violation</Button>
      </div>
    </div>
  );
}

// ─── Tab: Household ───────────────────────────────────────────────────────────

function HouseholdTab({ r }) {
  return (
    <div>
      <SectionLabel>Relatives / Household Members</SectionLabel>
      {r.relatives.length > 0 ? (
        <div className="space-y-2 mb-5">
          {r.relatives.map(rel => (
            <div key={rel.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">{rel.name}</span>
                <Badge variant="gray">{rel.relation}</Badge>
              </div>
              {rel.phone && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Phone size={10} /> {rel.phone}
                </div>
              )}
              {rel.email && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Mail size={10} /> {rel.email}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic mb-5">No household members on record</p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm"><Plus size={12} />Add Member</Button>
      </div>
    </div>
  );
}

// ─── Resident Detail Panel ────────────────────────────────────────────────────

function ResidentDetail({ resident, onClose }) {
  const [tab, setTab] = useState('overview');
  const st = rStMap[resident.status] || { l: 'Unknown', c: 'gray' };

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'parking',    label: 'Parking' },
    { id: 'access',     label: 'Access' },
    { id: 'violations', label: 'Violations', count: resident.violations?.length || 0 },
    { id: 'household',  label: 'Household' },
  ];

  const initials = resident.ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-hidden border-l border-slate-100">
      {/* Header */}
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
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-3 flex-shrink-0">
        <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {tab === 'overview'   && <OverviewTab   r={resident} />}
        {tab === 'financials' && <FinancialsTab r={resident} />}
        {tab === 'parking'    && <ParkingTab    r={resident} />}
        {tab === 'access'     && <AccessTab     r={resident} />}
        {tab === 'violations' && <ViolationsTab r={resident} />}
        {tab === 'household'  && <HouseholdTab  r={resident} />}
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

// ─── Full Table View (no resident selected) ───────────────────────────────────

function ResidentTable({ residents, onSelect, search, onSearch }) {
  return (
    <div>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Resident Directory</h3>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search residents..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-52" />
        </div>
      </div>
      <div className="px-5 py-1">
        <Table>
          <thead>
            <tr>
              <Th>Unit</Th>
              <Th>Owner</Th>
              <Th>Co-Owner</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Parking</Th>
              <Th>HOA Status</Th>
              <Th>Balance</Th>
              <Th>Standing</Th>
            </tr>
          </thead>
          <tbody>
            {residents.map(r => {
              const st  = rStMap[r.status]             || { l: 'Unknown', c: 'gray' };
              const pay = payStMap[r.hoaPaymentStatus] || { l: 'Unknown', c: 'gray' };
              return (
                <Tr key={r.id} onClick={() => onSelect(r)}>
                  <Td>
                    <p className="font-bold text-slate-800">{r.unit}</p>
                    <p className="text-[11px] text-slate-400">{r.nitNumber}</p>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{r.ownerName}</p>
                    <p className="text-[11px] text-slate-400">Since {r.moveInDate}</p>
                  </Td>
                  <Td className="text-xs text-slate-500">{r.coOwner || <span className="text-slate-300">—</span>}</Td>
                  <Td>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={10} className="text-slate-300" /> {r.phone}
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-400">{r.email}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.parkingSpaces.map(s => (
                        <span key={s} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </Td>
                  <Td><Badge variant={pay.c}>{pay.l}</Badge></Td>
                  <Td>
                    <span className={clsx('text-sm font-bold', r.balance > 0 ? 'text-rose-600' : 'text-slate-300')}>
                      {r.balance > 0 ? formatCurrency(r.balance) : '—'}
                    </span>
                  </Td>
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

// ─── Main Residents Component ─────────────────────────────────────────────────

export function Residents() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  const residents = MOCK_RESIDENTS;

  const filtered = useMemo(() =>
    residents.filter(r =>
      r.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      r.unit.toLowerCase().includes(search.toLowerCase()) ||
      (r.coOwner || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || '').includes(search) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase())
    ), [search, residents]);

  const goodCount        = residents.filter(r => r.status === 'good').length;
  const delinquentCount  = residents.filter(r => r.status === 'delinquent' || r.status === 'collections').length;
  const violationCount   = residents.filter(r => r.violations?.length > 0).length;
  const autoPayCount     = residents.filter(r => r.autoPay).length;

  return (
    <div className="page-enter">
      <SectionHeader title="Residents" subtitle="Homeowner directory with complete resident profiles"
        action={<Button variant="primary" size="sm"><Plus size={12} />Add Resident</Button>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Residents" value={residents.length} sub="Oakwood Estates" />
        <MetricCard label="Good Standing"   value={goodCount} sub={`${Math.round(goodCount/residents.length*100)}% of residents`} subVariant="good" />
        <MetricCard label="Delinquent"      value={delinquentCount} sub="Past due or collections" subVariant={delinquentCount > 0 ? 'bad' : 'good'} />
        <MetricCard label="Auto-Pay"        value={autoPayCount} sub={`${Math.round(autoPayCount/residents.length*100)}% enrolled`} subVariant="good" />
      </div>

      <Card padding={false} className={clsx('overflow-hidden transition-all', selected && 'flex')}>
        {/* List panel */}
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
              {filtered.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">No residents found</p>
              )}
            </div>
          </div>
        ) : (
          <ResidentTable residents={filtered} onSelect={setSelected} search={search} onSearch={setSearch} />
        )}

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 260px)' }}>
            <ResidentDetail resident={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </Card>
    </div>
  );
}
