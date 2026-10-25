import { Bell, CheckCheck, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useData';
import { useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, Pagination, Empty, Loading, ErrorBox } from '../components/ui';
import { humanTime } from '../utils/format';
export default function Notifications({
  activity = false
}) {
  const {
      data,
      loading,
      error,
      setQuery
    } = useCollection(activity ? 'activity' : 'notifications'),
    {
      toast,
      refresh
    } = useUI(),
    navigate = useNavigate();
  return <><PageHeader eyebrow={activity ? 'ORGANIZATION HISTORY' : 'YOUR INBOX'} title={activity ? 'Activity log' : 'Notifications'} description={activity ? 'A record of administrative and delivery changes.' : 'Assignment updates, leave decisions, and planning signals.'} actions={!activity && <Button variant="subtle" onClick={async () => {
      try {
        await send('post', '/notifications/read-all');
        refresh();
        toast('All notifications marked as read.');
      } catch (e) {
        toast(errorMessage(e), 'error');
      }
    }}><CheckCheck size={17} />Mark all as read</Button>} /><Panel><ErrorBox error={error} />{loading ? <Loading /> : data?.items.length ? <div className="notification-list">{data.items.map(record => <article className={!activity && !record.readAt ? 'unread' : ''} key={record._id}><div className="notification-icon">{activity ? <Activity size={20} /> : <Bell size={20} />}</div><div><strong>{record.title || record.summary}</strong>{record.message && <p>{record.message}</p>}<small>{humanTime(record.createdAt)}{record.actorName ? ` · ${record.actorName}` : ''}</small></div>{!activity && <Button variant="subtle" onClick={async () => {
            try {
              await send('patch', `/notifications/${record._id}/read`);
              refresh();
              if (record.path) navigate(record.path);
            } catch (e) {
              toast(errorMessage(e), 'error');
            }
          }}>{record.path ? 'Open' : record.readAt ? 'Read' : 'Mark read'}</Button>}</article>)}</div> : <Empty title={activity ? 'No activity yet' : 'You’re all caught up'} text={activity ? 'Changes will be recorded as your team works.' : 'New notifications will appear here.'} />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel></>;
}
