import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeamStore } from '../../stores/team.store.js';
import { useEmployeeStore } from '../../stores/employee.store.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table.jsx';
import { ArrowLeft, Users2, Users, Network } from 'lucide-react';

export const TeamDetailPage = () => {
  const { id } = useParams();
  const { selectedTeam: team, isLoading, error, fetchTeamById } = useTeamStore();
  const { employees, fetchEmployees } = useEmployeeStore();

  useEffect(() => {
    if (id) {
      fetchTeamById(id);
      fetchEmployees({ limit: 100 });
    }
  }, [id, fetchTeamById, fetchEmployees]);

  // Filter employees belonging to this team
  const teamMembers = employees.filter(
    (emp) => emp.teamId?.toString() === id || emp.teamId?._id?.toString() === id
  );

  if (isLoading && !team) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!team) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Team not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/teams" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
          <ArrowLeft size={16} /> Back to Teams
        </Link>
      </div>

      {/* Team Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <Users2 size={24} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{team.description || 'No description'}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Network size={14} />
                Department: {team.departmentId?.name ? (
                  <Link to={`/departments/${team.departmentId._id}`} className="text-primary-600 hover:underline dark:text-primary-400">{team.departmentId.name}</Link>
                ) : 'Unknown'}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                Lead: {team.leaderId ? `${team.leaderId.firstName} ${team.leaderId.lastName}` : <span className="italic text-gray-400">Unassigned</span>}
              </span>
              <span>Created: {new Date(team.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Members Section */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Users size={20} /> Team Members ({teamMembers.length})
      </h2>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan="4" className="text-center text-gray-500 py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={28} className="text-gray-400" />
                    <span>No members assigned to this team yet.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              teamMembers.map((emp) => (
                <TableRow key={emp._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{emp.user?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-300">{emp.title || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="default">{emp.user?.role?.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/employees/${emp._id}`} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm">View Profile</Link>
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
