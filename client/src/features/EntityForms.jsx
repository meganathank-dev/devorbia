import { useState } from 'react';
import { Modal, Button, Field, Select, RecordSelect, ErrorBox } from '../components/ui';
import { useMutation } from '../hooks/useMutation';
import { useAuth } from '../stores/app';
import { dateInput, today, csvTags, peopleRoles, projectStatuses, priorities } from '../utils/format';
const textChange = (set, key) => event => set(s => ({
  ...s,
  [key]: event.target.value
}));
function Actions({
  busy,
  onClose,
  label = 'Save changes'
}) {
  return <div className="modal-actions"><Button type="button" variant="subtle" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>{label}</Button></div>;
}
export function EmployeeForm({
  record,
  onClose
}) {
  const [form, set] = useState({
    name: record?.name || '',
    email: record?.email || '',
    jobTitle: record?.jobTitle || '',
    role: record?.role || 'EMPLOYEE',
    departmentId: record?.departmentId || null,
    teamId: record?.teamId || null,
    reportsToId: record?.reportsToId || null,
    skills: record?.skills?.join(', ') || '',
    experienceYears: record?.experienceYears || 0,
    hoursPerWeek: record?.hoursPerWeek ?? '',
    joiningDate: dateInput(record?.joiningDate) || today()
  });
  const mutation = useMutation(onClose),
    setValue = (key, value) => set(s => ({
      ...s,
      [key]: value
    }));
  async function submit(e) {
    e.preventDefault();
    const data = {
      ...form,
      skills: csvTags(form.skills),
      experienceYears: Number(form.experienceYears),
      hoursPerWeek: form.hoursPerWeek === '' ? undefined : Number(form.hoursPerWeek)
    };
    if (record) {
      delete data.email;
      data.revision = record.revision;
      if (record.role === 'ORGANIZATION_ADMIN') delete data.role;
    }
    await mutation.save(record ? 'patch' : 'post', `/employees${record ? `/${record._id}` : ''}`, data, record ? 'Employee updated.' : 'Invitation queued.');
  }
  return <Modal title={record ? 'Edit employee' : 'Invite a team member'} onClose={onClose} wide busy={mutation.busy}><form onSubmit={submit}><div className="modal-body"><ErrorBox error={mutation.error} /><div className="form-grid"><Field label="Full name"><input required maxLength={100} value={form.name} onChange={textChange(set, 'name')} /></Field><Field label="Work email"><input type="email" required disabled={Boolean(record)} value={form.email} onChange={textChange(set, 'email')} /></Field><Field label="Job title"><input value={form.jobTitle} maxLength={120} onChange={textChange(set, 'jobTitle')} /></Field>{record?.role !== 'ORGANIZATION_ADMIN' && <Field label="Access role"><Select value={form.role} options={peopleRoles} onChange={textChange(set, 'role')} /></Field>}<Field label="Department"><RecordSelect resource="departments" filters={{
              archived: 'false'
            }} value={form.departmentId} onChange={value => set(s => ({
              ...s,
              departmentId: value,
              teamId: null
            }))} /></Field><Field label="Team"><RecordSelect resource="teams" filters={{
              departmentId: form.departmentId || undefined,
              archived: 'false'
            }} value={form.teamId} onChange={value => setValue('teamId', value)} /></Field><Field label="Reports to" hint="Choose a manager with a higher access role."><RecordSelect resource="employees" filters={{
              status: 'ACTIVE'
            }} value={form.reportsToId} onChange={value => setValue('reportsToId', value)} /></Field><Field label="Joining date"><input required type="date" value={form.joiningDate} onChange={textChange(set, 'joiningDate')} /></Field><Field label="Experience in years"><input type="number" min={0} max={60} step="0.5" required value={form.experienceYears} onChange={textChange(set, 'experienceYears')} /></Field><Field label="Weekly capacity (hours)" hint="Leave blank to use organization working hours for a new employee."><input type="number" min={1} max={80} placeholder="Organization default" value={form.hoursPerWeek} onChange={textChange(set, 'hoursPerWeek')} /></Field><Field label="Skills" hint="Separate skills with commas, for example React, Node.js, MongoDB." className="span-2"><input value={form.skills} onChange={textChange(set, 'skills')} /></Field></div>{!record && <div className="info-box">The new member will receive a single-use invitation to choose their password.</div>}</div><Actions busy={mutation.busy} onClose={onClose} label={record ? 'Save employee' : 'Send invitation'} /></form></Modal>;
}
export function StructureForm({
  kind,
  record,
  onClose
}) {
  const team = kind === 'teams';
  const [form, set] = useState({
    name: record?.name || '',
    description: record?.description || '',
    ...(team ? {
      departmentId: record?.departmentId || null,
      leaderId: record?.leaderId || null
    } : {
      headId: record?.headId || null
    })
  });
  const mutation = useMutation(onClose);
  async function submit(e) {
    e.preventDefault();
    await mutation.save(record ? 'patch' : 'post', `/${kind}${record ? `/${record._id}` : ''}`, {
      ...form,
      ...(record ? {
        revision: record.revision
      } : {})
    });
  }
  return <Modal title={`${record ? 'Edit' : 'Create'} ${team ? 'team' : 'department'}`} onClose={onClose} busy={mutation.busy}><form onSubmit={submit}><div className="modal-body"><ErrorBox error={mutation.error} /><Field label="Name"><input value={form.name} onChange={textChange(set, 'name')} minLength={2} maxLength={100} required /></Field><Field label="Description"><textarea value={form.description} maxLength={2000} onChange={textChange(set, 'description')} /></Field>{team ? <><Field label="Department"><RecordSelect resource="departments" filters={{
              archived: 'false'
            }} value={form.departmentId} onChange={value => set(s => ({
              ...s,
              departmentId: value
            }))} /></Field><Field label="Team leader" hint="First create the team and assign an active team leader to it from People."><RecordSelect resource="employees" filters={{
              role: 'TEAM_LEADER',
              status: 'ACTIVE',
              teamId: record?._id
            }} disabled={!record} value={form.leaderId} onChange={value => set(s => ({
              ...s,
              leaderId: value
            }))} /></Field></> : <Field label="Department head"><RecordSelect resource="employees" filters={{
            status: 'ACTIVE'
          }} value={form.headId} onChange={value => set(s => ({
            ...s,
            headId: value
          }))} /></Field>}</div><Actions busy={mutation.busy} onClose={onClose} /></form></Modal>;
}
export function ProjectForm({
  record,
  onClose
}) {
  const user = useAuth(s => s.user);
  const [form, set] = useState({
    name: record?.name || '',
    code: record?.code || '',
    description: record?.description || '',
    managerId: record?.managerId || (user.role === 'PROJECT_MANAGER' ? user.employeeId : null),
    teamIds: record?.teamIds || [],
    memberIds: record?.memberIds || [],
    startDate: dateInput(record?.startDate) || today(),
    dueDate: dateInput(record?.dueDate) || '',
    priority: record?.priority || 'MEDIUM',
    status: record?.status || 'PLANNING',
    requiredSkills: record?.requiredSkills?.join(', ') || '',
    tags: record?.tags?.join(', ') || ''
  });
  const mutation = useMutation(onClose),
    setValue = (key, value) => set(s => ({
      ...s,
      [key]: value
    }));
  async function submit(e) {
    e.preventDefault();
    const data = {
      ...form,
      requiredSkills: csvTags(form.requiredSkills),
      tags: csvTags(form.tags),
      ...(record ? {
        revision: record.revision
      } : {})
    };
    await mutation.save(record ? 'patch' : 'post', `/projects${record ? `/${record._id}` : ''}`, data, record ? 'Project updated.' : 'Project created.');
  }
  return <Modal title={record ? 'Edit project' : 'Create a project'} onClose={onClose} wide busy={mutation.busy}><form onSubmit={submit}><div className="modal-body"><ErrorBox error={mutation.error} /><div className="form-grid"><Field label="Project name"><input value={form.name} required minLength={2} maxLength={150} onChange={textChange(set, 'name')} /></Field><Field label="Project code" hint="2–20 letters, numbers or hyphens, beginning with a letter."><input value={form.code} required pattern="[A-Za-z][A-Za-z0-9-]{1,19}" onChange={textChange(set, 'code')} /></Field><Field label="Description" className="span-2"><textarea value={form.description} maxLength={5000} onChange={textChange(set, 'description')} /></Field><Field label="Project manager"><RecordSelect resource="employees" filters={{
              role: 'PROJECT_MANAGER',
              status: 'ACTIVE'
            }} value={form.managerId} disabled={user.role === 'PROJECT_MANAGER'} onChange={value => setValue('managerId', value)} /></Field><Field label="Priority"><Select value={form.priority} options={priorities} onChange={textChange(set, 'priority')} /></Field><Field label="Start date"><input type="date" required value={form.startDate} onChange={textChange(set, 'startDate')} /></Field><Field label="Deadline"><input type="date" required min={form.startDate} value={form.dueDate} onChange={textChange(set, 'dueDate')} /></Field><Field label="Assigned teams"><RecordSelect multiple resource="teams" filters={{
              archived: 'false'
            }} value={form.teamIds} onChange={value => setValue('teamIds', value)} /></Field><Field label="Additional members"><RecordSelect multiple resource="employees" filters={{
              status: 'ACTIVE'
            }} value={form.memberIds} onChange={value => setValue('memberIds', value)} /></Field><Field label="Required skills"><input value={form.requiredSkills} placeholder="React, Node.js, MongoDB" onChange={textChange(set, 'requiredSkills')} /></Field><Field label="Tags"><input value={form.tags} placeholder="Customer platform, Q4" onChange={textChange(set, 'tags')} /></Field><Field label="Project status"><Select value={form.status} options={record ? projectStatuses : projectStatuses.slice(0, 3)} onChange={textChange(set, 'status')} /></Field></div><div className="info-box">Project completion requires all tasks to be reviewed and done. Assigned team members join the project automatically.</div></div><Actions busy={mutation.busy} onClose={onClose} label={record ? 'Save project' : 'Create project'} /></form></Modal>;
}
