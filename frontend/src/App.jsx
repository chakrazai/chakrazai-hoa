import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Search, Bell, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import { useAuthStore } from './hooks/useStore';

// Lazy page imports
import Dashboard from './pages/Dashboard';

import { Compliance, Dues, Accounting, Tax, Violations, Maintenance, Vendors, Residents, Documents, Communications, Communities, BuildingPage, BoardMembersPage, ElectionsPage, MeetingsPage, BallotManagementPage, AmenitiesPage, PreferencesPage, FinancialsPage } from './pages/index.jsx';
import Map from './pages/Map.jsx';
import { PrivacyPolicyPage, TermsOfUsePage, LegalAcceptanceModal, getLegalAcceptance } from './pages/LegalPages.jsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const pageTitles = {
  dashboard: 'Dashboard', compliance: 'Compliance', dues: 'Dues & Payments',
  accounting: 'Accounting', tax: 'Tax Reports', financials: 'Invoices & Payments', violations: 'Violations',
  maintenance: 'Maintenance', vendors: 'Vendors', residents: 'Residents',
  documents: 'Documents', communications: 'Communications', communities: 'Communities',
  amenities: 'Amenities', map: 'Community Map', building: 'Building Maps',
  boardmembers: 'Board Members', elections: 'Elections', meetings: 'Meetings',
  ballots: 'Ballot Management', privacy: 'Privacy Policy', terms: 'Terms of Use',
  preferences: 'Profile & Preferences',
};

function AppLayout() {
  const [page, setPage] = useState(() => localStorage.getItem('hoa_current_page') || 'dashboard');
  const [navParams, setNavParams] = useState(null);
  const [legalAccepted, setLegalAccepted] = useState(() => !!getLegalAcceptance());
  const { token, fetchMe } = useAuthStore();

  const navigate = useCallback((newPage, params = null) => {
    setNavParams(params);
    setPage(newPage);
  }, []);

  useEffect(() => { if (token) fetchMe(); }, [token]);
  useEffect(() => { localStorage.setItem('hoa_current_page', page); }, [page]);

  if (!token) return <Navigate to="/login" />;

  const pages = {
    dashboard:      <Dashboard onNavigate={navigate} />,
    compliance:     <Compliance />,
    dues:           <Dues />,
    accounting:     <Accounting />,
    tax:            <Tax />,
    financials:     <FinancialsPage />,
    violations:     <Violations />,
    maintenance:    <Maintenance />,
    vendors:        <Vendors />,
    residents:      <Residents />,
    documents:      <Documents />,
    communications: <Communications navParams={navParams} />,
    amenities:      <AmenitiesPage />,
    communities:    <Communities onNavigate={navigate} />,
    map:            <Map />,
    building:       <BuildingPage />,
    boardmembers:   <BoardMembersPage />,
    elections:      <ElectionsPage />,
    ballots:        <BallotManagementPage />,
    meetings:       <MeetingsPage />,
    privacy:        <PrivacyPolicyPage />,
    terms:          <TermsOfUsePage />,
    preferences:    <PreferencesPage />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {!legalAccepted && <LegalAcceptanceModal onAccept={() => setLegalAccepted(true)} />}
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="h-13 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0" style={{ height: 50 }}>
          <h1 className="text-sm font-semibold text-slate-800">{pageTitles[page] || 'ChakrazAI HOA'}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-300 w-44 transition-all" />
            </div>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-600 text-white text-xs font-medium rounded-lg hover:bg-navy-700 transition-colors">
              <Plus size={12} />New Action
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {page === 'map'
            ? <div className="flex-1 overflow-hidden">{pages.map}</div>
            : <div className="flex-1 overflow-y-auto"><div className="max-w-7xl mx-auto px-6 py-6">{pages[page] || pages.dashboard}</div></div>
          }
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*"     element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
