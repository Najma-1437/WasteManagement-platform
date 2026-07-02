// client/src/App.jsx
import { useEffect }                              from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, ROLE_DASHBOARDS }          from './store/authStore';
import { syncQueuedLogs }                         from './utils/syncQueuedLogs';

// Pages
import Landing      from './pages/Landing';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Role dashboards
import CollectorDashboard   from './pages/collector/Dashboard';
import LogNew               from './pages/collector/LogNew';
import Leaderboard          from './pages/collector/Leaderboard';
import AllLogs              from './pages/collector/AllLogs';
import Earnings             from './pages/collector/Earnings';
import BuyerMatches         from './pages/collector/BuyerMatches';
import BuyerDashboard       from './pages/buyer/Dashboard';
import CoordinatorDashboard from './pages/coordinator/Dashboard';
import AdminDashboard       from './pages/admin/Dashboard';

import ProtectedRoute from './components/ProtectedRoute';

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.role) {
    return <Navigate to={ROLE_DASHBOARDS[user.role]} replace />;
  }
  return children;
}

export default function App() {
  // Attempt to drain any offline-queued logs on every app load. Safe to
  // call for all users — syncQueuedLogs is a no-op when the queue is empty
  // or the user isn't authenticated (aborts on 401).
  useEffect(() => {
    syncQueuedLogs().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={
          <PublicRoute><Landing /></PublicRoute>
        }/>
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        }/>
        <Route path="/register" element={
          <PublicRoute><Register /></PublicRoute>
        }/>
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Collector ── */}
        <Route path="/collector" element={
          <ProtectedRoute roles={['collector']}>
            <CollectorDashboard />
          </ProtectedRoute>
        }/>
        <Route path="/collector/log-new" element={
          <ProtectedRoute roles={['collector']}>
            <LogNew />
          </ProtectedRoute>
        }/>
        <Route path="/collector/leaderboard" element={
          <ProtectedRoute roles={['collector']}>
            <Leaderboard />
          </ProtectedRoute>
        }/>
        <Route path="/collector/logs" element={
          <ProtectedRoute roles={['collector']}>
            <AllLogs />
          </ProtectedRoute>
        }/>
        <Route path="/collector/earnings" element={
          <ProtectedRoute roles={['collector']}>
            <Earnings />
          </ProtectedRoute>
        }/>
        <Route path="/collector/matches" element={
          <ProtectedRoute roles={['collector']}>
            <BuyerMatches />
          </ProtectedRoute>
        }/>

        {/* ── Buyer ── */}
        <Route path="/buyer/dashboard" element={
          <ProtectedRoute roles="buyer">
            <BuyerDashboard />
          </ProtectedRoute>
        }/>

        {/* ── Coordinator ── */}
        <Route path="/coordinator/*" element={
          <ProtectedRoute roles={['coordinator']}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }/>

        {/* ── Admin ── */}
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }/>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}