import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppProvider } from './contexts/AppContext';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/TopBar';

import SplashPage from './pages/SplashPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import ManualEntryPage from './pages/ManualEntryPage';
import VoicePage from './pages/VoicePage';
import ReceiptPage from './pages/ReceiptPage';
import QrPage from './pages/QrPage';
import InsightsPage from './pages/InsightsPage';
import AlternativesPage from './pages/AlternativesPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/transaction/:id" component={TransactionDetailPage} />
      <Route path="/manual" component={ManualEntryPage} />
      <Route path="/voice" component={VoicePage} />
      <Route path="/receipt" component={ReceiptPage} />
      <Route path="/qr" component={QrPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/alternatives" component={AlternativesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminDashboardPage} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">404 Not Found</div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <TopBar />
          <Router />
          <BottomNav />
        </WouterRouter>
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
