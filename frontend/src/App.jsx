import { useState, useEffect, useCallback, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Search, Bell, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import { useAuthStore } from './hooks/useStore';

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

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Page render error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <p className="text-sm font-semibold text-rose-600 mb-2">Page failed to load</p>
          <p className="text-xs text-slate-400 mb-4">{String(this.state.error)}</p>
          <button onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-xs bg-navy-600 text-white rounded-lg hover:bg-navy-700">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function renderPage(page, navigate, navParams) {
  switch (page) {
    case 'dashboard':      return <Dashboard onNavigate={navigate} />;
    case 'compliance':     return <Compliance />;
    case 'dues':           return <Dues />;
    case 'accounting':     return <Accounting />;
    case 'tax':            return <Tax />;
    case 'financials':     return <FinancialsPage />;
    case 'violations':     return <Violations />;
    case 'maintenance':    return <Maintenance />;
    case 'vendors':        return <Vendors />;
    case 'residents':      return <Residents />;
    case 'documents':      return <Documents />;
    case 'communications': return <Communications navParams={navParams} />;
    case 'amenities':      return <AmenitiesPage />;
    case 'communities':    return <Communities onNavigate={navigate} />;
    case 'map':            return <Map />;
    case 'building':       return <BuildingPage />;
    case 'boardmembers':   return <BoardMembersPage />;
    case 'elections':      return <ElectionsPage />;
    case 'ballots':        return <BallotManagementPage />;
    case 'meetings':       return <MeetingsPage />;
    case 'privacy':        return <PrivacyPolicyPage />;
    case 'terms':          return <TermsOfUsePage />;
    case 'preferences':    return <PreferencesPage />;
    default:               return <Dashboard onNavigate={navigate} />;
  }
}

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

  const isMap = page === 'map';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {!legalAccepted && <LegalAcceptanceModal onAccept={() => setLegalAccepted(true)} />}
      <Sidebar currentPage={page} onNavigate={navigate} />
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
          <PageErrorBoundary key={page}>
            {isMap
              ? <div className="flex-1 overflow-hidden">{renderPage(page, navigate, navParams)}</div>
              : <div className="flex-1 overflow-y-auto"><div className="max-w-7xl mx-auto px-6 py-6">{renderPage(page, navigate, navParams)}</div></div>
            }
          </PageErrorBoundary>
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
