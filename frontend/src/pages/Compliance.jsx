import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertCircle, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardHeader, Badge, Alert, Button, Tabs, SectionHeader, StatusDot, ProgressBar } from '../components/ui';
import { complianceAPI } from '../lib/api';

const MOCK_ALERTS = [
  { id:'ab130',  state:'ca', law:'AB 130',    title:'Fine Schedule Caps',        status:'action_required', effectiveDate:'2025',        daysRemaining:null, detail:'Your fine schedule has 3 violations exceeding the new $100/violation cap. Update required before enforcement resumes.' },
  { id:'sb326',  state:'ca', law:'SB 326',    title:'Balcony & Deck Inspections', status:'warning',         effectiveDate:'Jan 1, 2026', daysRemaining:187,  detail:'Professional inspection of all exterior elevated elements required. Not yet scheduled.' },
  { id:'ab2159', state:'ca', law:'AB 2159',   title:'Electronic Voting',          status:'compliant',       effectiveDate:'2025',        daysRemaining:null, detail:'Electronic voting system configured. Paper backup available. 90-day update notice sent.' },
  { id:'solar',  state:'ca', law:'Solar',     title:'Solar Panel Policy',         status:'compliant',       effectiveDate:'Mar 2025',    daysRemaining:null, detail:'Policy adopted March 2025. Posted to resident portal.' },
  { id:'sb900',  state:'ca', law:'SB 900',    title:'Utility Repairs (14-Day)',   status:'compliant',       effectiveDate:'2025',        daysRemaining:null, detail:'Work order system updated with 14-day SLA tracking.' },
  { id:'fl-p',   state:'fl', law:'FL HB 1203',title:'Owner Portal Requirement',   status:'compliant',       effectiveDate:'Jan 2026',    daysRemaining:null, detail:'Resident portal active. 80% adoption rate.' },
  { id:'fl-f',   state:'fl', law:'FL Fine Cap',title:'Fine Cap Enforcement',      status:'warning',         effectiveDate:'2025',        daysRemaining:null, detail:'Review recommended — verify all fines comply with Florida caps.' },
  { id:'tx-d',   state:'tx', law:'TX SB 1588',title:'Governing Docs Online',      status:'compliant',       effectiveDate:'Sep 2025',    daysRemaining:null, detail:'Documents published to resident portal.' },
];

const MOCK_CALENDAR = [
  { month:'Jan',    action:'Review & update fine schedules for all states', status:'done' },
  { month:'Mar–Apr',action:'Audit document posting and portal requirements', status:'in_progress' },
  { month:'Jul',    action:'Check for new state legislation',               status:'upcoming' },
  { month:'Sep',    action:'Verify election and voting workflow compliance', status:'upcoming' },
  { month:'Dec',    action:'Annual full compliance audit',                  status:'upcoming' },
];

const tabs = [
  { id:'ca', label:'California', count:5 },
  { id:'fl', label:'Florida',    count:2 },
  { id:'tx', label:'Texas',      count:1 },
  { id:'calendar', label:'Calendar' },
];

export default function Compliance() {
  const [activeTab, setActiveTab] = useState('ca');

  const { data: alerts } = useQuery({
    queryKey: ['compliance', activeTab],
    queryFn: () => complianceAPI.alerts(activeTab).then(r => r.data),
    placeholderData: MOCK_ALERTS.filter(a => a.state === activeTab),
  });

  const { data: calendar } = useQuery({
    queryKey: ['compliance-calendar'],
    queryFn: () => complianceAPI.calendar().then(r => r.data),
    placeholderData: MOCK_CALENDAR,
  });

  const allAlerts = alerts || MOCK_ALERTS.filter(a => a.state === activeTab);
  const stateAlerts = activeTab !== 'calendar' ? allAlerts : [];
  const actionCount   = MOCK_ALERTS.filter(a => a.status === 'action_required').length;
  const warningCount  = MOCK_ALERTS.filter(a => a.status === 'warning').length;
  const compliantCount= MOCK_ALERTS.filter(a => a.status === 'compliant').length;

  return (
    <div className="page-enter">
      <SectionHeader title="Legal Compliance" subtitle="Real-time state law monitoring — attorney-powered alerts" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border p-4 flex items-center gap-3 bg-rose-50 border-rose-100">
          <AlertCircle size={20} className="text-rose-600" />
          <div><p className="text-2xl font-display font-bold text-rose-700">{actionCount}</p><p className="text-xs text-rose-600 font-medium">Action Required</p></div>
        </div>
        <div className="rounded-xl border p-4 flex items-center gap-3 bg-amber-50 border-amber-100">
          <AlertTriangle size={20} className="text-amber-500" />
          <div><p className="text-2xl font-display font-bold text-amber-700">{warningCount}</p><p className="text-xs text-amber-600 font-medium">Needs Attention</p></div>
        </div>
        <div className="rounded-xl border p-4 flex items-center gap-3 bg-emerald-50 border-emerald-100">
          <CheckCircle size={20} className="text-emerald-600" />
          <div><p className="text-2xl font-display font-bold text-emerald-700">{compliantCount}</p><p className="text-xs text-emerald-600 font-medium">Compliant</p></div>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* State alerts */}
      {activeTab !== 'calendar' && (
        <div className="space-y-3">
          {stateAlerts.map(alert => {
            const isRed   = alert.status === 'action_required';
            const isAmber = alert.status === 'warning';
            const isGreen = alert.status === 'compliant';
            return (
              <Card key={alert.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="navy">{alert.law}</Badge>
                      <Badge variant={isRed ? 'red' : isAmber ? 'amber' : 'green'}>
                        <StatusDot status={isRed ? 'red' : isAmber ? 'amber' : 'green'} />
                        {isRed ? 'Action Required' : isAmber ? 'Schedule Needed' : 'Compliant'}
                      </Badge>
                      {alert.effectiveDate && <span className="text-xs text-slate-400">Effective {alert.effectiveDate}</span>}
                      {alert.daysRemaining  && <span className="text-xs font-semibold text-amber-600">{alert.daysRemaining} days remaining</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">{alert.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{alert.detail}</p>
                  </div>
                  <Button variant={isRed ? 'danger' : isAmber ? 'secondary' : 'ghost'} size="sm">
                    {isRed ? 'Fix Now' : isAmber ? 'Schedule' : 'View'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Calendar */}
      {activeTab === 'calendar' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Annual Compliance Calendar</h3>
          </div>
          {(calendar || MOCK_CALENDAR).map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
              <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-1 rounded-md flex-shrink-0 min-w-[52px] text-center">{item.month}</span>
              <p className="text-sm text-slate-700 flex-1">{item.action}</p>
              <Badge variant={item.status === 'done' ? 'green' : item.status === 'in_progress' ? 'amber' : 'gray'}>
                {item.status === 'done' ? 'Done' : item.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
