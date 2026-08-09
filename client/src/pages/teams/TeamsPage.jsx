import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { useTeamStore } from '../../stores/team.store.js';
import { useDepartmentStore } from '../../stores/department.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { ROLES } from '../../constants/roles.js';
import { Search, Plus, ChevronLeft, ChevronRight, Users2, Trash2 } from 'lucide-react';

export const TeamsPage = () => {
  const { teams, pagination, isLoading, error, fetchTeams, createTeam, deleteTeam, clearError } = useTeamStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filterDeptId, setFilterDeptId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', departmentId: '' });
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const canCreate = [ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER].includes(user?.role);
  const isAdmin = user?.role === ROLES.ORGANIZATION_ADMIN;

  useEffect(() => {
    fetchDepartments({ limit: 100 });
  }, [fetchDepartments]);

  useEffect(() => {
    const params = { page, limit: 10, search: searchTerm };
    if (filterDeptId) params.departmentId = filterDeptId;
    fetchTeams(params);
  }, [fetchTeams, page, searchTerm, filterDeptId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) { setFormError('Team name is required'); return; }
    if (!formData.departmentId) { setFormError('Please select a department'); return; }
    const success = await createTeam(formData);
    if (success) {
      setFormData({ name: '', description: '', departmentId: '' });
      setShowCreateForm(false);
      const params = { page, limit: 10, search: searchTerm };
      if (filterDeptId) params.departmentId = filterDeptId;
      fetchTeams(params);
    } else {
      setFormError(useTeamStore.getState().error || 'Failed to create team');
      clearError();
    }
  };

  const handleDelete = async (id, name) => {
    setDeleteError('');
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const success = await deleteTeam(id);
    if (success) {
      const params = { page, limit: 10, search: searchTerm };
      if (filterDeptId) params.departmentId = filterDeptId;
      fetchTeams(params);
    } else {
      setDeleteError(useTeamStore.getState().error || 'Failed to delete team');
      clearError();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage teams across your organization.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" className="flex items-center gap-2" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={18} />
            New Team
          </Button>
        )}
      </div>

      {deleteError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">{deleteError}</div>
      )}

      {showCreateForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Team</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-surface-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                required
              >
                <option value="">Select a department...</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <Input label="Team Name" placeholder="e.g. Frontend" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Description" placeholder="Optional description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            {formError && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">{formError}</div>}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-surface-900/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Search size={18} /></div>
                <Input type="text" placeholder="Search teams..." className="pl-10" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
              </div>
            </form>
            <select
              value={filterDeptId}
              onChange={(e) => { setFilterDeptId(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-surface-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan="4" className="text-center text-gray-500 py-8">Loading...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan="4" className="text-center text-red-500 py-8">{error}</TableCell></TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-gray-500 py-8">
                  <div className="flex flex-col items-center gap-2"><Users2 size={32} className="text-gray-400" /><span>No teams found.</span></div>
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center"><Users2 size={18} /></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                        {team.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{team.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="default">{team.departmentId?.name || 'Unknown'}</Badge></TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {team.leaderId ? `${team.leaderId.firstName} ${team.leaderId.lastName}` : <span className="text-gray-400 italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/teams/${team._id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm">View Details</Link>
                      {isAdmin && (
                        <button onClick={() => handleDelete(team._id, team.name)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete team"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-surface-900/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-surface-800"><ChevronLeft size={20} /></button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-surface-800"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
