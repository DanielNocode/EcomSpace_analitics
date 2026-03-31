import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Webinars from './pages/Webinars';
import WebinarDetail from './pages/WebinarDetail';
import DeferredPayments from './pages/DeferredPayments';
import DeadLeads from './pages/DeadLeads';
import Anomalies from './pages/Anomalies';
import BizonReports from './pages/BizonReports';
import BizonReportDetail from './pages/BizonReportDetail';
import { AdminUsers } from './pages/AdminUsers';
import Profile from './pages/Profile';
import TimeToAction from './pages/TimeToAction';
import DataEntry from './pages/DataEntry';
import BizonUpload from './pages/BizonUpload';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="webinars" element={<Webinars />} />
        <Route path="webinars/:id" element={<WebinarDetail />} />
        <Route path="deferred" element={<DeferredPayments />} />
        <Route path="dead-leads" element={<DeadLeads />} />
        <Route path="time-to-action" element={<TimeToAction />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="bizon-reports" element={<BizonReports />} />
        <Route path="bizon-reports/:id" element={<BizonReportDetail />} />
        <Route path="data-entry" element={<DataEntry />} />
        <Route path="bizon-upload" element={<BizonUpload />} />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
