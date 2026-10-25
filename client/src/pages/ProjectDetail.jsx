import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit3, Archive, ArrowLeft, BrainCircuit, CalendarDays, Target } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, Loading, ErrorBox, Badge, Progress, Confirm, Modal } from '../components/ui';
import { ProjectForm } from '../features/EntityForms';
import { CandidateCards } from '../features/TaskDialog';
import Tasks from './Tasks';
import { date } from '../utils/format';
export default function ProjectDetail() {
  const {
      id
    } = useParams(),
    {
      data: project,
      loading,
      error
    } = useData(`/projects/${id}`),
    {
      data: analytics
    } = useData('/analytics', {
      projectId: id
    });
  const user = useAuth(s => s.user),
    [edit, setEdit] = useState(false),
    [archiving, setArchiving] = useState(false),
    [recommend, setRecommend] = useState(false),
    [choice, setChoice] = useState(null),
    {
      refresh,
      toast
    } = useUI();
  const {
    data: resources,
    loading: aiLoading,
    error: aiError
  } = useData(recommend ? `/ai/projects/${id}/resources` : null);
  const canManage = user.role === 'ORGANIZATION_ADMIN' || user.role === 'PROJECT_MANAGER' && project?.managerId === user.employeeId,
    health = analytics?.health[0];
  async function patch(changes) {
    try {
      await send('patch', `/projects/${id}`, {
        revision: project.revision,
        ...changes
      });
      refresh();
      toast('Project updated.');
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }
  if (loading && !project) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!project) return null;
  return <><Link className="back-link" to="/app/projects"><ArrowLeft size={15} />All projects</Link><PageHeader eyebrow={project.code} title={project.name} description={project.description} actions={canManage && <><Button variant="subtle" onClick={() => setEdit(true)}><Edit3 size={16} />Edit project</Button><Button variant="subtle" onClick={() => setArchiving(true)}><Archive size={16} />{project.archived ? 'Restore' : 'Archive'}</Button><Button onClick={() => setRecommend(true)}><BrainCircuit size={16} />Plan resources</Button></>} /><div className="project-detail-meta"><Badge value={project.status} /><Badge value={project.priority} /><span><CalendarDays size={16} />{date(project.startDate)} – {date(project.dueDate)}</span><span>{project.teamIds.length} teams · {project.memberIds.length} additional members</span></div><div className="project-summary"><Panel title="Project health" action={health && <Badge value={health.level} />}><div className="health-score"><strong>{health?.score ?? '—'}</strong><span>/ 100</span></div><div className="health-details"><span>{health?.progress ?? 0}% of visible work complete</span><Progress value={health?.progress || 0} /></div></Panel><Panel title="Delivery signals" description="Computed from work visible to your role"><ul className="risk-list">{(health?.reasons || ['Add tasks to establish project health.']).map(reason => <li key={reason}><Target size={16} />{reason}</li>)}</ul></Panel></div><Tasks projectId={id} embedded />{edit && <ProjectForm record={project} onClose={() => setEdit(false)} />} {archiving && <Confirm title={`${project.archived ? 'Restore' : 'Archive'} project?`} text="Only completed or cancelled projects can be archived. All history is preserved." onConfirm={() => patch({
      archived: !project.archived
    })} onClose={() => setArchiving(false)} />} {recommend && <Modal title="Project resource planning" onClose={() => setRecommend(false)} wide><div className="modal-body"><p className="muted">Recommendations use skills, availability and existing commitments. Review team and member changes before applying them.</p><ErrorBox error={aiError} />{aiLoading ? <Loading /> : <><h3>Teams</h3><div className="simple-list">{resources?.teams.map(team => <div key={team.teamId}><span><strong>{team.name}</strong><small>{team.candidates} visible contributors · {team.score}/100 fit</small></span><Button variant="subtle" disabled={project.teamIds.includes(team.teamId)} onClick={() => setChoice({
                type: 'team',
                id: team.teamId,
                name: team.name
              })}>{project.teamIds.includes(team.teamId) ? 'Assigned' : 'Add team'}</Button></div>)}</div><h3 className="section-space">Departments</h3><p className="muted">Department scores summarize the suitability of their visible teams.</p><div className="inline-badges">{resources?.departments.map(d => <span className="chip" key={d.departmentId}>{d.name} · {d.score}/100</span>)}</div><h3 className="section-space">Additional project members</h3><CandidateCards candidates={resources?.people} onSelect={c => setChoice({
            type: 'person',
            id: c.employeeId,
            name: c.name
          })} buttonLabel="Review membership" /></>}</div></Modal>} {choice && <Confirm title={`Add ${choice.name}?`} text={`This adds ${choice.type === 'team' ? 'the team and its members' : 'this person'} to ${project.name}.`} onClose={() => setChoice(null)} onConfirm={() => patch(choice.type === 'team' ? {
      teamIds: [...new Set([...project.teamIds, choice.id])]
    } : {
      memberIds: [...new Set([...project.memberIds, choice.id])]
    })} confirmLabel="Add to project" />}</>;
}
