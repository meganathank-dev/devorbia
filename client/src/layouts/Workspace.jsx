import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Network, Layers3, FolderKanban, ListTodo, CalendarDays, ChartNoAxesCombined, Activity, Bell, Settings, LogOut, Menu, Sun, Moon, Gauge, Building2, Award, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth, useUI } from '../stores/app';
import { useData } from '../hooks/useData';
import { Avatar } from '../components/ui';
import { label } from '../utils/format';
import { errorMessage } from '../api/client';
const organizationLinks = [['', 'Overview', LayoutDashboard], ['projects', 'Projects', FolderKanban], ['tasks', 'Tasks', ListTodo], ['workload', 'Workload', Gauge], ['leave', 'Leave', CalendarDays], ['analytics', 'Analytics', ChartNoAxesCombined], ['performance', 'Recognition', Award], ['employees', 'People', Users], ['departments', 'Departments', Network], ['teams', 'Teams', Layers3], ['notifications', 'Notifications', Bell], ['settings', 'Settings', Settings]];
export default function Workspace() {
  const {
      user,
      logout
    } = useAuth(),
    toast = useUI(s => s.toast),
    refresh = useUI(s => s.refresh),
    [open, setOpen] = useState(false),
    [compact, setCompact] = useState(false),
    location = useLocation(),
    navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('devorbia-theme') || 'light');
  const platform = user.role === 'SUPER_ADMIN';
  const {
    data: notifications
  } = useData(platform ? null : '/notifications/unread-count');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('devorbia-theme', theme);
  }, [theme]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (platform) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [platform, refresh]);
  const links = platform ? [['platform', 'Organizations', Building2]] : organizationLinks.filter(([path]) => !(user.role === 'EMPLOYEE' && ['departments', 'analytics'].includes(path)));
  if (!platform && user.role === 'ORGANIZATION_ADMIN') links.splice(links.length - 1, 0, ['activity', 'Activity log', Activity]);
  const current = links.find(([path]) => path ? location.pathname.startsWith(`/app/${path}`) : location.pathname === '/app')?.[1] || 'Workspace';
  return <div className={`workspace ${compact ? 'compact' : ''}`}><a className="skip-link" href="#main">Skip to main content</a>{open && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}<aside className={`sidebar ${open ? 'open' : ''}`}><Link to={platform ? '/app/platform' : '/app'} className="brand"><img src="/favicon.svg" alt="" /><span>DevOrbia</span></Link><div className="workspace-name"><span className="workspace-symbol">{(user.organizationName || 'P')[0]}</span><div><strong>{user.organizationName || 'Platform administration'}</strong><small>{platform ? 'Platform workspace' : 'Organization workspace'}</small></div></div><span className="nav-caption">WORKSPACE</span><nav aria-label="Main navigation">{links.map(([path, title, Icon]) => <NavLink key={path} to={`/app${path ? `/${path}` : ''}`} end={!path} title={compact ? title : undefined}><Icon size={18} /><span>{user.role === 'EMPLOYEE' && path === 'tasks' ? 'My tasks' : title}</span>{path === 'notifications' && notifications?.count > 0 && <b className="nav-count">{notifications.count > 99 ? '99+' : notifications.count}</b>}</NavLink>)}</nav><div className="sidebar-bottom"><button className="collapse-button" onClick={() => setCompact(!compact)}>{compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span>Collapse sidebar</span></button><div className="sidebar-user"><Avatar name={user.name} /><div><strong>{user.name}</strong><small>{label(user.role)}</small></div><button aria-label="Sign out" title="Sign out" onClick={async () => {
            try {
              await logout();
              navigate('/login');
            } catch (e) {
              toast(errorMessage(e), 'error');
            }
          }}><LogOut size={17} /></button></div></div></aside><div className="workspace-body"><header className="topbar"><div><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setOpen(!open)}><Menu size={21} /></button><span className="breadcrumb">Workspace <span>/</span> <strong>{current}</strong></span></div><div className="topbar-actions"><span className="today">{new Intl.DateTimeFormat('en-IN', {
              day: 'numeric',
              month: 'short',
              weekday: 'short'
            }).format(new Date())}</span><button className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>{!platform && <Link to="/app/notifications" className="icon-button" aria-label={`${notifications?.count || 0} unread notifications`}><Bell size={19} />{notifications?.count > 0 && <i className="unread-dot" />}</Link>}<Avatar name={user.name} size="small" /></div></header><main id="main" className="main-content"><Outlet /></main><footer className="workspace-footer"><span>DevOrbia · Development Management</span><span>Intelligence recommends. People decide.</span></footer></div></div>;
}
