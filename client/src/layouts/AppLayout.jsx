import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Building2, LogOut, Code2, Users, Settings, Activity } from 'lucide-react';
import useAuthStore from '../features/auth/stores/useAuthStore';
import api from '../api/axios';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await api.get('/organizations/my');
        const orgs = response.data.data.organizations;
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setActiveOrg(orgs[0]);
        }
      } catch (error) {
        console.error("Failed to fetch organizations", error);
      }
    };
    
    fetchOrgs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-white tracking-wide border-b border-slate-800">
          DevOrbia
        </div>
        
        <div className="px-4 py-6 flex-1">
          {activeOrg && (
            <div className="mb-8">
              <div className="text-xs uppercase text-slate-500 font-semibold tracking-wider mb-2">Organization</div>
              <div className="flex items-center px-3 py-2 bg-slate-800 rounded-md text-slate-100">
                <Building2 className="w-4 h-4 mr-3 text-blue-400" />
                <span className="font-medium truncate">{activeOrg.name}</span>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            <a href="#" className="flex items-center px-3 py-2.5 bg-blue-600/10 text-blue-400 rounded-md">
              <Activity className="w-5 h-5 mr-3" />
              Workspace
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
              <Code2 className="w-5 h-5 mr-3 text-slate-400" />
              Projects
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
              <Users className="w-5 h-5 mr-3 text-slate-400" />
              Team
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
              <Settings className="w-5 h-5 mr-3 text-slate-400" />
              Settings
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-sm font-medium text-slate-200 truncate">{user?.email}</div>
              <div className="text-xs text-slate-500 mt-0.5">{activeOrg?.role || user?.role}</div>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 md:hidden">
          <div className="font-bold text-gray-900 tracking-wide">DevOrbia</div>
        </header>
        
        <main className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* The actual page content will be injected here via Outlet */}
            <Outlet context={{ activeOrg }} />
          </div>
        </main>
      </div>
    </div>
  );
}
