import { useState } from 'react';
import { BrainCircuit, Check, RotateCcw } from 'lucide-react';
import { Modal, Button, Field, Select, RecordSelect, ErrorBox, Loading, Badge } from '../components/ui';
import { useData } from '../hooks/useData';
import { useMutation } from '../hooks/useMutation';
import { useAuth } from '../stores/app';
import { dateInput, date, today, csvTags, priorities } from '../utils/format';
export function CandidateCards({
  candidates,
  onSelect,
  buttonLabel = 'Use this candidate'
}) {
  return <div className="candidate-list">{candidates?.length ? candidates.map(c => <article className="candidate" key={c.employeeId}><div className="candidate-heading"><strong>{c.name}</strong><span className="match-score">{c.score}/100 fit</span></div><p>{c.freeHours}h available · {c.workload}% utilization</p><ul>{c.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{c.warnings.map(w => <div className="candidate-warning" key={w}>{w}</div>)}{onSelect && <Button type="button" variant="subtle" onClick={() => onSelect(c)}>{buttonLabel}</Button>}</article>) : <p className="muted">No suitable visible candidates. Check project membership, team assignment, and availability.</p>}</div>;
}
function Editor({
  record,
  projectId,
  onClose
}) {
  const {
      user
    } = useAuth(),
    [form, set] = useState({
      projectId: record?.projectId || projectId || null,
      title: record?.title || '',
      description: record?.description || '',
      assigneeId: record?.assigneeId || null,
      teamId: record?.teamId || null,
      priority: record?.priority || 'MEDIUM',
      status: record?.status || 'BACKLOG',
      startDate: dateInput(record?.startDate) || today(),
      dueDate: dateInput(record?.dueDate) || '',
      estimatedHours: record?.estimatedHours ?? 8,
      remainingHours: record?.remainingHours ?? 8,
      complexity: record?.complexity ?? 1,
      requiredSkills: record?.requiredSkills?.join(', ') || '',
      tags: record?.tags?.join(', ') || '',
      dependencies: record?.dependencies || [],
      blockedReason: record?.blockedReason || ''
    });
  const {
      data: project
    } = useData(form.projectId ? `/projects/${form.projectId}` : null),
    {
      data: team
    } = useData(form.teamId ? `/teams/${form.teamId}` : null),
    [recommend, setRecommend] = useState(false),
    {
      data: recommendations,
      loading: aiLoading,
      error: aiError
    } = useData(recommend && record ? `/ai/tasks/${record._id}/assignment` : null);
  const canManage = user.role === 'ORGANIZATION_ADMIN' || user.role === 'PROJECT_MANAGER' && project?.managerId === user.employeeId || user.role === 'TEAM_LEADER' && team?.leaderId === user.employeeId;
  const canCreate = ['ORGANIZATION_ADMIN', 'PROJECT_MANAGER', 'TEAM_LEADER'].includes(user.role);
  const manager = record ? canManage : canCreate,
    done = record?.status === 'DONE',
    mutation = useMutation(onClose);
  const value = (key, v) => set(s => ({
      ...s,
      [key]: v
    })),
    change = key => e => value(key, e.target.value);
  const next = {
    BACKLOG: ['TODO'],
    TODO: ['BACKLOG', 'IN_PROGRESS'],
    IN_PROGRESS: ['TODO', 'REVIEW'],
    REVIEW: canManage ? ['IN_PROGRESS', 'DONE'] : ['IN_PROGRESS'],
    DONE: canManage ? ['IN_PROGRESS'] : []
  };
  async function submit(e) {
    e.preventDefault();
    let data;
    if (!manager) data = {
      status: form.status,
      remainingHours: Number(form.remainingHours),
      blockedReason: form.blockedReason
    };else {
      data = {
        ...form,
        estimatedHours: Number(form.estimatedHours),
        remainingHours: Number(form.remainingHours),
        complexity: Number(form.complexity),
        tags: csvTags(form.tags),
        requiredSkills: csvTags(form.requiredSkills)
      };
      if (record) delete data.projectId;else delete data.status;
    }
    if (record) data.revision = record.revision;
    await mutation.save(record ? 'patch' : 'post', `/tasks${record ? `/${record._id}` : ''}`, data, record ? 'Task updated.' : 'Task created.');
  }
  return <Modal title={record ? 'Task details' : 'Create a task'} onClose={onClose} wide busy={mutation.busy}><form onSubmit={submit}><div className="modal-body"><ErrorBox error={mutation.error} />{done ? <><div className="detail-title"><Badge value="DONE" /><h2>{record.title}</h2></div><p className="preserve-lines">{record.description || 'No description added.'}</p><dl className="detail-grid"><div><dt>Completed</dt><dd>{date(record.completedAt)}</dd></div><div><dt>Deadline</dt><dd>{date(record.dueDate)}</dd></div><div><dt>Estimated effort</dt><dd>{record.estimatedHours} hours</dd></div><div><dt>Complexity</dt><dd>{record.complexity}/5</dd></div></dl><p className="muted">Completed work is preserved. An authorized reviewer can reopen the task to make changes.</p></> : <><div className="form-grid">{!record && <Field className="span-2" label="Project"><RecordSelect resource="projects" filters={{
                archived: 'false'
              }} value={form.projectId} onChange={v => value('projectId', v)} /></Field>}{manager ? <><Field className="span-2" label="Task title"><input value={form.title} required minLength={2} maxLength={180} onChange={change('title')} /></Field><Field className="span-2" label="Description"><textarea value={form.description} maxLength={8000} onChange={change('description')} /></Field><Field label="Assigned team"><RecordSelect resource="teams" filters={{
                  archived: 'false'
                }} value={form.teamId} onChange={v => {
                  value('teamId', v);
                  value('assigneeId', null);
                }} /></Field><Field label="Assignee" hint="The assignee must be a member of this project and selected team."><RecordSelect resource="employees" filters={{
                  status: 'ACTIVE',
                  teamId: form.teamId || undefined
                }} value={form.assigneeId} onChange={v => value('assigneeId', v)} /></Field><Field label="Start date"><input required type="date" value={form.startDate} min={dateInput(project?.startDate)} max={dateInput(project?.dueDate)} onChange={change('startDate')} /></Field><Field label="Due date"><input required type="date" min={form.startDate} max={dateInput(project?.dueDate)} value={form.dueDate} onChange={change('dueDate')} /></Field><Field label="Priority"><Select value={form.priority} options={priorities} onChange={change('priority')} /></Field><Field label="Estimated effort (hours)"><input type="number" min="0.25" step="0.25" max={1000} required value={form.estimatedHours} onChange={change('estimatedHours')} /></Field><Field label="Complexity"><Select value={form.complexity} options={[1, 2, 3, 4, 5].map(n => ({
                  value: n,
                  label: `${n} / 5`
                }))} onChange={change('complexity')} /></Field><Field label="Required skills"><input value={form.requiredSkills} placeholder="React, API design" onChange={change('requiredSkills')} /></Field><Field label="Tags"><input value={form.tags} placeholder="Authentication, release" onChange={change('tags')} /></Field><Field label="Dependencies" hint="Choose tasks from this project. Cycles are rejected."><RecordSelect resource="tasks" multiple filters={{
                  projectId: form.projectId || undefined
                }} value={form.dependencies} onChange={v => value('dependencies', v)} /></Field></> : <div className="span-2"><h2>{record?.title}</h2><p className="preserve-lines">{record?.description}</p><div className="inline-badges"><Badge value={record?.priority} /><span>Due {date(record?.dueDate)}</span></div></div>}{record && <Field label="Workflow status"><Select value={form.status} options={[record.status, ...(next[record.status] || [])]} onChange={change('status')} /></Field>}<Field label="Remaining effort (hours)"><input type="number" min={0} step="0.25" max={1000} required value={form.remainingHours} onChange={change('remainingHours')} /></Field><Field label="Blocker note" className="span-2" hint="Clear this note when the blocker is resolved. Dependency blockers are checked separately."><textarea value={form.blockedReason} maxLength={1000} placeholder="What is preventing progress?" onChange={change('blockedReason')} /></Field></div>{record && manager && <div className="context-intelligence"><Button type="button" variant="subtle" onClick={() => setRecommend(!recommend)}><BrainCircuit size={17} />{recommend ? 'Hide' : 'Find'} assignment suggestions</Button>{recommend && <><p className="muted">Suggestions update the form. Review your choice and save to apply it.</p><ErrorBox error={aiError} />{aiLoading ? <Loading /> : <CandidateCards candidates={recommendations?.candidates} onSelect={c => value('assigneeId', c.employeeId)} />}</>}</div>}</>}</div><div className="modal-actions"><Button type="button" variant="subtle" onClick={onClose}>Close</Button>{done ? canManage && <Button type="button" busy={mutation.busy} onClick={() => mutation.save('patch', `/tasks/${record._id}`, {
          revision: record.revision,
          status: 'IN_PROGRESS'
        }, 'Task reopened.')}><RotateCcw size={16} />Reopen task</Button> : <Button type="submit" busy={mutation.busy} disabled={!form.projectId}>{record ? 'Save changes' : 'Create task'}<Check size={16} /></Button>}</div></form></Modal>;
}
export default function TaskDialog({
  taskId,
  projectId,
  onClose
}) {
  const {
    data,
    error,
    loading
  } = useData(taskId ? `/tasks/${taskId}` : null);
  if (taskId && (loading || error || !data)) return <Modal title="Task details" onClose={onClose}><div className="modal-body"><ErrorBox error={error} />{loading && <Loading />}</div></Modal>;
  return <Editor key={taskId || 'new'} record={data} projectId={projectId} onClose={onClose} />;
}
