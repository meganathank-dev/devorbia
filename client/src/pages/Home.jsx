import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Database, LayoutDashboard } from 'lucide-react';
import api from '../api/axios';

const Home = () => {
  const [health, setHealth] = useState({ status: 'LOADING...', dbConnected: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.get('/health');
        setHealth({
          status: response.data.data.status,
          dbConnected: response.data.data.database.connected,
        });
      } catch (err) {
        console.error(err);
        setError('Failed to connect to API backend.');
        setHealth({ status: 'ERROR', dbConnected: false });
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2.5 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">DevOrbia</h1>
        </div>
        
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          AI-powered software-development management SaaS platform.
          <br />
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-2 block">Phase 0 Foundation</span>
        </p>

        <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">System Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="text-slate-700 font-medium">API Connection</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                health.status === 'UP' ? 'bg-emerald-100 text-emerald-700' : 
                health.status === 'LOADING...' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {health.status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-indigo-500" />
                <span className="text-slate-700 font-medium">Database Status</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                health.dbConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {health.dbConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700 font-medium">Authentication</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                PENDING PHASE 1
              </span>
            </div>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-rose-50 rounded-md border border-rose-100 text-sm text-rose-600">
              {error} - Ensure the backend is running on port 5000.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
