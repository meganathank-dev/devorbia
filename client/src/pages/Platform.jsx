import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Building2, Users, CheckCircle2, Edit3, Power, Send } from 'lucide-react';
import { useCollection } from '../hooks/useData';
import { useMutation } from '../hooks/useMutation';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Metric, Button, Field, SearchBox, Pagination, Loading, ErrorBox, Empty, Badge, Modal, Confirm } from '../components/ui';
import { date } from '../utils/format';
function OrganizationDialog({
  record,
  onClose
}) {
  const [form, set] = useState({
      name: record?.name || '',
      slug: record?.slug || '',
      email: record?.email || '',
      website: record?.website || '',
      description: record?.description || '',
      adminName: '',
      adminEmail: ''
    }),
    mutation = useMutation(onClose),
    change = key => e => set(s => ({
      ...s,
      [key]: e.target.value
    }));
  return <Modal title={record ? 'Edit organization' : 'Onboard an organization'} onClose={onClose} wide busy={mutation.busy}><form onSubmit={e => {
      e.preventDefault();
      const payload = {
        ...form
      };
      if (record) {
        delete payload.adminName;
        delete payload.adminEmail;
        delete payload.slug;
        payload.revision = record.revision;
      }
      mutation.save(record ? 'patch' : 'post', `/organizations${record ? `/${record._id}` : ''}`, payload, record ? 'Organization updated.' : 'Organization created; administrator invitation queued.');
    }}><div className="modal-body"><ErrorBox error={mutation.error} /><div className="form-grid"><Field label="Organization name"><input required minLength={2} maxLength={120} value={form.name} onChange={change('name')} /></Field><Field label="Unique workspace slug"><input required disabled={Boolean(record)} pattern="[a-z0-9][a-z0-9-]{1,49}" value={form.slug} placeholder="acme-engineering" onChange={change('slug')} /></Field><Field label="Organization contact email"><input type="email" required value={form.email} onChange={change('email')} /></Field><Field label="Website"><input type="url" value={form.website} onChange={change('website')} /></Field><Field label="Description" className="span-2"><textarea value={form.description} maxLength={2000} onChange={change('description')} /></Field>{!record && <><Field label="Administrator’s name"><input required minLength={2} maxLength={100} value={form.adminName} onChange={change('adminName')} /></Field><Field label="Administrator’s work email"><input type="email" required value={form.adminEmail} onChange={change('adminEmail')} /></Field></>}</div>{!record && <p className="info-box">The initial administrator receives a single-use invitation. They manage the organization’s people, projects and leave.</p>}</div><div className="modal-actions"><Button type="button" variant="subtle" onClick={onClose}>Cancel</Button><Button type="submit" busy={mutation.busy}>{record ? 'Save organization' : 'Create organization'}</Button></div></form></Modal>;
}
export default function Platform() {
  const user = useAuth(s => s.user),
    {
      data,
      loading,
      error,
      query,
      setQuery,
      search
    } = useCollection('organizations'),
    [editing, setEditing] = useState(null),
    [toggle, setToggle] = useState(null),
    {
      toast,
      refresh
    } = useUI();
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/app" replace />;
  return <><PageHeader eyebrow="PLATFORM ADMINISTRATION" title="Organizations" description="Manage platform access and onboard organization administrators." actions={<Button onClick={() => setEditing({})}><Plus size={17} />New organization</Button>} /><div className="metrics three"><Metric icon={Building2} label="Matching organizations" value={data?.total} detail="Current organization directory" /><Metric icon={CheckCircle2} label="Active organizations" value={data?.activeOrganizations} detail="Organizations with platform access" /><Metric icon={Users} label="Organization users" value={data?.totalUsers} detail="Platform-wide account count" /></div><Panel><div className="toolbar"><SearchBox value={query.q} onChange={search} placeholder="Search organizations…" /></div><ErrorBox error={error} />{loading ? <Loading /> : data?.items.length ? <div className="table-wrap"><table><caption className="sr-only">Platform organizations</caption><thead><tr><th>Organization</th><th>Contact</th><th>Access</th><th>Users</th><th>Created</th><th>Actions</th></tr></thead><tbody>{data.items.map(org => <tr key={org._id}><td><strong>{org.name}</strong><small>{org.slug}</small></td><td>{org.email}</td><td><Badge value={org.active ? 'ACTIVE' : 'DISABLED'} /></td><td>{org.userCount}</td><td>{date(org.createdAt)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${org.name}`} onClick={() => setEditing(org)}><Edit3 size={16} /></button><button className="icon-button" aria-label={`${org.active ? 'Deactivate' : 'Activate'} ${org.name}`} onClick={() => setToggle(org)}><Power size={16} /></button><button className="icon-button" aria-label={`Resend pending administrator invitation for ${org.name}`} onClick={async () => {
                    try {
                      await send('post', `/organizations/${org._id}/resend-invitation`);
                      toast('Invitation queued.');
                    } catch (e) {
                      toast(errorMessage(e), 'error');
                    }
                  }}><Send size={16} /></button></div></td></tr>)}</tbody></table></div> : <Empty title="No organizations yet" text="Create an organization and invite its administrator to get started." />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel>{editing && <OrganizationDialog record={editing._id ? editing : null} onClose={() => setEditing(null)} />} {toggle && <Confirm title={`${toggle.active ? 'Deactivate' : 'Activate'} ${toggle.name}?`} text={toggle.active ? 'All organization sessions will be revoked and access will stop immediately. Organization records are preserved.' : 'Organization members will be able to sign in again.'} danger={toggle.active} onClose={() => setToggle(null)} onConfirm={async () => {
      try {
        await send('patch', `/organizations/${toggle._id}`, {
          revision: toggle.revision,
          active: !toggle.active
        });
        refresh();
        toast('Organization access updated.');
      } catch (e) {
        throw new Error(errorMessage(e));
      }
    }} />}</>;
}
