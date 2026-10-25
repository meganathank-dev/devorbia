import { useState } from 'react';
import { Plus, Network, Layers3, Edit3, Archive, RotateCcw } from 'lucide-react';
import { useCollection } from '../hooks/useData';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, SearchBox, Select, Pagination, Empty, Loading, ErrorBox, TextLink, Confirm, Badge } from '../components/ui';
import { StructureForm } from '../features/EntityForms';
export default function Structure({
  kind
}) {
  const {
      data,
      loading,
      error,
      query,
      setQuery,
      filter,
      search
    } = useCollection(kind, {
      archived: 'false'
    }),
    admin = useAuth(s => s.user.role) === 'ORGANIZATION_ADMIN',
    team = kind === 'teams',
    Icon = team ? Layers3 : Network;
  const [editing, setEditing] = useState(null),
    [archive, setArchive] = useState(null),
    {
      refresh,
      toast
    } = useUI();
  return <><PageHeader eyebrow="ORGANIZATION STRUCTURE" title={team ? 'Teams' : 'Departments'} description={team ? 'Keep ownership clear and bring the right people together.' : 'Build a clear structure for your organization.'} actions={admin && <Button onClick={() => setEditing({})}><Plus size={17} />Create {team ? 'team' : 'department'}</Button>} /><Panel><div className="toolbar"><SearchBox value={query.q} onChange={search} /><Select aria-label="Archive filter" value={query.archived || ''} options={[{
          value: 'false',
          label: 'Active'
        }, {
          value: 'true',
          label: 'Archived'
        }, {
          value: '',
          label: 'All'
        }]} onChange={e => filter('archived', e.target.value)} /><Select aria-label="Sort" value={query.sort} options={[{
          value: 'createdAt',
          label: 'Newest first'
        }, {
          value: 'name',
          label: 'Name'
        }]} onChange={e => setQuery(q => ({
          ...q,
          sort: e.target.value,
          order: e.target.value === 'name' ? 'asc' : 'desc'
        }))} /></div><ErrorBox error={error} />{loading ? <Loading /> : data?.items.length ? <div className="structure-grid">{data.items.map(record => <article className="structure-card" key={record._id}><div className="structure-top"><div className="module-icon"><Icon size={23} /></div>{record.archived && <Badge value="archived" />}</div><h2>{record.name}</h2><p>{record.description || 'No description added.'}</p><div className="structure-links"><TextLink to={`/app/employees?${team ? 'teamId' : 'departmentId'}=${record._id}`}>View members</TextLink>{admin && <div><button className="icon-button" aria-label={`Edit ${record.name}`} onClick={() => setEditing(record)}><Edit3 size={16} /></button><button className="icon-button" aria-label={`${record.archived ? 'Restore' : 'Archive'} ${record.name}`} onClick={() => setArchive(record)}>{record.archived ? <RotateCcw size={16} /> : <Archive size={16} />}</button></div>}</div></article>)}</div> : <Empty title={`No ${kind} found`} text={`Create a ${team ? 'team' : 'department'} or adjust your filters.`} />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel>{editing && <StructureForm kind={kind} record={editing._id ? editing : null} onClose={() => setEditing(null)} />} {archive && <Confirm title={`${archive.archived ? 'Restore' : 'Archive'} ${archive.name}?`} text={archive.archived ? 'This record will become available again.' : 'Active members and dependent work must be moved before this record can be archived.'} onClose={() => setArchive(null)} onConfirm={async () => {
      try {
        await send('patch', `/${kind}/${archive._id}`, {
          revision: archive.revision,
          archived: !archive.archived
        });
        refresh();
        toast('Structure updated.');
      } catch (e) {
        throw new Error(errorMessage(e));
      }
    }} />}</>;
}
