import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../features/auth/stores/useAuthStore';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { initializeAuth } = useAuthStore();
  
  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('loading'); // loading, ready, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await api.get(`/invitations/${token}`);
        setInvitation(response.data.data.invitation);
        setStatus('ready');
      } catch (error) {
        setStatus('error');
        setErrorMessage(error.response?.data?.error?.message || 'Invalid or expired invitation token');
      }
    };
    
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      await api.post(`/invitations/${token}/accept`, { password });
      setStatus('success');
      
      // Auto login by initializing auth, assuming API set cookies if it automatically logged in
      // For phase 1C we'll just redirect them to login page to authenticate fresh.
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.response?.data?.error?.message || 'Failed to accept invitation');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading invitation details...</div>
      </div>
    );
  }

  if (status === 'error' && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Invitation Unavailable</h2>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            DevOrbia
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join an organization
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {status === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">Invitation Accepted!</h2>
              <p className="text-sm text-gray-600">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 pb-6 border-b border-gray-200 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Organization</span>
                  <span className="font-medium text-gray-900">{invitation.organizationName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{invitation.email}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Assigned Role</span>
                  <span className="font-medium text-gray-900">{invitation.role}</span>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start text-sm">
                    <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Create a Password
                  </label>
                  <p className="text-xs text-gray-500 mb-2">If you already have an account, enter your existing password.</p>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {status === 'submitting' ? 'Accepting...' : 'Accept Invitation'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
