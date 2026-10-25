import { useState } from 'react';
import { Save, ArrowRightLeft, Mail } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useMutation } from '../hooks/useMutation';
import { useAuth, useUI } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { PageHeader, Panel, Button, Field, RecordSelect, Loading, ErrorBox, Modal, Avatar } from '../components/ui';
import { label } from '../utils/format';
function OrganizationForm({
  organization
}) {
  const [form, set] = useState({
      name: organization.name,
      description: organization.description,
      email: organization.email,
      website: organization.website,
      leaveDelegateId: organization.leaveDelegateId,
      settings: {
        ...organization.settings
      }
    }),
    mutation = useMutation();
  const change = key => e => set(s => ({
    ...s,
    [key]: e.target.value
  }));
  return <Panel title="Organization profile & policy" description="Settings used for invitations, capacity, and leave"><form onSubmit={e => {
      e.preventDefault();
      mutation.save('patch', '/settings', {
        ...form,
        revision: organization.revision
      });
    }}><div className="settings-form"><ErrorBox error={mutation.error} /><div className="form-grid"><Field label="Organization name"><input required minLength={2} maxLength={120} value={form.name} onChange={change('name')} /></Field><Field label="Contact email"><input required type="email" value={form.email} onChange={change('email')} /></Field><Field label="Website"><input type="url" value={form.website} onChange={change('website')} placeholder="https://example.com" /></Field><Field label="Administrator’s leave approver" hint="Choose an active project manager. Self-approval is never allowed."><RecordSelect resource="employees" filters={{
              role: 'PROJECT_MANAGER',
              status: 'ACTIVE'
            }} value={form.leaveDelegateId} onChange={v => set(s => ({
              ...s,
              leaveDelegateId: v
            }))} /></Field><Field label="Description" className="span-2"><textarea maxLength={2000} value={form.description} onChange={change('description')} /></Field><Field label="Default working hours per day"><input type="number" min={1} max={12} required value={form.settings.hoursPerDay} onChange={e => set(s => ({
              ...s,
              settings: {
                ...s.settings,
                hoursPerDay: Number(e.target.value)
              }
            }))} /></Field><Field label="Annual paid leave entitlement (days)"><input type="number" min={0} max={100} required value={form.settings.annualLeaveDays} onChange={e => set(s => ({
              ...s,
              settings: {
                ...s.settings,
                annualLeaveDays: Number(e.target.value)
              }
            }))} /></Field></div><fieldset className="working-days"><legend>Organization working days</legend>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <label key={day}><input type="checkbox" checked={form.settings.workingDays.includes(index)} onChange={e => set(s => ({
              ...s,
              settings: {
                ...s.settings,
                workingDays: e.target.checked ? [...s.settings.workingDays, index].sort() : s.settings.workingDays.filter(d => d !== index)
              }
            }))} />{day}</label>)}</fieldset><p className="muted">Individual weekly capacity comes from each employee profile. Sick and unpaid leave do not use the paid-leave balance.</p><Button type="submit" busy={mutation.busy}><Save size={16} />Save organization</Button></div></form></Panel>;
}
function Transfer({
  onClose
}) {
  const [employeeId, setEmployee] = useState(null),
    [password, setPassword] = useState(''),
    mutation = useMutation(() => {
      useAuth.setState({
        user: null,
        employee: null
      });
    });
  return <Modal title="Transfer organization administration" onClose={onClose} busy={mutation.busy}><form onSubmit={e => {
      e.preventDefault();
      mutation.save('post', '/settings/transfer-admin', {
        employeeId,
        password
      }, 'Administration transferred. Please sign in again.');
    }}><div className="modal-body"><p>The selected active employee becomes the only organization administrator. You become a project manager and their leave approval delegate. Both sessions will be revoked.</p><ErrorBox error={mutation.error} /><Field label="New organization administrator"><RecordSelect resource="employees" filters={{
            status: 'ACTIVE'
          }} value={employeeId} onChange={setEmployee} /></Field><Field label="Confirm your current password"><input type="password" required minLength={12} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field></div><div className="modal-actions"><Button variant="subtle" type="button" onClick={onClose}>Cancel</Button><Button type="submit" busy={mutation.busy} disabled={!employeeId}>Transfer administration</Button></div></form></Modal>;
}
export default function Settings() {
  const {
      data,
      loading,
      error
    } = useData('/settings'),
    {
      user
    } = useAuth(),
    [transfer, setTransfer] = useState(false),
    [recovering, setRecovering] = useState(false),
    toast = useUI(s => s.toast);
  return <><PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Your identity, organization, and working policies." /><ErrorBox error={error} /><Panel title="Your account"><div className="settings-account"><Avatar name={user.name} size="large" /><div><h2>{user.name}</h2><p>{user.email} · {label(user.role)}</p></div><Button variant="subtle" busy={recovering} onClick={async () => {
          setRecovering(true);
          try {
            const result = await send('post', '/auth/forgot-password', {
              email: user.email
            });
            toast(result.message);
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setRecovering(false);
          }
        }}><Mail size={16} />Send password reset</Button></div></Panel>{loading ? <Loading /> : data && (user.role === 'ORGANIZATION_ADMIN' ? <><OrganizationForm key={data._id} organization={data} /><Panel title="Administrator ownership" description="Every organization has one administrator"><div className="settings-form"><p>Transfer ownership when responsibilities change. The recipient must first hand over any team leadership and project management duties.</p><Button variant="subtle" onClick={() => setTransfer(true)}><ArrowRightLeft size={17} />Transfer administration</Button></div></Panel></> : <Panel title="Organization policy"><dl className="detail-grid padded"><div><dt>Organization</dt><dd>{data.name}</dd></div><div><dt>Paid leave entitlement</dt><dd>{data.settings.annualLeaveDays} days / year</dd></div><div><dt>Working days</dt><dd>{data.settings.workingDays.map(n => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n]).join(', ')}</dd></div></dl></Panel>)}{transfer && <Transfer onClose={() => setTransfer(false)} />}</>;
}
