import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { useEmployeeStore } from '../../stores/employee.store.js';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';
import { ROLES } from '../../constants/roles.js';
import { AddEmployeeModal } from '../../components/employees/AddEmployeeModal.jsx';

export const EmployeesPage = () => {
  const {
    employees,
    pagination,
    isLoading,
    error,
    fetchEmployees,
    createEmployee,
  } = useEmployeeStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canCreateEmployee = [ROLES.ORGANIZATION_ADMIN, ROLES.PROJECT_MANAGER].includes(user?.role);

  useEffect(() => {
    fetchEmployees({ page, limit: 10, search: searchTerm });
  }, [fetchEmployees, page, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees({ page: 1, limit: 10, search: searchTerm });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage employees within your organization.
          </p>
        </div>
        {canCreateEmployee && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <UserPlus size={18} />
            Add Employee
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-surface-900/50">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <Input
                type="text"
                placeholder="Search employees..."
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
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center text-gray-500 py-8">Loading...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center text-red-500 py-8">{error}</TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center text-gray-500 py-8">No employees found.</TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{emp.user?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">
                    {emp.title || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {emp.user?.role?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.user?.accountStatus === 'active' ? 'success' : 'warning'}>
                      {emp.user?.accountStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/employees/${emp._id}`}
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm"
                    >
                      View Profile
                    </Link>
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
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={async (data) => {
          const success = await createEmployee(data);

          if (success) {
            await fetchEmployees({
              page,
              limit: 10,
              search: searchTerm,
            });
            return true;
          }

          // Throw with specific backend error so the modal can display it
          const { error: storeError } = useEmployeeStore.getState();
          throw new Error(storeError || 'Failed to create employee');
        }}
      />
    </div>
  );
};
