import { useState } from 'react';
import { Plus, CalendarDays, Check, X, BrainCircuit } from 'lucide-react';
import { useCollection, useData } from '../hooks/useData';
import { useMutation } from '../hooks/useMutation';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Metric, Button, Field, Select, Pagination, Loading, ErrorBox, Empty, Badge, Modal, Confirm, TextLink } from '../components/ui';
import { date, today, label } from '../utils/format';
function RequestForm({
  onClose
}) {
  const [form, set] = useState({
      type: 'PAID',
      startDate: today(),
      endDate: today(),
      reason: ''
    }),
    mutation = useMutation(onClose),
    change = key => e => set(s => ({
      ...s,
      [key]: e.target.value
    }));
  return <Modal title="Request leave" onClose={onClose} busy={mutation.busy}><form onSubmit={e => {
      e.preventDefault();
      mutation.save('post', '/leave', form, 'Leave request submitted.');
    }}><div className="modal-body"><ErrorBox error={mutation.error} /><Field label="Leave type"><Select options={['PAID', 'SICK', 'UNPAID']} value={form.type} onChange={change('type')} /></Field><div className="form-grid"><Field label="From"><input required type="date" min={today()} value={form.startDate} onChange={change('startDate')} /></Field><Field label="Through"><input required type="date" min={form.startDate} value={form.endDate} onChange={change('endDate')} /></Field></div><Field label="Reason"><textarea required minLength={4} maxLength={2000} value={form.reason} onChange={change('reason')} placeholder="Briefly explain your request." /></Field><div className="info-box">Only organization working days count. Impact analysis supports planning; a person reviews your request.</div></div><div className="modal-actions"><Button type="button" variant="subtle" onClick={onClose}>Cancel</Button><Button busy={mutation.busy} type="submit">Submit request</Button></div></form></Modal>;
}
function Decision({
  record,
  status,
  onClose
}) {
  const [note, setNote] = useState(''),
    mutation = useMutation(onClose);
  return <Modal title={`${status === 'APPROVED' ? 'Approve' : 'Reject'} leave request`} onClose={onClose} busy={mutation.busy}><form onSubmit={e => {
      e.preventDefault();
      mutation.save('patch', `/leave/${record._id}`, {
        revision: record.revision,
        status,
        decisionNote: note
      }, `Leave ${status.toLowerCase()}.`);
    }}><div className="modal-body"><p><strong>{record.employeeName}</strong> · {date(record.startDate)} – {date(record.endDate)}</p><p>{record.reason}</p><ErrorBox error={mutation.error} /><Field label={status === 'REJECTED' ? 'Reason for rejection' : 'Decision note (optional)'}><textarea required={status === 'REJECTED'} minLength={status === 'REJECTED' ? 4 : 0} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></Field></div><div className="modal-actions"><Button type="button" variant="subtle" onClick={onClose}>Cancel</Button><Button type="submit" busy={mutation.busy} variant={status === 'REJECTED' ? 'danger' : 'primary'}>{status === 'APPROVED' ? 'Approve leave' : 'Reject request'}</Button></div></form></Modal>;
}
function Impact({
  record,
  onClose
}) {
  const {
      data,
      loading,
      error
    } = useData(`/ai/leave/${record._id}/impact`),
    [choice, setChoice] = useState(null),
    {
      toast,
      refresh
    } = useUI();
  return <><Modal title="Leave impact & coverage" onClose={onClose} wide><div className="modal-body"><p>{record.employeeName} · {date(record.startDate)} – {date(record.endDate)}</p><ErrorBox error={error} />{loading ? <Loading /> : data && <><div className="impact-banner"><Badge value={data.level} /><strong>{data.affected.length} visible task(s) may need coverage</strong></div><ul className="risk-list">{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><div className="simple-list">{data.affected.map(task => <div key={task._id}><TextLink to={`/app/tasks?task=${task._id}`}>{task.title}</TextLink><Badge value={task.priority} /></div>)}</div><h3 className="section-space">Suggested coverage</h3>{data.reassignments.length ? data.reassignments.map(item => <div className="reassignment" key={item.taskId}><div><strong>{item.title}</strong><p>{item.recommended.name} · {item.recommended.score}/100 fit · {item.recommended.freeHours}h available</p></div><Button variant="subtle" onClick={() => setChoice(item)}>Review reassignment</Button></div>) : <p className="muted">No eligible reassignment suggestions in your permission scope.</p>}<p className="info-box">{data.notice}</p></>}</div></Modal>{choice && <Confirm title={`Assign to ${choice.recommended.name}?`} text={`${choice.title} will be reassigned. Leave status will not change.`} onClose={() => setChoice(null)} onConfirm={async () => {
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
    }} confirmLabel="Confirm assignment" />}</>;
}
export default function Leave() {
  const {
      data,
      loading,
      error,
      query,
      setQuery,
      filter
    } = useCollection('leave'),
    {
      data: balance
    } = useData('/leave/balance'),
    user = useAuth(s => s.user),
    {
      toast,
      refresh
    } = useUI();
  const [request, setRequest] = useState(false),
    [decision, setDecision] = useState(null),
    [impact, setImpact] = useState(null),
    [cancel, setCancel] = useState(null);
  return <><PageHeader eyebrow="TIME & AVAILABILITY" title="Leave" description="Plan time away, review requests, and arrange coverage." actions={<Button onClick={() => setRequest(true)}><Plus size={17} />Request leave</Button>} /><div className="metrics three"><Metric icon={CalendarDays} label="My paid leave available" value={balance?.available} detail={`${balance?.year || new Date().getFullYear()} calendar year`} /><Metric icon={Check} label="Approved paid leave" value={balance?.approved} detail="Working days, excluding weekends" /><Metric icon={CalendarDays} label="Pending paid leave" value={balance?.pending} detail="Reserved only when approved" /></div><Panel title="Requests" description="Your requests and those you are authorized to review"><div className="toolbar"><Select aria-label="Leave status filter" placeholder="All statuses" value={query.status || ''} options={['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']} onChange={e => filter('status', e.target.value)} /></div><ErrorBox error={error} />{loading ? <Loading /> : data?.items.length ? <div className="table-wrap"><table><caption className="sr-only">Leave requests</caption><thead><tr><th>Employee</th><th>Dates</th><th>Type / days</th><th>Reason / decision</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.items.map(record => <tr key={record._id}><td><strong>{record.employeeName}</strong>{record.employeeId === user.employeeId && <small>You</small>}</td><td>{date(record.startDate)}<small>to {date(record.endDate)}</small></td><td>{label(record.type)}<small>{record.days} working day(s)</small></td><td className="reason-cell">{record.reason}{record.decisionNote && <small>Decision: {record.decisionNote}</small>}</td><td><Badge value={record.status} /></td><td><div className="row-actions"><Button variant="subtle" onClick={() => setImpact(record)}><BrainCircuit size={15} />Impact</Button>{record.status === 'PENDING' && record.canApprove && <><button className="icon-button success-text" aria-label={`Approve ${record.employeeName}'s request`} onClick={() => setDecision({
                      record,
                      status: 'APPROVED'
                    })}><Check size={18} /></button><button className="icon-button danger-text" aria-label={`Reject ${record.employeeName}'s request`} onClick={() => setDecision({
                      record,
                      status: 'REJECTED'
                    })}><X size={18} /></button></>}{record.employeeId === user.employeeId && (record.status === 'PENDING' || record.status === 'APPROVED' && record.startDate.slice(0, 10) > today()) && <Button variant="subtle" onClick={() => setCancel(record)}>Cancel</Button>}</div></td></tr>)}</tbody></table></div> : <Empty title="No leave requests" text="Your requests and approval queue will appear here." />}<Pagination data={data} onPage={page => setQuery(q => ({
        ...q,
        page
      }))} /></Panel>{request && <RequestForm onClose={() => setRequest(false)} />} {decision && <Decision {...decision} onClose={() => setDecision(null)} />} {impact && <Impact record={impact} onClose={() => setImpact(null)} />} {cancel && <Confirm title="Cancel this leave request?" text="Cancellation preserves the request history and releases approved paid leave back to your entitlement." onClose={() => setCancel(null)} onConfirm={async () => {
      try {
        await send('patch', `/leave/${cancel._id}`, {
          revision: cancel.revision,
          status: 'CANCELLED',
          decisionNote: ''
        });
        refresh();
        toast('Request cancelled.');
      } catch (e) {
        throw new Error(errorMessage(e));
      }
    }} />}</>;
}
