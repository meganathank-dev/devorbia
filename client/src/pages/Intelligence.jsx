import { lazy, Suspense, useState } from 'react';
import { BrainCircuit, Gauge, Users, Clock, Award } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, Metric, Loading, ErrorBox, Empty, Progress, Avatar, RecordSelect, Confirm } from '../components/ui';
const Charts = lazy(() => import('../features/Charts'));
export default function Intelligence({
  mode
}) {
  const [projectId, setProjectId] = useState(null),
    {
      data,
      loading,
      error
    } = useData('/analytics', {
      projectId: projectId || undefined
    }),
    role = useAuth(s => s.user.role),
    [balancing, setBalancing] = useState(false),
    [choice, setChoice] = useState(null),
    {
      toast,
      refresh
    } = useUI();
  const {
    data: balance,
    loading: balanceLoading,
    error: balanceError
  } = useData(balancing ? '/ai/workload-balancing' : null);
  const titles = {
    workload: ['CAPACITY PLANNING', 'Workload', 'Understand commitments, spot overload, and plan coverage.'],
    analytics: ['DELIVERY INTELLIGENCE', 'Analytics', 'Real project data, clear trends, and visible delivery signals.'],
    performance: ['PEOPLE & CONTRIBUTION', 'Recognition', 'Evidence-based delivery recognition, with context and explanations.']
  };
  const [eyebrow, title, description] = titles[mode];
  if (loading && !data) return <Loading />;
  return <><PageHeader eyebrow={eyebrow} title={title} description={description} actions={mode === 'workload' && role !== 'EMPLOYEE' && <Button onClick={() => setBalancing(!balancing)}><BrainCircuit size={17} />{balancing ? 'Hide suggestions' : 'Balance workload'}</Button>} /><div className="analysis-filter"><RecordSelect resource="projects" value={projectId} onChange={setProjectId} placeholder="Filter analysis by project…" /><span>Live records · explainable local rules</span></div><ErrorBox error={error} />{data && <>{mode === 'analytics' ? <><div className="metrics three"><Metric label="Completed tasks" value={data.totals.completed} detail={`of ${data.totals.tasks} visible tasks`} icon={Clock} /><Metric label="Delivery completion" value={`${data.totals.tasks ? Math.round(data.totals.completed / data.totals.tasks * 100) : 0}%`} detail="Completion does not automatically close projects" icon={Gauge} /><Metric label="Overdue work" value={data.totals.overdue} detail="Excludes completed tasks" icon={Clock} /></div><Suspense fallback={<Loading />}><Charts data={data} /></Suspense></> : mode === 'workload' ? <><div className="metrics three"><Metric label="Available capacity" value={`${Math.round(data.workload.reduce((n, p) => n + p.capacityHours, 0))}h`} detail="Next 14 calendar days, excluding approved leave" icon={Clock} /><Metric label="Planned effort" value={`${Math.round(data.workload.reduce((n, p) => n + p.committedHours, 0))}h`} detail="Time allocated from remaining task estimates" icon={Gauge} /><Metric label="Above capacity" value={data.workload.filter(p => p.overloaded).length} detail="More planned work than available hours" icon={Users} /></div>{balancing && <Panel title="Reassignment suggestions" description="Review one suggestion at a time. Recalculate after every change."><ErrorBox error={balanceError} />{balanceLoading ? <Loading /> : balance?.suggestions.length ? <div className="reassignment-list">{balance.suggestions.map(item => <div key={item.taskId} className="reassignment"><div><strong>{item.title}</strong><p>{item.currentAssignee} ({item.currentUsage}%) → {item.recommended.name} ({item.recommended.workload}%)</p><small>{item.recommended.score}/100 fit · {item.recommended.freeHours}h free</small></div><Button variant="subtle" onClick={() => setChoice(item)}>Review assignment</Button></div>)}</div> : <Empty title="No eligible moves found" text="No visible task can currently be moved to a suitable person with enough capacity." />}</Panel>}<Panel title="Individual capacity" description="Includes scheduling totals across each visible person’s projects"><div className="table-wrap"><table><caption className="sr-only">Employee capacity for the next 14 days</caption><thead><tr><th>Person</th><th>Utilization</th><th>Planned</th><th>Capacity</th><th>Free</th><th>Leave days</th></tr></thead><tbody>{data.workload.map(p => <tr key={p.employeeId}><td><div className="table-person"><Avatar name={p.name} size="small" /><strong>{p.name}</strong></div></td><td><div className="load-cell"><Progress value={p.usage} /><b className={p.overloaded ? 'danger-text' : ''}>{p.unavailable ? 'Unavailable' : `${p.usage}%`}</b></div></td><td>{p.committedHours}h</td><td>{p.capacityHours}h</td><td>{p.freeHours}h</td><td>{p.leaveDays}</td></tr>)}</tbody></table></div>{!data.workload.length && <Empty title="No visible capacity data" />}</Panel><Panel title="Team capacity"><div className="team-capacity">{data.teams.map(team => <div key={team.teamId}><strong>{team.name}</strong><span>{team.members} people · {team.committedHours}/{team.capacityHours}h</span><Progress value={team.usage} /><small>{team.usage}% utilized</small></div>)}</div>{!data.teams.length && <Empty title="No team capacity data" />}</Panel></> : <><div className="recognition-explainer"><Award size={27} /><div><h2>Recognize delivery, with context.</h2><p>Scores combine 70% adjusted on-time delivery and 30% completion without reopening, weighted by effort × complexity. Approved leave extends the evaluation deadline. Three completed tasks are required for a score.</p><small>These are delivery signals, not a complete assessment of a person’s job performance.</small></div></div><Panel title="This month’s delivery evidence"><div className="table-wrap"><table><caption className="sr-only">Delivery recognition evidence</caption><thead><tr><th>Contributor</th><th>Completed</th><th>Effort</th><th>Adjusted on time</th><th>Without reopening</th><th>Score</th><th>Change</th></tr></thead><tbody>{data.performance.map(person => <tr key={person.employeeId}><td><div className="table-person"><Avatar name={person.name} size="small" /><strong>{person.name}</strong></div></td><td>{person.completed}</td><td>{person.completedHours}h</td><td>{person.completed ? `${person.onTimeRate}%` : '—'}</td><td>{person.completed ? `${person.firstPassRate}%` : '—'}</td><td>{person.score === null ? <small>Not enough evidence</small> : <b>{person.score}/100</b>}</td><td>{person.improvement === null ? '—' : `${person.improvement > 0 ? '+' : ''}${person.improvement} pts`}</td></tr>)}</tbody></table></div></Panel><Panel title="Team delivery" description="Effort-weighted scores from eligible contributors in the current scope"><div className="team-capacity">{data.teams.map(team => <div key={team.teamId}><strong>{team.name}</strong><span>{team.score === null ? 'Not enough evidence' : `${team.score}/100 delivery score`}</span>{team.score !== null && <Progress value={team.score} />}</div>)}</div></Panel></>}<p className="scope-note">{data.scopeNote}</p></>}{choice && <Confirm title={`Assign ${choice.title}?`} text={`Move this task to ${choice.recommended.name}. The server will recheck membership, permissions and the latest task revision.`} onClose={() => setChoice(null)} confirmLabel="Confirm reassignment" onConfirm={async () => {
      try {
        await send('patch', `/tasks/${choice.taskId}`, {
          revision: choice.revision,
          assigneeId: choice.recommended.employeeId
        });
        refresh();
        toast('Task reassigned.');
      } catch (e) {
        throw new Error(errorMessage(e));
      }
    }} />}</>;
}
