import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, Users, ArrowUpRight } from 'lucide-react';
import { useCollection, useData } from '../hooks/useData';
import { useAuth } from '../stores/app';
import { PageHeader, Panel, Button, SearchBox, Select, Pagination, Loading, Empty, ErrorBox, Badge, Progress } from '../components/ui';
import { ProjectForm } from '../features/EntityForms';
import { date, projectStatuses, priorities } from '../utils/format';
export default function Projects() {
  const {
      data,
      loading,
      error,
      query,
      setQuery,
      filter,
      search
    } = useCollection('projects', {
      archived: 'false'
    }),
    {
      data: overview
    } = useData('/dashboard'),
    role = useAuth(s => s.user.role),
    [create, setCreate] = useState(false);
  return <><PageHeader eyebrow="DELIVERY WORKSPACE" title="Projects" description="Keep every initiative moving with clear ownership and visible progress." actions={['ORGANIZATION_ADMIN', 'PROJECT_MANAGER'].includes(role) && <Button onClick={() => setCreate(true)}><Plus size={17} />New project</Button>} /><Panel><div className="toolbar"><SearchBox value={query.q} onChange={search} placeholder="Search projects or codes…" /><Select aria-label="Project status" placeholder="All statuses" value={query.status || ''} options={projectStatuses} onChange={e => filter('status', e.target.value)} /><Select aria-label="Project priority" placeholder="All priorities" value={query.priority || ''} options={priorities} onChange={e => filter('priority', e.target.value)} /><Select aria-label="Archived projects" value={query.archived || ''} options={[{
          value: 'false',
          label: 'Current projects'
        }, {
          value: 'true',
          label: 'Archived projects'
        }]} onChange={e => filter('archived', e.target.value)} /><Select aria-label="Sort projects" value={query.sort} options={[{
          value: 'createdAt',
          label: 'Newest'
        }, {
          value: 'name',
          label: 'Name'
        }, {
          value: 'dueDate',
          label: 'Deadline'
        }]} onChange={e => setQuery(q => ({
          ...q,
          sort: e.target.value,
          order: e.target.value === 'createdAt' ? 'desc' : 'asc'
        }))} /></div><ErrorBox error={error} />{loading ? <Loading /> : data?.items.length ? <div className="project-grid">{data.items.map(project => {
          const health = overview?.health.find(h => h.projectId === project._id);
          return <Link className="project-card" to={`/app/projects/${project._id}`} key={project._id}><div className="project-card-top"><span className="project-code">{project.code}</span><Badge value={project.status} /></div><h2>{project.name}<ArrowUpRight size={17} /></h2><p>{project.description || 'No project description added.'}</p><div className="project-health-line"><span>{health ? `${health.progress}% of visible tasks complete` : 'Open project to view progress'}</span>{health?.score !== null && health?.score !== undefined && <span className={`health-dot ${health.level.toLowerCase()}`}>{health.score} health</span>}</div><Progress value={health?.progress || 0} /><div className="project-card-bottom"><span><CalendarDays size={15} />{date(project.dueDate)}</span><Badge value={project.priority} /></div><div className="project-teams"><Users size={14} />{project.teamIds.length} team(s) · {project.memberIds.length} additional member(s)</div></Link>;
        })}</div> : <Empty title="No matching projects" text="Create a project or change your filters to get started." />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel>{create && <ProjectForm onClose={() => setCreate(false)} />}</>;
}
