import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './stores/app';
import { Loading, Toasts, Empty } from './components/ui';
import Workspace from './layouts/Workspace';
const Auth = lazy(() => import('./features/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const People = lazy(() => import('./pages/People'));
const Structure = lazy(() => import('./pages/Structure'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Leave = lazy(() => import('./pages/Leave'));
const Intelligence = lazy(() => import('./pages/Intelligence'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Platform = lazy(() => import('./pages/Platform'));
function Protected() {
  const {
    user,
    loading
  } = useAuth();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
function OrganizationOnly() {
  return useAuth(s => s.user.role) === 'SUPER_ADMIN' ? <Navigate to="/app/platform" replace /> : <Outlet />;
}
export default function App() {
  const initialize = useAuth(s => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <BrowserRouter><Suspense fallback={<Loading />}><Routes><Route path="/" element={<Navigate to="/app" replace />} />{['login', 'forgot-password', 'reset-password', 'accept-invitation'].map(mode => <Route key={mode} path={`/${mode}`} element={<Auth mode={mode} />} />)}<Route element={<Protected />}><Route path="/app" element={<Workspace />}><Route path="platform" element={<Platform />} /><Route element={<OrganizationOnly />}><Route index element={<Dashboard />} /><Route path="employees" element={<People />} /><Route path="departments" element={<Structure kind="departments" />} /><Route path="teams" element={<Structure kind="teams" />} /><Route path="projects" element={<Projects />} /><Route path="projects/:id" element={<ProjectDetail />} /><Route path="tasks" element={<Tasks />} /><Route path="leave" element={<Leave />} /><Route path="workload" element={<Intelligence mode="workload" />} /><Route path="analytics" element={<Intelligence mode="analytics" />} /><Route path="performance" element={<Intelligence mode="performance" />} /><Route path="notifications" element={<Notifications />} /><Route path="activity" element={<Notifications activity />} /><Route path="settings" element={<Settings />} /></Route></Route></Route><Route path="*" element={<Empty title="Page not found" text="This page is not part of your workspace." action={<a href="/app">Return to workspace</a>} />} /></Routes></Suspense><Toasts /></BrowserRouter>;
}
