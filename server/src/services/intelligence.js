import { repository } from '../repositories/tenant.js';
import { scope } from './scope.js';
import { getProject, projectMembers } from './projects.js';
import { leaveScope } from './leave.js';
import { intelligenceProvider } from '../intelligence/provider.js';
import { env } from '../config/env.js';
import { assert, missing } from '../utils/errors.js';
import { id, same, taskManageable, STATUSES, PRIORITIES, overdue, utcDay } from '../utils/domain.js';
export async function analysisContext(ctx, projectId) {
  const s = await scope(ctx),
    taskQuery = projectId ? {
      $and: [s.taskQuery, {
        projectId
      }]
    } : s.taskQuery;
  if (projectId) await getProject(ctx, projectId);
  const employeeQuery = ctx.role === 'EMPLOYEE' ? {
    _id: ctx.employeeId
  } : s.employeeQuery;
  const [employees, tasks] = await Promise.all([repository(ctx, 'Employee').find({
    $and: [employeeQuery, {
      status: 'ACTIVE'
    }]
  }, {
    limit: 501
  }), repository(ctx, 'Task').find(taskQuery, {
    limit: env.ANALYSIS_TASK_LIMIT + 1
  })]);
  assert(employees.length <= 500 && tasks.length <= env.ANALYSIS_TASK_LIMIT, 413, 'The analysis limit was reached. Filter by project to analyze a smaller set.');
  const employeeIds = employees.map(x => x._id);
  const inactiveProjects = await repository(ctx, 'Project').find({
    $or: [{
      archived: true
    }, {
      status: 'CANCELLED'
    }]
  }, {
    limit: 10001,
    projection: '_id'
  });
  assert(inactiveProjects.length <= 10000, 413, 'Project history exceeds the planning analysis bound.');
  // Only scheduling fields are projected for cross-project capacity, never private work details.
  const [commitments, leaves] = await Promise.all([repository(ctx, 'Task').find({
    assigneeId: {
      $in: employeeIds
    },
    status: {
      $ne: 'DONE'
    },
    projectId: {
      $nin: inactiveProjects.map(p => p._id)
    }
  }, {
    limit: 10001,
    projection: 'assigneeId startDate dueDate remainingHours status'
  }), repository(ctx, 'LeaveRequest').find({
    employeeId: {
      $in: employeeIds
    },
    status: 'APPROVED'
  }, {
    limit: 5001,
    projection: 'employeeId startDate endDate status'
  })]);
  assert(commitments.length <= 10000 && leaves.length <= 5000, 413, 'Planning history exceeds this release’s analysis bound.');
  const provider = intelligenceProvider(),
    loads = employees.map(e => provider.workload(e, commitments, leaves, ctx.organization.settings));
  return {
    employees,
    tasks,
    projects: projectId ? s.projects.filter(p => same(p, projectId)) : s.projects,
    leaves,
    loads,
    provider,
    inactiveProjectIds: new Set(inactiveProjects.map(id))
  };
}
export async function overview(ctx, projectId) {
  const data = await analysisContext(ctx, projectId),
    {
      employees,
      tasks,
      projects,
      leaves,
      loads,
      provider
    } = data;
  const health = projects.map(p => provider.health(p, tasks, loads, leaves));
  const performance = employees.map(e => provider.performance(e, tasks, leaves, ctx.organization.settings));
  const scopedTeams = await repository(ctx, 'Team').find({
    _id: {
      $in: [...new Set(employees.map(e => id(e.teamId)).filter(Boolean))]
    }
  }, {
    limit: 500
  });
  const teams = scopedTeams.map(team => {
    const members = loads.filter(l => l.teamId === id(team)),
      capacity = members.reduce((a, l) => a + l.capacityHours, 0),
      committed = members.reduce((a, l) => a + l.committedHours, 0);
    const evidence = performance.filter(p => p.teamId === id(team) && p.score !== null),
      weight = evidence.reduce((a, p) => a + p.weightedEffort, 0);
    return {
      teamId: id(team),
      name: team.name,
      members: members.length,
      capacityHours: Math.round(capacity),
      committedHours: Math.round(committed),
      usage: capacity ? Math.round(committed / capacity * 100) : 0,
      score: weight ? Math.round(evidence.reduce((a, p) => a + p.score * p.weightedEffort, 0) / weight) : null
    };
  });
  const timeline = Array.from({
    length: 8
  }, (_, index) => {
    const end = new Date(utcDay(new Date()).getTime() + 86400000 - (7 - index) * 7 * 86400000),
      start = new Date(end.getTime() - 7 * 86400000);
    return {
      week: start.toISOString().slice(5, 10),
      completed: tasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) < end).length
    };
  });
  const totals = {
    projects: projects.length,
    activeProjects: projects.filter(p => p.status === 'ACTIVE' && !p.archived).length,
    employees: employees.length,
    tasks: tasks.length,
    completed: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => overdue(t) && !data.inactiveProjectIds.has(id(t.projectId))).length,
    overloaded: loads.filter(l => l.overloaded).length
  };
  return {
    provider: 'Explainable local rules',
    version: provider.version,
    generatedAt: new Date().toISOString(),
    totals,
    health,
    workload: loads,
    teams,
    performance,
    timeline,
    tasksByStatus: STATUSES.map(name => ({
      name,
      value: tasks.filter(t => t.status === name).length
    })),
    tasksByPriority: PRIORITIES.map(name => ({
      name,
      value: tasks.filter(t => t.priority === name).length
    })),
    deadlines: tasks.filter(t => t.status !== 'DONE' && !data.inactiveProjectIds.has(id(t.projectId))).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8),
    recognition: performance.filter(p => p.score !== null && p.score >= 80).sort((a, b) => b.score - a.score).slice(0, 3),
    scopeNote: ctx.role === 'ORGANIZATION_ADMIN' ? 'Organization-wide task metrics. Capacity includes all assignments for each visible person.' : 'Task and project metrics include work permitted to your role. Capacity uses scheduling totals across each visible person’s assignments; unrelated task details stay private.'
  };
}
export async function recommendTask(ctx, taskId) {
  const task = await repository(ctx, 'Task').get(taskId),
    project = await getProject(ctx, task.projectId);
  if (!taskManageable(ctx, project, task)) throw missing();
  const context = await analysisContext(ctx),
    members = await projectMembers(ctx, project);
  const allowed = context.employees.filter(e => members.some(m => same(m, e)) && (!task.teamId || same(task.teamId, e.teamId)));
  return {
    taskId,
    title: task.title,
    revision: task.revision,
    provider: context.provider.version,
    candidates: context.provider.assignment({
      task,
      project,
      employees: allowed,
      loads: context.loads,
      leaves: context.leaves
    }).slice(0, 10)
  };
}
export async function recommendProject(ctx, projectId) {
  const project = await getProject(ctx, projectId);
  assert(ctx.role === 'ORGANIZATION_ADMIN' || ctx.role === 'PROJECT_MANAGER' && same(project.managerId, ctx.employeeId), 403, 'Only this project’s manager may request resource planning.');
  const context = await analysisContext(ctx);
  const pseudo = {
    startDate: project.startDate,
    dueDate: project.dueDate,
    requiredSkills: project.requiredSkills,
    remainingHours: 8
  };
  const people = context.provider.assignment({
    task: pseudo,
    project,
    employees: context.employees,
    loads: context.loads,
    leaves: context.leaves
  });
  const teamRecords = await repository(ctx, 'Team').find({
    _id: {
      $in: [...new Set(context.employees.map(e => id(e.teamId)).filter(Boolean))]
    },
    archived: false
  }, {
    limit: 500
  });
  const teams = teamRecords.map(team => {
    const matches = people.filter(p => p.teamId === id(team));
    return {
      teamId: id(team),
      departmentId: id(team.departmentId),
      name: team.name,
      score: matches.length ? Math.round(matches.reduce((n, x) => n + x.score, 0) / matches.length) : 0,
      candidates: matches.length,
      explanation: 'Mean suitability of visible active team members; review individual capacity before assigning.'
    };
  }).sort((a, b) => b.score - a.score);
  const departments = await repository(ctx, 'Department').find({
    _id: {
      $in: teams.map(t => t.departmentId)
    },
    archived: false
  }, {
    limit: 500
  });
  return {
    projectId,
    revision: project.revision,
    people: people.slice(0, 10),
    teams: teams.slice(0, 10),
    departments: departments.map(d => {
      const eligible = teams.filter(t => t.departmentId === id(d));
      return {
        departmentId: id(d),
        name: d.name,
        score: Math.round(eligible.reduce((a, t) => a + t.score, 0) / (eligible.length || 1)),
        explanation: 'Mean suitability of visible teams; department is an organizational grouping.'
      };
    }).sort((a, b) => b.score - a.score)
  };
}
export async function rebalance(ctx) {
  assert(ctx.role !== 'EMPLOYEE', 403, 'Workload balancing is available to managers and team leaders.');
  const c = await analysisContext(ctx),
    suggestions = [];
  for (const load of c.loads.filter(l => l.overloaded)) {
    const tasks = c.tasks.filter(t => same(t.assigneeId, load.employeeId) && !['DONE', 'REVIEW'].includes(t.status));
    for (const task of tasks) {
      const project = c.projects.find(p => same(p, task.projectId));
      if (!project || project.archived || project.status === 'CANCELLED' || !taskManageable(ctx, project, task)) continue;
      const members = await projectMembers(ctx, project);
      const candidates = c.provider.assignment({
        task,
        project,
        employees: c.employees.filter(e => !same(e, load.employeeId) && members.some(m => same(m, e))),
        loads: c.loads,
        leaves: c.leaves
      });
      const best = candidates.find(x => x.eligible && x.freeHours >= task.remainingHours);
      if (best) suggestions.push({
        taskId: id(task),
        title: task.title,
        revision: task.revision,
        currentAssignee: load.name,
        currentUsage: load.usage,
        recommended: best
      });
      if (suggestions.length >= 10) return {
        suggestions,
        notice: 'Each suggestion is independent. Recalculate after applying a reassignment.'
      };
    }
  }
  return {
    suggestions,
    notice: 'Each suggestion is independent. Recalculate after applying a reassignment.'
  };
}
export async function analyzeLeave(ctx, recordId) {
  const allowed = await leaveScope(ctx),
    request = await repository(ctx, 'LeaveRequest').one({
      $and: [allowed, {
        _id: recordId
      }]
    });
  if (!request) throw missing();
  const c = await analysisContext(ctx),
    impact = c.provider.leaveImpact(request, c.tasks.filter(t => !c.inactiveProjectIds.has(id(t.projectId))), c.projects),
    reassignments = [];
  const membersByProject = new Map();
  for (const task of impact.affected.slice(0, 10)) {
    const project = c.projects.find(p => same(p, task.projectId));
    if (!project || !taskManageable(ctx, project, task)) continue;
    if (!membersByProject.has(id(project))) membersByProject.set(id(project), new Set((await projectMembers(ctx, project)).map(id)));
    const members = membersByProject.get(id(project));
    const employees = c.employees.filter(e => !same(e, request.employeeId) && members.has(id(e)));
    const candidates = c.provider.assignment({
      task,
      project,
      employees,
      loads: c.loads,
      leaves: c.leaves
    });
    const best = candidates.find(e => e.eligible && e.freeHours >= task.remainingHours);
    if (best) reassignments.push({
      taskId: id(task),
      title: task.title,
      revision: task.revision,
      recommended: best
    });
  }
  return {
    ...impact,
    reassignments,
    notice: impact.notice + ' Analysis covers only assignments visible to your role; other projects may have additional conflicts.'
  };
}
