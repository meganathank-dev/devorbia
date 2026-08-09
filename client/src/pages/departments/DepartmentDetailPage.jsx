import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDepartmentStore } from '../../stores/department.store.js';
import { useTeamStore } from '../../stores/team.store.js';
import { useEmployeeStore } from '../../stores/employee.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { ROLES } from '../../constants/roles.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { ArrowLeft, Network, Users2, Users, Plus } from 'lucide-react';

export const DepartmentDetailPage = () => {
  const { id } = useParams();
  const { selectedDepartment: dept, isLoading, error, fetchDepartmentById, updateDepartment } = useDepartmentStore();
  const { teams, fetchTeams } = useTeamStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role === ROLES.ORGANIZATION_ADMIN;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamFormData, setTeamFormData] = useState({ name: '', description: '' });
  const [teamFormError, setTeamFormError] = useState('');
  const { createTeam } = useTeamStore();

  useEffect(() => {
    if (id) {
      fetchDepartmentById(id);
      fetchTeams({ departmentId: id, limit: 50 });
      fetchEmployees({ limit: 50 });
    }
  }, [id, fetchDepartmentById, fetchTeams, fetchEmployees]);

  useEffect(() => {
    if (dept) {
      setEditData({ name: dept.name, description: dept.description || '' });
    }
  }, [dept]);

  const handleSaveEdit = async () => {
    const success = await updateDepartment(id, editData);
    if (success) {
      setIsEditing(false);
      fetchDepartmentById(id);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setTeamFormError('');
    if (!teamFormData.name.trim()) {
      setTeamFormError('Team name is required');
      return;
    }
    const success = await createTeam({ ...teamFormData, departmentId: id });
    if (success) {
      setTeamFormData({ name: '', description: '' });
      setShowCreateTeam(false);
      fetchTeams({ departmentId: id, limit: 50 });
    } else {
      setTeamFormError(useTeamStore.getState().error || 'Failed to create team');
    }
  };

  // Filter employees belonging to this department
  const deptEmployees = employees.filter(
    (emp) => emp.departmentId?.toString() === id || emp.departmentId?._id?.toString() === id
  );

  if (isLoading && !dept) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!dept) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Department not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/departments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
          <ArrowLeft size={16} /> Back to Departments
        </Link>
      </div>

      {/* Department Info Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center">
              <Network size={24} />
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Department name"
                  />
                  <Input
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveEdit}>Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dept.name}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dept.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Users size={14} /> Manager: {dept.managerId ? `${dept.managerId.firstName} ${dept.managerId.lastName}` : 'Unassigned'}</span>
                    <span>Created: {new Date(dept.createdAt).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {isAdmin && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Teams Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users2 size={20} /> Teams
        </h2>
        {(isAdmin || user?.role === ROLES.PROJECT_MANAGER) && (
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => setShowCreateTeam(!showCreateTeam)}>
            <Plus size={16} /> Add Team
          </Button>
        )}
      </div>

      {showCreateTeam && (
        <Card className="p-4">
          <form onSubmit={handleCreateTeam} className="space-y-3">
            <Input label="Team Name" placeholder="e.g. Frontend" value={teamFormData.name} onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })} required />
            <Input label="Description" placeholder="Optional" value={teamFormData.description} onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })} />
            {teamFormError && <div className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">{teamFormError}</div>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm">Create Team</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan="3" className="text-center text-gray-500 py-6">
                  <div className="flex flex-col items-center gap-2">
                    <Users2 size={28} className="text-gray-400" />
                    <span>No teams in this department yet.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                    {team.description && <div className="text-xs text-gray-500 dark:text-gray-400">{team.description}</div>}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {team.leaderId ? `${team.leaderId.firstName} ${team.leaderId.lastName}` : <Badge variant="default">Unassigned</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/teams/${team._id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm">View</Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Department Employees */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Users size={20} /> Department Members ({deptEmployees.length})
      </h2>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Team</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deptEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-gray-500 py-6">No employees assigned to this department.</TableCell>
              </TableRow>
            ) : (
              deptEmployees.map((emp) => (
                <TableRow key={emp._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">{emp.title || '-'}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {emp.teamId ? (typeof emp.teamId === 'object' ? emp.teamId.name : 'Assigned') : <Badge variant="default">Unassigned</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/employees/${emp._id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm">View</Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
