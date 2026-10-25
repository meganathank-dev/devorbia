import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Mail, BriefcaseBusiness, Clock, Edit3, Send, Power } from 'lucide-react';
import { useAuth, useUI } from '../stores/app';
import { useCollection, useData } from '../hooks/useData';
import { send, errorMessage } from '../api/client';
import { PageHeader, Button, Panel, SearchBox, Select, Pagination, Avatar, Badge, Loading, ErrorBox, Empty, Modal, Confirm, TextLink } from '../components/ui';
import { EmployeeForm } from '../features/EntityForms';
import { label, date, peopleRoles } from '../utils/format';
function Profile({
  record,
  onClose,
  onEdit,
  admin
}) {
  const {
    data
  } = useData('/tasks', {
    assigneeId: record._id,
    limit: 8
  });
  return <Modal title="Employee profile" onClose={onClose} wide><div className="modal-body"><div className="profile-heading"><Avatar name={record.name} size="large" /><div><h2>{record.name}</h2><p>{record.jobTitle || label(record.role)}</p><Badge value={record.status} /></div>{admin && <Button variant="subtle" onClick={onEdit}><Edit3 size={16} />Edit profile</Button>}</div><dl className="detail-grid"><div><dt>Work email</dt><dd>{record.email}</dd></div><div><dt>Access role</dt><dd>{label(record.role)}</dd></div><div><dt>Weekly capacity</dt><dd>{record.hoursPerWeek} hours</dd></div><div><dt>Experience</dt><dd>{record.experienceYears} years</dd></div><div><dt>Joined</dt><dd>{date(record.joiningDate)}</dd></div><div><dt>Team</dt><dd>{record.teamName || 'Unassigned'}</dd></div></dl><div className="tags">{record.skills.map(skill => <span key={skill}>{skill}</span>)}</div><h3 className="section-space">Assigned work in your scope</h3>{data?.items?.length ? <div className="simple-list">{data.items.map(t => <div key={t._id}><TextLink to={`/app/tasks?task=${t._id}`}>{t.title}</TextLink><Badge value={t.status} /></div>)}</div> : <p className="muted">No visible tasks assigned.</p>}</div></Modal>;
}
export default function People() {
  const [params] = useSearchParams(),
    collection = useCollection('employees', {
      teamId: params.get('teamId') || undefined,
      departmentId: params.get('departmentId') || undefined
    }),
    {
      data,
      loading,
      error,
      query,
      setQuery,
      filter,
      search
    } = collection;
  const user = useAuth(s => s.user),
    admin = user.role === 'ORGANIZATION_ADMIN',
    [editing, setEditing] = useState(null),
    [profile, setProfile] = useState(null),
    [confirm, setConfirm] = useState(null),
    {
      toast,
      refresh
    } = useUI();
  async function status(record) {
    try {
      await send('patch', `/employees/${record._id}`, {
        revision: record.revision,
        status: record.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
      });
      refresh();
      toast('Employee access updated.');
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }
  return <><PageHeader eyebrow="YOUR ORGANIZATION" title="People" description="The people, skills, and capacity behind your projects." actions={admin && <Button onClick={() => setEditing({})}><Plus size={17} />Invite employee</Button>} /><Panel><div className="toolbar"><SearchBox value={query.q} onChange={search} placeholder="Search by name, email or job title…" /><Select aria-label="Filter by role" placeholder="All roles" value={query.role || ''} options={['ORGANIZATION_ADMIN', ...peopleRoles]} onChange={e => filter('role', e.target.value)} /><Select aria-label="Filter by access" placeholder="All access states" value={query.status || ''} options={['ACTIVE', 'INVITED', 'DISABLED']} onChange={e => filter('status', e.target.value)} /><Select aria-label="Sort people" value={query.sort} options={[{
          value: 'createdAt',
          label: 'Newest first'
        }, {
          value: 'name',
          label: 'Name'
        }]} onChange={e => setQuery(q => ({
          ...q,
          sort: e.target.value,
          order: e.target.value === 'name' ? 'asc' : 'desc',
          page: 1
        }))} />{(query.teamId || query.departmentId) && <Button variant="subtle" onClick={() => setQuery(q => ({
          ...q,
          teamId: undefined,
          departmentId: undefined,
          page: 1
        }))}>Clear team filter</Button>}</div><ErrorBox error={error} />{loading ? <Loading /> : data?.items?.length ? <div className="people-grid">{data.items.map(person => <article className="person-card" key={person._id}><div className="person-top"><Avatar name={person.name} /><Badge value={person.status} /></div><button className="person-name" onClick={() => setProfile(person)}>{person.name}</button><p>{person.jobTitle || label(person.role)}</p><div className="person-meta"><span><Mail size={14} />{person.email}</span><span><BriefcaseBusiness size={14} />{person.teamName || label(person.role)}</span><span><Clock size={14} />{person.hoursPerWeek}h / week · {person.experienceYears} years experience</span></div><div className="tags">{person.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}{person.skills.length > 3 && <span>+{person.skills.length - 3}</span>}</div><div className="person-actions"><Button variant="subtle" onClick={() => setProfile(person)}>View profile</Button>{admin && <><button className="icon-button" aria-label={`Edit ${person.name}`} onClick={() => setEditing(person)}><Edit3 size={16} /></button>{person.status === 'INVITED' && <button className="icon-button" aria-label={`Resend invitation to ${person.name}`} onClick={async () => {
                try {
                  await send('post', `/employees/${person._id}/resend-invitation`);
                  toast('Invitation queued.');
                } catch (e) {
                  toast(errorMessage(e), 'error');
                }
              }}><Send size={16} /></button>}{person.role !== 'ORGANIZATION_ADMIN' && <button className="icon-button" aria-label={`${person.status === 'DISABLED' ? 'Activate' : 'Deactivate'} ${person.name}`} onClick={() => setConfirm(person)}><Power size={16} /></button>}</>}</div></article>)}</div> : <Empty title="No people match" text="Adjust your filters or invite your first team member." />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel>{editing && <EmployeeForm record={editing._id ? editing : null} onClose={() => setEditing(null)} />} {profile && <Profile record={profile} onClose={() => setProfile(null)} admin={admin} onEdit={() => {
      setEditing(profile);
      setProfile(null);
    }} />}{confirm && <Confirm title={`${confirm.status === 'DISABLED' ? 'Activate' : 'Deactivate'} employee?`} text="Existing project records are preserved. Open responsibilities must be reassigned before deactivation." onConfirm={() => status(confirm)} onClose={() => setConfirm(null)} danger={confirm.status !== 'DISABLED'} />}</>;
}
