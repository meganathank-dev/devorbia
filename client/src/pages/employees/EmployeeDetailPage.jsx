import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEmployeeStore } from '../../stores/employee.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { ROLES } from '../../constants/roles.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ArrowLeft, Mail, Briefcase, Calendar, Hash, UserCog } from 'lucide-react';
import { AssignEmployeeModal } from '../../components/employees/AssignEmployeeModal.jsx';
import { assignEmployee } from '../../services/employee.service.js';

export const EmployeeDetailPage = () => {
  const { id } = useParams();
  const { selectedEmployee: emp, isLoading, error, fetchEmployeeById } = useEmployeeStore();
  const { user } = useAuthStore();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canAssign = [ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER].includes(user?.role);

  useEffect(() => {
    if (id) {
      fetchEmployeeById(id);
    }
  }, [id, fetchEmployeeById]);

  const handleAssign = async (payload) => {
    await assignEmployee(id, payload);
    fetchEmployeeById(id);
  };

  if (isLoading) return <div className="text-center py-10">Loading profile...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!emp) return <div className="text-center py-10">Employee not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/employees" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Profile</h1>
        </div>
        {canAssign && (
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowAssignModal(true)}>
            <UserCog size={16} />
            Assign Role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <Card className="p-6 md:col-span-1 flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-3xl uppercase">
            {emp.firstName?.[0]}{emp.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {emp.firstName} {emp.lastName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{emp.title || 'No Title'}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {emp.user?.role?.replace('_', ' ')}
          </span>
        </Card>

        {/* Right Column: Details */}
        <Card className="p-6 md:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
            Contact & Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Mail className="text-gray-400 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{emp.user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="text-gray-400 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{emp.user?.employeeId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="text-gray-400 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</p>
                {emp.departmentId ? (
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {emp.departmentId.name || 'Assigned'}
                    {emp.teamId && (
                      <span className="text-gray-500"> (Team: {emp.teamId.name || 'Assigned'})</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white mt-1 italic text-gray-400">Not assigned</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="text-gray-400 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Join Date</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {new Date(emp.joinDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {emp.skills && emp.skills.length > 0 ? (
                emp.skills.map((skill, index) => (
                  <span key={index} className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-300">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 italic">No skills listed</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <AssignEmployeeModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        employee={emp}
        onAssign={handleAssign}
      />
    </div>
  );
};

