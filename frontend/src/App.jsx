import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Layout from './components/Layout/Layout';
import PublicLayout from './components/Layout/PublicLayout';

// Auth Pages
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Dashboard Pages
import Dashboard from './pages/Dashboard/Dashboard';
import PropertyDashboard from './pages/Dashboard/PropertyDashboard';
import MaintenanceDashboard from './pages/Dashboard/MaintenanceDashboard';
import MaintenanceStaffDashboard from './pages/Dashboard/MaintenanceStaffDashboard';
import TenantDashboard from './pages/Dashboard/TenantDashboard';

// Property Management Pages
import Properties from './pages/Properties/Properties';
import PropertyDetail from './pages/Properties/PropertyDetail';
import Units from './pages/Units/Units';
import UnitDetail from './pages/Units/UnitDetail';

// Maintenance Pages
import MaintenanceRequests from './pages/Maintenance/MaintenanceRequests';
import MaintenanceRequestDetail from './pages/Maintenance/MaintenanceRequestDetail';
import CreateMaintenanceRequest from './pages/Maintenance/CreateMaintenanceRequest';

// User Management Pages
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';

// Loading Component
import LoadingSpinner from './components/UI/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (user) {
    // Redirect based on user type
    switch (user.user_type) {
      case 'tenant':
        return <Navigate to="/tenant/dashboard" replace />;
      case 'maintenance':
        return <Navigate to="/maintenance/staff" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <PublicLayout>
                    <Login />
                  </PublicLayout>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <PublicLayout>
                    <Register />
                  </PublicLayout>
                </PublicRoute>
              }
            />

            {/* Protected Routes - Admin & Manager */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/properties"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'maintenance']}>
                  <Layout>
                    <Properties />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/properties/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'maintenance']}>
                  <Layout>
                    <PropertyDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Maintenance Routes - All authenticated users */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaintenanceRequests />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateMaintenanceRequest />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaintenanceRequestDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Maintenance Dashboard - Managers and Admins */}
            <Route
              path="/maintenance/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout>
                    <MaintenanceDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Maintenance Staff Dashboard - Maintenance staff only */}
            <Route
              path="/maintenance/staff"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <MaintenanceStaffDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Tenant Dashboard - Tenants only */}
            <Route
              path="/tenant/dashboard"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Profile - All authenticated users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Error Pages */}
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">403</h1>
                    <p className="mt-2 text-base text-gray-500">Unauthorized access</p>
                    <p className="mt-1 text-sm text-gray-400">You don't have permission to access this resource.</p>
                  </div>
                </div>
              }
            />

            {/* 404 Page */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 0a4 4 0 016 0m-6 0v4a4 4 0 006 0v-4m-6 0V8a4 4 0 016 0v4" />
                      </svg>
                    </div>
                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">404</h1>
                    <p className="mt-2 text-base text-gray-500">Page not found</p>
                    <p className="mt-1 text-sm text-gray-400">The page you're looking for doesn't exist.</p>
                  </div>
                </div>
              }
            />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#22c55e',
                  secondary: '#ffffff',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
