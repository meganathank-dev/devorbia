import { useState, useEffect } from 'react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { useDepartmentStore } from '../../stores/department.store.js';
import { useTeamStore } from '../../stores/team.store.js';

export const AssignEmployeeModal = ({ employee, isOpen, onClose, onAssign }) => {
  const { departments, fetchDepartments } = useDepartmentStore();
  const { teams, fetchTeams } = useTeamStore();
  const [departmentId, setDepartmentId] = useState(employee.departmentId || '');
  const [teamId, setTeamId] = useState(employee.teamId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDepartments({ limit: 100 });
      setDepartmentId(employee.departmentId?._id || employee.departmentId || '');
      setTeamId(employee.teamId?._id || employee.teamId || '');
    }
  }, [isOpen, employee, fetchDepartments]);

  useEffect(() => {
    if (departmentId) {
      fetchTeams({ departmentId, limit: 100 });
    }
  }, [departmentId, fetchTeams]);

  // If department changes and the selected team doesn't belong to it, clear the team selection
  useEffect(() => {
    if (departmentId && teamId) {
      const teamExistsInDept = teams.some(t => t._id === teamId);
      if (teams.length > 0 && !teamExistsInDept) {
        setTeamId('');
      }
    }
  }, [departmentId, teams, teamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        departmentId: departmentId || null,
        teamId: teamId || null,
      };
      await onAssign(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white dark:bg-surface-900 shadow-xl rounded-xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Assign Employee</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Assign {employee.firstName} {employee.lastName} to a department and team.
          </p>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  if (!e.target.value) setTeamId(''); // Clear team if dept is cleared
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-surface-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">-- Unassigned --</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={!departmentId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-surface-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-surface-900"
              >
                <option value="">-- Unassigned --</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>{team.name}</option>
                ))}
              </select>
              {!departmentId && (
                <p className="mt-1 text-xs text-gray-500">Select a department first to assign a team.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Assignment'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
};
