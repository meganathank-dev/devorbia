export const label = value => (value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase());
export const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : '';
export const today = () => dateInput(new Date());
export const date = value => value ? new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
}).format(new Date(value)) : '—';
export const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
export const humanTime = value => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit'
}).format(new Date(value));
export const overdue = task => task.status !== 'DONE' && new Date(`${dateInput(task.dueDate)}T23:59:59.999Z`) < new Date();
export const taskStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const projectStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
export const peopleRoles = ['PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];
export const csvTags = value => value.split(',').map(x => x.trim()).filter(Boolean);
