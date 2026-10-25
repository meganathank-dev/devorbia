import { repository } from '../repositories/tenant.js';
import { id, unique } from '../utils/domain.js';
import { assert } from '../utils/errors.js';
export const projectQuery = ctx => ctx.role === 'ORGANIZATION_ADMIN' ? {} : {
  $or: [{
    managerId: ctx.employeeId
  }, {
    memberIds: ctx.employeeId
  }, {
    teamIds: {
      $in: ctx.teamIds
    }
  }]
};
export async function scope(ctx, session) {
  const projects = await repository(ctx, 'Project', session).find(projectQuery(ctx), {
    limit: 501
  });
  assert(projects.length <= 500, 413, 'Narrow your workspace. Analysis supports up to 500 visible projects.');
  const projectIds = projects.map(id);
  const managed = projects.filter(p => ctx.role === 'ORGANIZATION_ADMIN' || ctx.role === 'PROJECT_MANAGER' && id(p.managerId) === ctx.employeeId).map(id);
  const taskQuery = ctx.role === 'ORGANIZATION_ADMIN' ? {} : {
    $or: [{
      assigneeId: ctx.employeeId
    }, {
      projectId: {
        $in: managed
      }
    }, ...(ctx.role === 'TEAM_LEADER' ? [{
      projectId: {
        $in: projectIds
      },
      teamId: {
        $in: ctx.ledTeamIds
      }
    }] : [])]
  };
  const teamIds = unique([...ctx.teamIds, ...(ctx.role === 'PROJECT_MANAGER' ? projects.flatMap(p => p.teamIds) : [])]);
  const memberIds = unique([ctx.employeeId, ...(ctx.role === 'PROJECT_MANAGER' ? projects.flatMap(p => [p.managerId, ...p.memberIds]) : [])]);
  const employeeQuery = ctx.role === 'ORGANIZATION_ADMIN' ? {} : {
    $or: [{
      _id: {
        $in: memberIds
      }
    }, {
      teamId: {
        $in: teamIds
      }
    }]
  };
  return {
    projects,
    projectIds,
    managed,
    taskQuery,
    employeeQuery,
    teamIds
  };
}
export async function scopeQuery(ctx, kind, session) {
  if (kind === 'Notification') return {
    userId: ctx.userId
  };
  if (kind === 'Activity') {
    assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Organization administrators can view the activity log.');
    return {};
  }
  if (ctx.role === 'ORGANIZATION_ADMIN') return {};
  if (kind === 'Project') return projectQuery(ctx);
  const s = await scope(ctx, session);
  if (kind === 'Task') return s.taskQuery;
  if (kind === 'Employee') return s.employeeQuery;
  if (kind === 'Team') return ctx.role === 'ORGANIZATION_ADMIN' ? {} : {
    _id: {
      $in: s.teamIds
    }
  };
  if (kind === 'Department') {
    if (ctx.role === 'ORGANIZATION_ADMIN') return {};
    const teams = await repository(ctx, 'Team', session).find({
      _id: {
        $in: s.teamIds
      }
    }, {
      limit: 501
    });
    return {
      _id: {
        $in: unique([ctx.employee.departmentId, ...teams.map(t => t.departmentId)])
      }
    };
  }
  return {};
}
