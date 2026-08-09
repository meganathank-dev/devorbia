import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { useDepartmentStore } from '../../stores/department.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { ROLES } from '../../constants/roles.js';
import { Search, Plus, ChevronLeft, ChevronRight, Network, Users, Trash2 } from 'lucide-react';

export const DepartmentsPage = () => {
  const { departments, pagination, isLoading, error, fetchDepartments, createDepartment, deleteDepartment, clearError } = useDepartmentStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const isAdmin = user?.role === ROLES.ORGANIZATION_ADMIN;

  useEffect(() => {
    fetchDepartments({ page, limit: 10, search: searchTerm });
  }, [fetchDepartments, page, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDepartments({ page: 1, limit: 10, search: searchTerm });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Department name is required');
      return;
    }
    const success = await createDepartment(formData);
    if (success) {
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      fetchDepartments({ page, limit: 10, search: searchTerm });
    } else {
      setFormError(useDepartmentStore.getState().error || 'Failed to create department');
      clearError();
    }
  };

  const handleDelete = async (id, name) => {
    setDeleteError('');
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    const success = await deleteDepartment(id);
    if (success) {
      fetchDepartments({ page, limit: 10, search: searchTerm });
    } else {
      setDeleteError(useDepartmentStore.getState().error || 'Failed to delete department');
      clearError();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage departments within your organization.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={18} />
            New Department
          </Button>
        )}
      </div>

      {deleteError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
          {deleteError}
        </div>
      )}

      {showCreateForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Department</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Department Name"
              placeholder="e.g. Engineering"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
                {formError}
              </div>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-surface-900/50">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <Input
                type="text"
                placeholder="Search departments..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-gray-500 py-8">Loading...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-red-500 py-8">{error}</TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-gray-500 py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Network size={32} className="text-gray-400" />
                    <span>No departments found.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                        <Network size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {dept.name}
                        </div>
                        {dept.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{dept.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {dept.managerId ? (
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        {dept.managerId.firstName} {dept.managerId.lastName}
                      </div>
                    ) : (
                      <Badge variant="default">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                    {new Date(dept.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/departments/${dept._id}`}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm"
                      >
                        View Details
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(dept._id, dept.name)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete department"
                        >
                          <Trash2 size={16} />
                        </button>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-surface-800"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-surface-800"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
