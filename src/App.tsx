import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { DashboardPage } from './pages/DashboardPage';
import { SplashScreen } from './components/common/SplashScreen';
import { WelcomeScreen } from './components/common/WelcomeScreen';
import { checkSupabaseConnection } from './lib/supabase';

const BranchesPage = lazy(() =>
  import('./pages/BranchesPage').then((m) => ({ default: m.BranchesPage }))
);
const EmployeesPage = lazy(() =>
  import('./pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage }))
);
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage }))
);
const PurchasesPage = lazy(() =>
  import('./pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage }))
);
const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage }))
);
const OfflineSalesPage = lazy(() =>
  import('./pages/OfflineSalesPage').then((m) => ({ default: m.OfflineSalesPage }))
);
const OnlineSalesPage = lazy(() =>
  import('./pages/OnlineSalesPage').then((m) => ({ default: m.OnlineSalesPage }))
);
const UpiManagerPage = lazy(() =>
  import('./pages/UpiManagerPage').then((m) => ({ default: m.UpiManagerPage }))
);
const GstManagerPage = lazy(() =>
  import('./pages/GstManagerPage').then((m) => ({ default: m.GstManagerPage }))
);
const CustomerPaymentPage = lazy(() =>
  import('./pages/CustomerPaymentPage').then((m) => ({ default: m.CustomerPaymentPage }))
);

const PageLoader: React.FC = () => (
  <div className="space-y-4 py-4">
    <div className="h-16 animate-pulse rounded-2xl border border-white/70 bg-white/70" />
    <div className="h-72 animate-pulse rounded-2xl border border-white/70 bg-white/70" />
  </div>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isPaymentCheckoutMode, setIsPaymentCheckoutMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Initialize route from URL pathname or search params if present
  useEffect(() => {
    const syncRouteFromPath = () => {
      const search = new URLSearchParams(window.location.search);
      const path = window.location.pathname.replace(/^\//, '');

      if (path === 'pay' || search.has('pay') || (search.has('ref') && !path)) {
        setIsPaymentCheckoutMode(true);
        return;
      }

      setIsPaymentCheckoutMode(false);
      if (path === 'branches') {
        setCurrentPage('branches');
      } else if (path === 'employees') {
        setCurrentPage('employees');
      } else if (path === 'suppliers') {
        setCurrentPage('suppliers');
      } else if (path === 'purchases') {
        setCurrentPage('purchases');
      } else if (path === 'inventory') {
        setCurrentPage('inventory');
      } else if (path === 'offline-sales') {
        setCurrentPage('offline-sales');
      } else if (path === 'online-sales') {
        setCurrentPage('online-sales');
      } else if (path === 'upi-manager') {
        setCurrentPage('upi-manager');
      } else if (path === 'gst') {
        setCurrentPage('gst');
      } else {
        // default opens directly to Executive Dashboard as required
        setCurrentPage('dashboard');
      }
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  // Check Supabase connection on load
  useEffect(() => {
    checkSupabaseConnection().then((res) => {
      setIsSupabaseConnected(res.ok);
    });
  }, []);

  const handleNavigate = (page: NavigationPage) => {
    setIsPaymentCheckoutMode(false);
    setCurrentPage(page);
    const targetPath = page === 'dashboard' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath || window.location.search) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
    setShowWelcome(true);
  };

  const handleReplaySplash = () => {
    setShowWelcome(false);
    setShowSplash(true);
  };

  // If customer is viewing the dedicated checkout & payment page
  if (isPaymentCheckoutMode) {
    return (
      <Suspense fallback={<PageLoader />}>
        <CustomerPaymentPage
          onBackToAdmin={() => {
            setIsPaymentCheckoutMode(false);
            window.history.pushState(null, '', '/upi-manager');
            setCurrentPage('upi-manager');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f3faf6] flex flex-col font-sans text-slate-900 selection:bg-emerald-600 selection:text-white antialiased">
      {/* Ambient animated background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="app-orb absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-300/25" />
        <div className="app-orb-delayed absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-teal-200/30" />
        <div className="app-orb absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-cyan-200/20" />
      </div>

      {/* Animated Splash Screen with pasara.jpeg logo */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} durationMs={1200} />}

      {/* Personalized welcome note after splash */}
      {!showSplash && showWelcome && (
        <WelcomeScreen onFinish={() => setShowWelcome(false)} durationMs={1800} />
      )}

      {/* Sidebar (Desktop and Mobile Drawer) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="relative z-10 lg:pl-60 flex flex-col flex-1 min-w-0">
        <Header
          currentPage={currentPage}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          isSupabaseConnected={isSupabaseConnected}
          onReplaySplash={handleReplaySplash}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<PageLoader />}>
            <div key={currentPage} className="page-enter">
              {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
              {currentPage === 'branches' && <BranchesPage />}
              {currentPage === 'employees' && <EmployeesPage />}
              {currentPage === 'suppliers' && (
                <SuppliersPage onNavigateToPurchases={() => handleNavigate('purchases')} />
              )}
              {currentPage === 'purchases' && <PurchasesPage />}
              {currentPage === 'inventory' && <InventoryPage />}
              {currentPage === 'offline-sales' && <OfflineSalesPage />}
              {currentPage === 'online-sales' && <OnlineSalesPage onNavigate={handleNavigate} />}
              {currentPage === 'upi-manager' && <UpiManagerPage onNavigate={handleNavigate} />}
              {currentPage === 'gst' && <GstManagerPage />}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Supabase Database & Storage Configuration Dialog */}
      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => {
          setIsSupabaseModalOpen(false);
          checkSupabaseConnection().then((res) => setIsSupabaseConnected(res.ok));
        }}
      />
    </div>
  );
}
