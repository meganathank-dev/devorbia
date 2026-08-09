import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { Workflow, Sparkles } from 'lucide-react';

/**
 * Layout wrapper for public authentication pages (Login, Register, etc.).
 * If the user is already authenticated, they are redirected to the main app.
 */
export const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-surface-950 transition-colors">
      {/* Left Pane - Branding & Visuals (Hidden on smaller screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-surface-950 via-indigo-950 to-primary-900 border-r border-gray-200 dark:border-gray-800 flex-col justify-between overflow-hidden">
        {/* Abstract shapes for visual interest */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-50 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary-600/20 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0iIzQzMzhjYSIgZmlsbC1vcGFjaXR5PSIwLjI1Ii8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        </div>

        <div className="relative z-10 p-12">
          <Link to="/" className="flex items-center gap-3 inline-block">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-900/50">
              <Workflow className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              FlowForge AI
            </span>
          </Link>
        </div>

        <div className="relative z-10 p-12 pb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-200 text-sm font-medium mb-6 border border-white/10 backdrop-blur-sm">
            <Sparkles size={16} />
            <span>Intelligent Enterprise OS</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Manage your workforce with unparalleled clarity.
          </h1>
          <p className="text-lg text-primary-200/80 max-w-lg">
            A unified platform designed for modern teams, seamlessly blending project management, robust access controls, and AI-driven insights.
          </p>
        </div>
      </div>

      {/* Right Pane - Authentication Forms */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-32 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Workflow className="text-white h-6 w-6" />
            </div>
            <span className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
              FlowForge AI
            </span>
          </div>

          {/* Render the specific authentication form */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};
