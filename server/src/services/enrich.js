import { repository } from '../repositories/tenant.js';
import { id, unique } from '../utils/domain.js';
export async function enrich(ctx, kind, items) {
  if (!items.length) return items;
  if (kind === 'Employee') {
    const [teams, departments] = await Promise.all([repository(ctx, 'Team').find({
      _id: {
        $in: unique(items.map(x => x.teamId))
      }
    }, {
      limit: 100,
      projection: 'name'
    }), repository(ctx, 'Department').find({
      _id: {
        $in: unique(items.map(x => x.departmentId))
      }
    }, {
      limit: 100,
      projection: 'name'
    })]);
    const t = new Map(teams.map(x => [id(x), x.name])),
      d = new Map(departments.map(x => [id(x), x.name]));
    return items.map(x => ({
      ...x,
      teamName: t.get(id(x.teamId)) || null,
      departmentName: d.get(id(x.departmentId)) || null
    }));
  }
  if (kind === 'Task') {
    const [projects, employees, dependencies] = await Promise.all([repository(ctx, 'Project').find({
      _id: {
        $in: unique(items.map(x => x.projectId))
      }
    }, {
      limit: 100,
      projection: 'name code'
    }), repository(ctx, 'Employee').find({
      _id: {
        $in: unique(items.map(x => x.assigneeId))
      }
    }, {
      limit: 100,
      projection: 'name'
    }), repository(ctx, 'Task').find({
      _id: {
        $in: unique(items.flatMap(x => x.dependencies))
      }
    }, {
      limit: 2000,
      projection: 'status'
    })]);
    const p = new Map(projects.map(x => [id(x), x])),
      e = new Map(employees.map(x => [id(x), x.name])),
      d = new Map(dependencies.map(x => [id(x), x.status]));
    return items.map(x => ({
      ...x,
      projectName: p.get(id(x.projectId))?.name,
      projectCode: p.get(id(x.projectId))?.code,
      assigneeName: e.get(id(x.assigneeId)) || null,
      blocked: Boolean(x.blockedReason) || x.dependencies.some(dep => d.get(id(dep)) !== 'DONE')
    }));
  }
  if (kind === 'Activity') {
    const employees = await repository(ctx, 'Employee').find({
      userId: {
        $in: unique(items.map(x => x.actorId))
      }
    }, {
      limit: 100,
      projection: 'userId name'
    });
    const names = new Map(employees.map(x => [id(x.userId), x.name]));
    return items.map(x => ({
      ...x,
      actorName: names.get(id(x.actorId)) || 'Organization member'
    }));
  }
  return items;
}
