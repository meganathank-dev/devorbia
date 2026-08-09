import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store.js';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { ProtectedLayout } from './layouts/ProtectedLayout.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';

// Auth Pages
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// App Pages
import { DashboardPage } from './pages/DashboardPage.jsx';
import { EmployeesPage } from './pages/employees/EmployeesPage.jsx';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage.jsx';
import { DepartmentsPage } from './pages/departments/DepartmentsPage.jsx';
import { DepartmentDetailPage } from './pages/departments/DepartmentDetailPage.jsx';
import { TeamsPage } from './pages/teams/TeamsPage.jsx';
import { TeamDetailPage } from './pages/teams/TeamDetailPage.jsx';
import { OrganizationPage } from './pages/organization/OrganizationPage.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage.jsx';


import { LandingPage } from './pages/LandingPage.jsx';

const App = () => {
  const { initializeAuth } = useAuthStore();

  // Initialize authentication on app startup
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Authentication Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Application Routes */}
        <Route element={<ProtectedLayout />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/departments/:id" element={<DepartmentDetailPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/organization" element={<OrganizationPage />} />

          </Route>

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
