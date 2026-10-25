import { id, same, utcDay, dayEnd, overlap, overdue } from '../utils/domain.js';
export const VERSION = 'rules-1.0';
const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const round = n => Math.round(n * 10) / 10;
const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const add = (d, n) => new Date(utcDay(d).getTime() + n * 86400000);
export function calendarDates(start, end, workingDays = [1, 2, 3, 4, 5]) {
  const out = [];
  for (let d = utcDay(start); d <= utcDay(end); d = add(d, 1)) if (workingDays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  return out;
}
export function workloadFor(employee, tasks, leaves, settings, now = new Date()) {
  const start = utcDay(now),
    end = add(start, 13),
    workingDays = settings.workingDays || [1, 2, 3, 4, 5];
  const dates = calendarDates(start, end, workingDays);
  const absences = leaves.filter(l => same(l.employeeId, employee) && l.status === 'APPROVED');
  const availableDates = dates.filter(d => !absences.some(l => overlap(d, d, l.startDate, l.endDate)));
  const perDay = employee.hoursPerWeek / workingDays.length,
    capacityHours = availableDates.length * perDay;
  let committedHours = 0;
  for (const task of tasks.filter(t => same(t.assigneeId, employee) && t.status !== 'DONE')) {
    if (new Date(task.startDate) > end) continue;
    if (dayEnd(task.dueDate) < start) {
      committedHours += task.remainingHours;
      continue;
    }
    const taskStart = new Date(task.startDate) > start ? utcDay(task.startDate) : start;
    const plannedDays = calendarDates(taskStart, task.dueDate, workingDays);
    const horizonDays = plannedDays.filter(d => new Date(d) <= end);
    // Weekend-only work is conservatively charged in full if due in the horizon.
    const share = plannedDays.length ? horizonDays.length / plannedDays.length : new Date(task.dueDate) <= end ? 1 : 0;
    committedHours += task.remainingHours * share;
  }
  const usage = capacityHours ? committedHours / capacityHours * 100 : committedHours ? 100 : 0;
  return {
    employeeId: id(employee),
    name: employee.name,
    teamId: id(employee.teamId),
    capacityHours: round(capacityHours),
    committedHours: round(committedHours),
    freeHours: round(Math.max(0, capacityHours - committedHours)),
    usage: Math.round(usage),
    overloaded: committedHours > capacityHours,
    unavailable: capacityHours === 0,
    leaveDays: dates.length - availableDates.length,
    horizonStart: start.toISOString().slice(0, 10),
    horizonEnd: end.toISOString().slice(0, 10)
  };
}
export function assignmentCandidates({
  task,
  project,
  employees,
  loads,
  leaves,
  now = new Date()
}) {
  const skills = (task.requiredSkills || project.requiredSkills || []).map(x => x.toLowerCase());
  return employees.filter(e => e.status === 'ACTIVE' && (!task.teamId || same(e.teamId, task.teamId))).map(employee => {
    const load = loads.find(l => l.employeeId === id(employee)) || {
      usage: 0,
      freeHours: 0,
      capacityHours: 0
    };
    const matched = skills.filter(s => (employee.skills || []).some(x => x.toLowerCase() === s));
    const conflicts = leaves.filter(l => l.status === 'APPROVED' && same(l.employeeId, employee) && overlap(task.startDate, task.dueDate, l.startDate, l.endDate));
    const skill = skills.length ? matched.length / skills.length : 0.5;
    const familiar = same(project.managerId, employee) || project.memberIds.some(x => same(x, employee)) || project.teamIds.some(x => same(x, employee.teamId));
    const fit = dayEnd(task.dueDate) >= now && load.freeHours >= task.remainingHours;
    const factors = {
      skills: Math.round(skill * 30),
      availability: conflicts.length ? 0 : 20,
      workload: Math.round(clamp(1 - load.usage / 100, 0, 1) * 20),
      experience: Math.round(clamp(employee.experienceYears / 5, 0, 1) * 15),
      familiarity: familiar ? 10 : 0,
      deadlineFit: fit ? 5 : 0
    };
    const warnings = [];
    if (conflicts.length) warnings.push('Approved leave overlaps this work window.');
    if (load.freeHours < task.remainingHours) warnings.push('Estimated remaining work exceeds free capacity in the next 14 days.');
    if (!skills.length) warnings.push('No required skills supplied; skill match uses a neutral score.');
    if (dayEnd(task.dueDate) < now) warnings.push('The deadline has passed; review the delivery plan.');
    if (!load.capacityHours) warnings.push('No available capacity in the current planning horizon.');
    return {
      employeeId: id(employee),
      name: employee.name,
      teamId: id(employee.teamId),
      score: Object.values(factors).reduce((a, b) => a + b, 0),
      factors,
      workload: load.usage,
      freeHours: load.freeHours,
      matchedSkills: matched,
      warnings,
      reasons: [`${matched.length}/${skills.length || 0} required skills match.`, `${load.freeHours} hours free in the next 14 days.`, `${employee.experienceYears} years of recorded experience.`, familiar ? 'Already belongs to this project.' : 'New to this project.'],
      eligible: load.capacityHours > 0 && !conflicts.length
    };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.name.localeCompare(b.name));
}
export function healthFor(project, tasks, loads, leaves = [], now = new Date()) {
  const work = tasks.filter(t => same(t.projectId, project)),
    open = work.filter(t => t.status !== 'DONE'),
    done = work.length - open.length;
  const late = open.filter(t => overdue(t, now)),
    criticalLate = late.filter(t => ['HIGH', 'CRITICAL'].includes(t.priority));
  const blocked = open.filter(t => t.blockedReason || t.dependencies?.some(d => work.find(x => same(x, d))?.status !== 'DONE'));
  const assigned = new Set(open.map(t => id(t.assigneeId)).filter(Boolean));
  const overloaded = loads.filter(l => assigned.has(l.employeeId) && l.overloaded);
  const daysLeft = Math.ceil((dayEnd(project.dueDate) - now) / 86400000);
  if (project.archived || project.status === 'CANCELLED') return {
    projectId: id(project),
    name: project.name,
    score: null,
    level: 'INACTIVE',
    progress: work.length ? Math.round(done / work.length * 100) : 0,
    total: work.length,
    done,
    overdue: 0,
    blocked: 0,
    daysLeft,
    reasons: ['This project is archived or cancelled; active delivery risk is not evaluated.']
  };
  const absenceConflicts = open.filter(t => leaves.some(l => l.status === 'APPROVED' && same(l.employeeId, t.assigneeId) && overlap(t.startDate, t.dueDate, l.startDate, l.endDate)));
  if (!work.length) return {
    projectId: id(project),
    name: project.name,
    score: null,
    level: 'NOT_ENOUGH_DATA',
    progress: 0,
    total: 0,
    done: 0,
    overdue: 0,
    blocked: 0,
    daysLeft,
    reasons: ['Add tasks to establish measurable project health.']
  };
  let score = 100 - late.length / work.length * 30 - blocked.length / work.length * 20 - (criticalLate.length ? 15 : 0) - (overloaded.length ? 15 : 0) - absenceConflicts.length / work.length * 10;
  if (open.length && daysLeft < 0) score -= 30;else if (open.length && daysLeft <= 7) score -= Math.min(20, open.length / work.length * 20);
  score = Math.round(clamp(score));
  const reasons = [];
  if (late.length) reasons.push(`${late.length} unfinished task(s) are overdue.`);
  if (criticalLate.length) reasons.push(`${criticalLate.length} overdue task(s) have high or critical priority.`);
  if (blocked.length) reasons.push(`${blocked.length} task(s) have unresolved blockers or dependencies.`);
  if (overloaded.length) reasons.push(`${overloaded.length} contributor(s) exceed available capacity.`);
  if (absenceConflicts.length) reasons.push(`${absenceConflicts.length} task window(s) overlap approved leave.`);
  if (open.length && daysLeft <= 7) reasons.push(daysLeft < 0 ? 'The project deadline has passed.' : `The deadline is ${daysLeft} day(s) away with unfinished work.`);
  if (!reasons.length) reasons.push('No current deadline, dependency, or capacity warning in the visible work.');
  return {
    projectId: id(project),
    name: project.name,
    score,
    level: score >= 80 ? 'HEALTHY' : score >= 55 ? 'NEEDS_ATTENTION' : 'HIGH_RISK',
    progress: Math.round(done / work.length * 100),
    total: work.length,
    done,
    overdue: late.length,
    blocked: blocked.length,
    daysLeft,
    reasons
  };
}
function adjustedDue(task, leaves, workingDays) {
  const dates = new Set();
  for (const leave of leaves.filter(l => l.status === 'APPROVED' && same(l.employeeId, task.completedAssigneeId || task.assigneeId) && overlap(task.startDate, task.dueDate, l.startDate, l.endDate))) {
    const a = new Date(leave.startDate) > new Date(task.startDate) ? leave.startDate : task.startDate;
    const b = new Date(leave.endDate) < new Date(task.dueDate) ? leave.endDate : task.dueDate;
    for (const d of calendarDates(a, b, workingDays)) dates.add(d);
  }
  let end = utcDay(task.dueDate),
    remaining = dates.size;
  while (remaining > 0) {
    end = add(end, 1);
    if (workingDays.includes(end.getUTCDay())) remaining--;
  }
  return dayEnd(end);
}
function performancePeriod(employee, tasks, leaves, settings, start, end) {
  const done = tasks.filter(t => t.status === 'DONE' && same(t.completedAssigneeId || t.assigneeId, employee) && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) < end);
  const weight = t => Math.max(.25, t.estimatedHours) * (t.complexity || 1);
  const total = done.reduce((n, t) => n + weight(t), 0);
  const onTime = done.filter(t => new Date(t.completedAt) <= adjustedDue(t, leaves, settings.workingDays));
  const clean = done.filter(t => !t.reopenedCount);
  const onTimeRate = total ? onTime.reduce((n, t) => n + weight(t), 0) / total : 0;
  const firstPassRate = total ? clean.reduce((n, t) => n + weight(t), 0) / total : 0;
  return {
    completed: done.length,
    completedHours: round(done.reduce((n, t) => n + t.estimatedHours, 0)),
    weightedEffort: round(total),
    onTimeRate: Math.round(onTimeRate * 100),
    firstPassRate: Math.round(firstPassRate * 100),
    score: done.length >= 3 ? Math.round((.7 * onTimeRate + .3 * firstPassRate) * 100) : null
  };
}
export function performanceFor(employee, tasks, leaves, settings, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const current = performancePeriod(employee, tasks, leaves, settings, start, end),
    previous = performancePeriod(employee, tasks, leaves, settings, previousStart, start);
  return {
    employeeId: id(employee),
    name: employee.name,
    teamId: id(employee.teamId),
    role: employee.role,
    ...current,
    previousScore: previous.score,
    improvement: current.score !== null && previous.score !== null ? current.score - previous.score : null,
    explanation: current.score === null ? 'At least 3 completed tasks in this month are needed for a recognition score.' : '70% adjusted on-time delivery + 30% completion without reopening, weighted by estimated effort × complexity. Approved leave extends the evaluation deadline; leave days never subtract points.'
  };
}
export function leaveImpactFor(request, tasks, projects, now = new Date()) {
  const affected = tasks.filter(t => same(t.assigneeId, request.employeeId) && t.status !== 'DONE' && (overlap(t.startDate, t.dueDate, request.startDate, request.endDate) || overdue(t, now)));
  const deadlineConflicts = affected.filter(t => overlap(t.dueDate, t.dueDate, request.startDate, request.endDate));
  const critical = affected.filter(t => ['HIGH', 'CRITICAL'].includes(t.priority));
  const projectConflicts = projects.filter(p => affected.some(t => same(t.projectId, p)) && overlap(p.dueDate, p.dueDate, request.startDate, request.endDate));
  const downstream = tasks.filter(t => t.status !== 'DONE' && t.dependencies?.some(dep => affected.some(a => same(a, dep))));
  return {
    level: critical.length || projectConflicts.length ? 'HIGH' : affected.length ? 'MEDIUM' : 'LOW',
    affected,
    deadlineConflicts: deadlineConflicts.length,
    critical: critical.length,
    projectConflicts: projectConflicts.length,
    downstream: downstream.length,
    reasons: [`${affected.length} unfinished task(s) overlap the leave period or are overdue.`, `${deadlineConflicts.length} task deadline(s) fall during leave.`, `${projectConflicts.length} project deadline(s) fall during leave.`, `${downstream.length} visible task(s) depend on affected work.`],
    notice: 'Impact is planning guidance. An authorized human decides leave and any reassignment.'
  };
}
export const workingDayLabels = settings => settings.workingDays.map(n => labels[n]);
