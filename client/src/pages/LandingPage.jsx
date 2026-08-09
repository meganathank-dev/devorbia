import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { Button } from '../components/ui/Button.jsx';
import { Briefcase, Users, LayoutDashboard, Zap, Sparkles, BarChart3, Workflow, ShieldCheck } from 'lucide-react';

export const LandingPage = () => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-surface-950 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Workflow className="text-white h-5 w-5" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                FlowForge AI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors hidden sm:block">
                Sign In
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background Decor */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
            <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8 border border-primary-100 dark:border-primary-800/50">
                <Sparkles size={16} />
                <span>The intelligent operating system for your workforce.</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8 leading-[1.1]">
                Unify Your Teams with <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                  AI-Powered Workflows
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Streamline project management, optimize workforce allocation, and accelerate productivity through a secure, intelligent, unified platform.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 h-12 text-base shadow-lg shadow-primary-600/20">
                    Start Building Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
                    Sign In to Workspace
                  </Button>
                </Link>
              </div>
            </div>

            {/* Value Trust Statement */}
            <div className="mt-20 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-6">
                Built for security, scale, and seamless collaboration
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  <span className="text-sm font-medium">Enterprise Security</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Zap className="h-6 w-6 text-amber-500" />
                  <span className="text-sm font-medium">High Performance</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">Unified Teams</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary-500" />
                  <span className="text-sm font-medium">AI Assistance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="bg-white dark:bg-surface-900 py-24 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Everything you need to manage your organization</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                A cohesive ecosystem designed to replace fragmented tools and bring your company's operations under one roof.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workforce Management</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Securely manage employees, organizational roles, and hierarchical access controls.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors relative overflow-hidden group">
                <div className="absolute top-4 right-4 bg-gray-200 dark:bg-surface-800 text-xs font-bold px-2 py-1 rounded text-gray-600 dark:text-gray-400">Coming Soon</div>
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Project Tracking</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Organize projects, assign tasks, and track deliverables in real-time.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors relative overflow-hidden group">
                <div className="absolute top-4 right-4 bg-gray-200 dark:bg-surface-800 text-xs font-bold px-2 py-1 rounded text-gray-600 dark:text-gray-400">Coming Soon</div>
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Workflow size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workflow Automation</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Design automated processes that reduce manual busywork and errors.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-surface-950 border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors relative overflow-hidden group">
                <div className="absolute top-4 right-4 bg-gray-200 dark:bg-surface-800 text-xs font-bold px-2 py-1 rounded text-gray-600 dark:text-gray-400">Coming Soon</div>
                <div className="w-12 h-12 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl flex items-center justify-center mb-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deep Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Gain visibility into team performance and operational bottlenecks.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-24 relative overflow-hidden bg-gray-50 dark:bg-surface-950">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0iIzQzMzhjYSIgZmlsbC1vcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-sm font-bold mb-6 uppercase tracking-wider">
                  <Sparkles size={16} />
                  Intelligence Built-In
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                  Supercharge productivity with contextual AI assistance
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  FlowForge AI isn't just a management tool—it's an active participant in your workflow. From generating intelligent summaries to proactively identifying bottlenecks, AI is woven into the fabric of the platform.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <div className="mt-1 bg-primary-100 dark:bg-primary-900/30 p-1 rounded text-primary-600 dark:text-primary-400">
                      <Zap size={16} />
                    </div>
                    <span><strong>Automated insights</strong> to help you make data-driven decisions faster.</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <div className="mt-1 bg-primary-100 dark:bg-primary-900/30 p-1 rounded text-primary-600 dark:text-primary-400">
                      <LayoutDashboard size={16} />
                    </div>
                    <span><strong>Smart contextual search</strong> to instantly find projects, tasks, and team members.</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-600 to-indigo-600 blur-3xl opacity-20 rounded-full" />
                <div className="relative bg-white dark:bg-surface-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                      <Sparkles className="text-white h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">FlowForge Assistant</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">AI capabilities are planned for upcoming releases</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-100 dark:bg-surface-800 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 dark:bg-surface-800 rounded w-full" />
                    <div className="h-4 bg-gray-100 dark:bg-surface-800 rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-600 dark:bg-primary-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-50" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative z-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to transform your workspace?
            </h2>
            <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
              Create your account today and experience the future of intelligent organizational management.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-50 border-transparent h-14 px-10 text-lg shadow-xl">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-surface-900 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-md flex items-center justify-center">
                  <Workflow className="text-white h-3 w-3" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  FlowForge AI
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The intelligent operating system for your workforce.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Features</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Security</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Roadmap</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">About Us</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Contact</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} FlowForge AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
