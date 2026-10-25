import { repository } from '../repositories/tenant.js';
import { identity } from '../repositories/identity.js';
import { tenantTransaction } from '../config/database.js';
import { scopeQuery } from './scope.js';
import { issueActionToken } from './auth.js';
import { activity } from './notifications.js';
import { assert, missing } from '../utils/errors.js';
import { id, same } from '../utils/domain.js';
import { enrich } from './enrich.js';
const fields = {
  Employee: ['name', 'email', 'jobTitle'],
  Department: ['name', 'description'],
  Team: ['name', 'description'],
  Project: ['name', 'code'],
  Task: ['title'],
  Notification: ['title', 'message'],
  Activity: ['summary']
};
export async function listResources(ctx, kind, query) {
  const scope = await scopeQuery(ctx, kind);
  const filters = {};
  const searchable = fields[kind];
  if (query.q && searchable) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = searchable.map(field => ({
      [field]: {
        $regex: escaped,
        $options: 'i'
      }
    }));
  }
  const allowed = {
    Employee: ['role', 'status', 'teamId', 'departmentId'],
    Team: ['departmentId', 'archived'],
    Department: ['archived'],
    Project: ['status', 'priority', 'managerId', 'teamId', 'archived'],
    Task: ['status', 'priority', 'projectId', 'assigneeId', 'teamId']
  };
  for (const key of allowed[kind] || []) if (query[key] !== undefined) filters[kind === 'Project' && key === 'teamId' ? 'teamIds' : key] = key === 'archived' ? query[key] === 'true' : query[key];
  const sortable = {
    Employee: ['name', 'createdAt', 'status'],
    Team: ['name', 'createdAt'],
    Department: ['name', 'createdAt'],
    Project: ['name', 'createdAt', 'dueDate', 'status', 'priority'],
    Task: ['title', 'createdAt', 'dueDate', 'priority', 'status']
  };
  const sort = (sortable[kind] || ['createdAt']).includes(query.sort) ? query.sort : 'createdAt';
  const filter = {
      $and: [scope, filters]
    },
    repo = repository(ctx, kind);
  const [items, total] = await Promise.all([repo.find(filter, {
    limit: query.limit,
    skip: (query.page - 1) * query.limit,
    sort: {
      [sort]: query.order === 'asc' ? 1 : -1,
      _id: 1
    }
  }), repo.count(filter)]);
  return {
    items: await enrich(ctx, kind, items),
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.ceil(total / query.limit)
  };
}
export async function getResource(ctx, kind, recordId) {
  const scope = await scopeQuery(ctx, kind),
    record = await repository(ctx, kind).one({
      $and: [scope, {
        _id: recordId
      }]
    });
  if (!record) throw missing();
  return (await enrich(ctx, kind, [record]))[0];
}
export async function requireEmployee(ctx, employeeId, session, roles) {
  if (!employeeId) return null;
  const employee = await repository(ctx, 'Employee', session).get(employeeId);
  assert(employee.status === 'ACTIVE', 422, 'Choose an active employee.');
  assert(!roles || roles.includes(employee.role), 422, 'The selected employee does not have the required role.');
  return employee;
}
export async function requireActive(ctx, kind, recordId, session) {
  if (!recordId) return null;
  const record = await repository(ctx, kind, session).get(recordId);
  assert(!record.archived, 422, `Choose an active ${kind.toLowerCase()}.`);
  return record;
}
async function validateEmployee(ctx, data, session, recordId) {
  const team = await requireActive(ctx, 'Team', data.teamId, session);
  await requireActive(ctx, 'Department', data.departmentId, session);
  assert(!team || same(team.departmentId, data.departmentId), 422, 'The selected team belongs to a different department.');
  if (data.reportsToId) {
    assert(!same(data.reportsToId, recordId), 422, 'An employee cannot report to themselves.');
    const manager = await requireEmployee(ctx, data.reportsToId, session, ['ORGANIZATION_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEADER']);
    const rank = {
      ORGANIZATION_ADMIN: 4,
      PROJECT_MANAGER: 3,
      TEAM_LEADER: 2,
      EMPLOYEE: 1
    };
    assert(rank[manager.role] > rank[data.role], 422, 'Choose a reporting manager with a higher organizational role.');
  }
}
export async function createEmployee(ctx, data) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the organization administrator can invite employees.');
  return tenantTransaction(ctx, async session => {
    await validateEmployee(ctx, data, session);
    const user = await identity.createUser({
      organizationId: ctx.organizationId,
      email: data.email,
      name: data.name,
      role: data.role
    }, session);
    const hoursPerWeek = data.hoursPerWeek ?? Math.min(80, ctx.organization.settings.hoursPerDay * ctx.organization.settings.workingDays.length);
    const employee = await repository(ctx, 'Employee', session).create({
      ...data,
      hoursPerWeek,
      userId: user._id
    });
    await issueActionToken(user, 'INVITATION', session);
    await activity(ctx, 'Employee invited', 'Employee', employee, session);
    return employee;
  });
}
async function verifyResponsibilities(ctx, employee, next, session) {
  const empId = id(employee),
    disabled = next.status === 'DISABLED';
  const changedTeam = !same(next.teamId, employee.teamId);
  if (disabled || changedTeam) assert(!(await repository(ctx, 'Task', session).count({
    assigneeId: empId,
    status: {
      $ne: 'DONE'
    }
  })), 409, 'Reassign this employee’s unfinished tasks before changing their team or disabling access.');
  if (disabled || next.role !== 'PROJECT_MANAGER') assert(!(await repository(ctx, 'Project', session).count({
    managerId: empId,
    archived: false
  })), 409, 'Assign another project manager first.');
  if (disabled || changedTeam || next.role !== 'TEAM_LEADER') assert(!(await repository(ctx, 'Team', session).count({
    leaderId: empId,
    archived: false
  })), 409, 'Assign another team leader first.');
  if (disabled) {
    assert(!(await repository(ctx, 'Department', session).count({
      headId: empId,
      archived: false
    })), 409, 'Assign another department head first.');
    assert(!(await repository(ctx, 'Employee', session).count({
      reportsToId: empId,
      status: {
        $ne: 'DISABLED'
      }
    })), 409, 'Update this manager’s direct reports first.');
    assert(!(await repository(ctx, 'LeaveRequest', session).count({
      employeeId: empId,
      status: 'PENDING'
    })), 409, 'Resolve pending leave requests first.');
    assert(!same(ctx.organization.leaveDelegateId, empId), 409, 'Change the leave approval delegate first.');
  }
  if (next.role !== employee.role) {
    const reports = await repository(ctx, 'Employee', session).count({
      reportsToId: empId,
      status: {
        $ne: 'DISABLED'
      }
    });
    assert(!reports, 409, 'Update direct reporting relationships before changing this role.');
    assert(!same(ctx.organization.leaveDelegateId, empId) || next.role === 'PROJECT_MANAGER', 409, 'The leave delegate must remain a project manager.');
  }
}
export async function updateEmployee(ctx, recordId, data) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the organization administrator can change employee records.');
  return tenantTransaction(ctx, async session => {
    const repo = repository(ctx, 'Employee', session),
      current = await repo.get(recordId);
    assert(data.revision === current.revision, 409, 'This employee changed. Refresh and try again.');
    assert(current.role !== 'ORGANIZATION_ADMIN' || !data.role && !data.status, 422, 'Use administrator transfer to change the organization administrator.');
    const {
        revision,
        ...changes
      } = data,
      next = {
        ...current,
        ...changes
      };
    await validateEmployee(ctx, next, session, recordId);
    await verifyResponsibilities(ctx, current, next, session);
    if (changes.status === 'ACTIVE') {
      const user = await identity.userByEmail(current.email, session);
      if (!user.passwordHash) changes.status = 'INVITED';
    }
    const result = await repo.patch(recordId, revision, changes);
    await identity.updateUser(current.userId, {
      name: result.name,
      role: result.role,
      status: result.status
    }, session);
    if (changes.status || changes.role) {
      await identity.revoke(current.userId, session);
      await identity.clearTokens(current.userId, 'RESET', session);
    }
    if (result.status === 'DISABLED') await identity.clearTokens(current.userId, 'INVITATION', session);
    await activity(ctx, 'Employee updated', 'Employee', result, session);
    return result;
  });
}
export async function resendInvitation(ctx, recordId) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the organization administrator can resend invitations.');
  return tenantTransaction(ctx, async session => {
    const employee = await repository(ctx, 'Employee', session).get(recordId);
    assert(employee.status === 'INVITED', 409, 'This employee does not have a pending invitation.');
    const user = await identity.userById(employee.userId, session);
    await issueActionToken(user, 'INVITATION', session);
    return {
      message: 'A new invitation has been queued.'
    };
  });
}
export async function saveStructure(ctx, kind, recordId, data) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the organization administrator can change organization structure.');
  assert(['Department', 'Team'].includes(kind), 500, 'Invalid structure type.');
  return tenantTransaction(ctx, async session => {
    const repo = repository(ctx, kind, session),
      previous = recordId ? await repo.get(recordId) : null;
    const {
        revision,
        ...changes
      } = data,
      next = {
        ...previous,
        ...changes
      };
    if (kind === 'Department') await requireEmployee(ctx, next.headId, session);
    if (kind === 'Team') {
      await requireActive(ctx, 'Department', next.departmentId, session);
      const leader = await requireEmployee(ctx, next.leaderId, session, ['TEAM_LEADER']);
      assert(!leader || recordId && same(leader.teamId, recordId), 422, 'Create the team, move the leader into it, then select that leader.');
      if (previous && !same(previous.departmentId, next.departmentId)) assert(!(await repository(ctx, 'Employee', session).count({
        teamId: recordId,
        status: {
          $ne: 'DISABLED'
        }
      })), 409, 'Move team members before changing the team’s department.');
    }
    if (next.archived && !previous?.archived) {
      assert(recordId, 422, 'Create an active record first.');
      const dependentEmployees = await repository(ctx, 'Employee', session).count({
        [kind === 'Team' ? 'teamId' : 'departmentId']: recordId,
        status: {
          $ne: 'DISABLED'
        }
      });
      assert(!dependentEmployees, 409, 'Move active employees before archiving.');
      if (kind === 'Department') assert(!(await repository(ctx, 'Team', session).count({
        departmentId: recordId,
        archived: false
      })), 409, 'Move or archive dependent teams first.');
      if (kind === 'Team') assert(!(await repository(ctx, 'Project', session).count({
        teamIds: recordId,
        archived: false
      })), 409, 'Remove this team from active project records first.');
    }
    const record = recordId ? await repo.patch(recordId, revision, changes) : await repo.create(changes);
    await activity(ctx, `${kind} ${recordId ? 'updated' : 'created'}`, kind, record, session);
    return record;
  });
}
