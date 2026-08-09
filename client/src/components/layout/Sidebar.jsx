import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  CheckSquare,
  Network,
  Users2,
  BarChart3,
  TrendingUp,
  Bot,
  Lightbulb,
  Menu,
  X
} from 'lucide-react';

const sidebarGroups = [
  {
    title: "MAIN",
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '#projects', label: 'Projects', icon: FolderKanban, disabled: true, tooltip: "Phase 2C" },
      { path: '#tasks', label: 'Tasks', icon: CheckSquare, disabled: true, tooltip: "Phase 2C" },
    ]
  },
  {
    title: "WORKFORCE",
    items: [
      { path: '/employees', label: 'Employees', icon: Users },
      { path: '/departments', label: 'Departments', icon: Network },
      { path: '/teams', label: 'Teams', icon: Users2 },
    ]
  },
  {
    title: "ORGANIZATION",
    items: [
      { path: '/organization', label: 'Organization', icon: Building2 },
    ]
  },
  {
    title: "ANALYTICS",
    items: [
      { path: '#reports', label: 'Reports', icon: BarChart3, disabled: true, tooltip: "Phase 2C" },
      { path: '#performance', label: 'Performance', icon: TrendingUp, disabled: true, tooltip: "Phase 2C" },
    ]
  },
  {
    title: "AI",
    items: [
      { path: '#ai-assistant', label: 'AI Assistant', icon: Bot, disabled: true, tooltip: "Coming Soon" },
      { path: '#ai-insights', label: 'AI Insights', icon: Lightbulb, disabled: true, tooltip: "Coming Soon" },
    ]
  }
];

export const Sidebar = ({ isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 flex flex-col
        bg-white border-r border-gray-200 dark:bg-surface-950 dark:border-gray-800
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            FlowForge AI
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 -mr-2 text-gray-500 rounded-md hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-surface-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {sidebarGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  item.disabled ? (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                      title={item.tooltip}
                    >
                      <item.icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                      <span className="ml-auto text-[10px] font-semibold bg-gray-100 dark:bg-surface-800 text-gray-500 px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    </div>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-surface-800'
                        }
                      `}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {item.label}
                    </NavLink>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
