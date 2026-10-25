import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Columns3, List, CalendarDays, GripVertical, LockKeyhole } from 'lucide-react';
import { useCollection } from '../hooks/useData';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, SearchBox, Select, Pagination, Empty, Loading, ErrorBox, Badge, Avatar, RecordSelect } from '../components/ui';
import TaskDialog from '../features/TaskDialog';
import { taskStatuses, priorities, label, date, overdue } from '../utils/format';
export default function Tasks({
  projectId,
  embedded = false
}) {
  const [params, setParams] = useSearchParams(),
    [view, setView] = useState('board'),
    [dialog, setDialog] = useState(null),
    [moving, setMoving] = useState(null);
  const {
      data,
      loading,
      error,
      query,
      setQuery,
      filter,
      search
    } = useCollection('tasks', {
      limit: 50,
      projectId: projectId || params.get('projectId') || undefined
    }),
    role = useAuth(s => s.user.role),
    {
      toast,
      refresh
    } = useUI();
  useEffect(() => {
    if (params.get('task')) setDialog(params.get('task'));
  }, [params]);
  const close = () => {
    setDialog(null);
    if (params.get('task')) {
      const next = new URLSearchParams(params);
      next.delete('task');
      setParams(next, {
        replace: true
      });
    }
  };
  async function move(task, status) {
    if (task.status === status) return;
    setMoving(task._id);
    try {
      await send('patch', `/tasks/${task._id}`, {
        revision: task.revision,
        status
      });
      refresh();
      toast(`Moved to ${label(status)}.`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setMoving(null);
    }
  }
  const content = <><div className="toolbar"><SearchBox value={query.q} onChange={search} placeholder="Search tasks…" /><Select aria-label="Task status filter" placeholder="All statuses" value={query.status || ''} options={taskStatuses} onChange={e => filter('status', e.target.value)} /><Select aria-label="Task priority filter" placeholder="All priorities" value={query.priority || ''} options={priorities} onChange={e => filter('priority', e.target.value)} />{!projectId && <div className="filter-picker"><RecordSelect resource="projects" value={query.projectId || null} onChange={v => filter('projectId', v)} placeholder="Filter by project…" /></div>}<div className="segmented" aria-label="Task view"><button aria-pressed={view === 'board'} onClick={() => setView('board')}><Columns3 size={16} />Board</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} />List</button></div>{embedded && role !== 'EMPLOYEE' && <Button onClick={() => setDialog('new')}><Plus size={16} />Add task</Button>}</div><ErrorBox error={error} />{loading && !data ? <Loading /> : view === 'board' ? <><div className="board-note">Showing {data?.items?.length || 0} of {data?.total || 0} matching tasks. Drag a card or use its status menu. Workflow rules apply.</div><div className="kanban">{taskStatuses.map(status => <section className={`kanban-column ${status.toLowerCase()}`} key={status} aria-label={label(status)} onDragOver={e => e.preventDefault()} onDrop={e => {
          e.preventDefault();
          const task = data?.items.find(t => t._id === e.dataTransfer.getData('text/plain'));
          if (task) move(task, status);
        }}><div className="column-heading"><span><i />{label(status)}</span><b>{data?.items.filter(t => t.status === status).length || 0}</b></div><div className="column-body">{data?.items.filter(t => t.status === status).map(task => <article draggable={moving !== task._id} onDragStart={e => e.dataTransfer.setData('text/plain', task._id)} key={task._id} className={`task-card ${moving === task._id ? 'saving' : ''}`}><div className="task-card-top"><span>{task.projectCode || 'TASK'} · {task._id.slice(-4).toUpperCase()}</span><GripVertical size={15} /></div><button className="task-title" onClick={() => setDialog(task._id)}>{task.title}</button><div className="task-flags"><Badge value={task.priority} />{(task.blockedReason || task.blocked) && <Badge value="blocked"><LockKeyhole size={10} />Blocked</Badge>}{overdue(task) && <Badge value="overdue" />}</div>{task.tags?.length > 0 && <div className="tags">{task.tags.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div>}<div className="task-meta"><span className={overdue(task) ? 'danger-text' : ''}><CalendarDays size={13} />{date(task.dueDate).replace(/ \d{4}$/, '')}</span><span title={task.assigneeName || 'Unassigned'}>{task.assigneeName ? <Avatar name={task.assigneeName} size="tiny" /> : 'Unassigned'}</span></div><Select aria-label={`Change status of ${task.title}`} value={task.status} options={taskStatuses} disabled={moving === task._id} onChange={e => move(task, e.target.value)} /></article>)}{!data?.items.some(t => t.status === status) && <div className="column-empty">No tasks on this page</div>}</div></section>)}</div></> : data?.items.length ? <div className="table-wrap"><table><caption className="sr-only">Tasks in your authorized workspace</caption><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Remaining</th></tr></thead><tbody>{data.items.map(task => <tr key={task._id}><td><button className="table-link" onClick={() => setDialog(task._id)}>{task.title}</button>{(task.blockedReason || task.blocked) && <small className="danger-text">Blocked</small>}</td><td>{task.projectName || 'Project'}</td><td>{task.assigneeName || 'Unassigned'}</td><td><Badge value={task.priority} /></td><td><Badge value={task.status} /></td><td className={overdue(task) ? 'danger-text' : ''}>{date(task.dueDate)}</td><td>{task.remainingHours}h</td></tr>)}</tbody></table></div> : <Empty title="No matching tasks" text="Create a task or adjust the filters." />}<Pagination data={data} onPage={page => setQuery(q => ({
      ...q,
      page
    }))} /></>;
  return <>{!embedded && <PageHeader eyebrow="WORK IN MOTION" title={role === 'EMPLOYEE' ? 'My tasks' : 'Tasks'} description="Move work forward, resolve blockers, and keep ownership clear." actions={role !== 'EMPLOYEE' && <Button onClick={() => setDialog('new')}><Plus size={17} />New task</Button>} />}<Panel className="task-panel">{content}</Panel>{dialog && <TaskDialog taskId={dialog === 'new' ? null : dialog} projectId={projectId || query.projectId} onClose={close} />}</>;
}
