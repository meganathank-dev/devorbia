import { useEffect, useRef, useId, useState } from 'react';
import { X, Search, ChevronLeft, ChevronRight, AlertCircle, Inbox, LoaderCircle, Check, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { label, initials } from '../utils/format';
import { useUI } from '../stores/app';
import { useData, useDebounce } from '../hooks/useData';
import { read } from '../api/client';
export const Button = ({
  children,
  variant = 'primary',
  busy = false,
  ...props
}) => <button {...props} disabled={busy || props.disabled} className={`btn ${variant} ${props.className || ''}`}>{busy && <LoaderCircle size={16} className="spin" />}{children}</button>;
export const Badge = ({
  value,
  children
}) => <span className={`badge ${String(value || '').toLowerCase()}`}>{children || label(value)}</span>;
export const Avatar = ({
  name,
  size = 'normal'
}) => <span className={`avatar ${size}`} aria-hidden="true">{initials(name)}</span>;
export const Progress = ({
  value = 0,
  label: ariaLabel = 'Progress'
}) => <div className="progress" role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, value)}><span style={{
    width: `${Math.min(100, Math.max(0, value))}%`
  }} /></div>;
export const Field = ({
  label: caption,
  hint,
  children,
  className = ''
}) => <label className={`field ${className}`}><span>{caption}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Select = ({
  options,
  placeholder,
  ...props
}) => <select {...props}>{placeholder && <option value="">{placeholder}</option>}{options.map(option => {
    const item = typeof option === 'string' ? {
      value: option,
      label: label(option)
    } : option;
    return <option key={item.value} value={item.value}>{item.label}</option>;
  })}</select>;
export const ErrorBox = ({
  error
}) => error ? <div role="alert" className="error-box"><AlertCircle size={18} /><span>{error}</span></div> : null;
export const Empty = ({
  title = 'Nothing here yet',
  text = 'Records will appear here when work is added.',
  action
}) => <div className="empty"><Inbox size={30} /><h3>{title}</h3><p>{text}</p>{action}</div>;
export const Loading = () => <div className="loading" aria-live="polite" aria-busy="true"><LoaderCircle className="spin" /><span>Loading your workspace…</span></div>;
export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
export function Panel({
  title,
  description,
  action,
  children,
  className = ''
}) {
  return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>}{children}</section>;
}
export function Metric({
  label: caption,
  value,
  detail,
  icon: Icon,
  tone = ''
}) {
  return <div className={`metric ${tone}`}><div className="metric-top"><span>{caption}</span>{Icon && <Icon size={18} />}</div><strong>{value ?? '—'}</strong><small>{detail}</small></div>;
}
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search records…'
}) {
  return <div className="search-box"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />{value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></button>}</div>;
}
export function Pagination({
  data,
  onPage
}) {
  if (!data) return null;
  return <div className="pagination"><span>{data.total ? `${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} of ${data.total}` : '0 records'}</span><div><Button variant="subtle" aria-label="Previous page" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}><ChevronLeft size={16} /></Button><span>Page {data.page} of {Math.max(1, data.pages)}</span><Button variant="subtle" aria-label="Next page" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}><ChevronRight size={16} /></Button></div></div>;
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  busy = false
}) {
  const ref = useRef(),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} aria-labelledby={titleId} onCancel={e => {
    e.preventDefault();
    if (!busy) onClose();
  }}><div className="modal-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
export function Confirm({
  title,
  text,
  onConfirm,
  onClose,
  confirmLabel = 'Confirm',
  danger = false
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  return <Modal title={title} onClose={onClose} busy={busy}><div className="modal-body"><p>{text}</p><ErrorBox error={error} /></div><div className="modal-actions"><Button variant="subtle" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={async () => {
        setBusy(true);
        try {
          await onConfirm();
          onClose();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}>{confirmLabel}</Button></div></Modal>;
}
export function Toasts() {
  const {
    toasts,
    dismiss
  } = useUI();
  return <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}><Check size={18} /><span>{t.message}</span><button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><X size={16} /></button></div>)}</div>;
}
export const TextLink = ({
  to,
  children
}) => <Link className="text-link" to={to}>{children}<ArrowUpRight size={14} /></Link>;
export function RecordSelect({
  resource,
  value,
  onChange,
  multiple = false,
  placeholder = 'Search and select…',
  filters = {},
  disabled = false
}) {
  const [search, setSearch] = useState(''),
    [open, setOpen] = useState(false),
    [known, setKnown] = useState({});
  const query = useDebounce(search),
    selected = multiple ? value || [] : value ? [value] : [];
  const {
    data,
    loading,
    error
  } = useData(open ? `/${resource}` : null, {
    ...filters,
    q: query,
    limit: 50,
    sort: 'name',
    order: 'asc'
  });
  const key = JSON.stringify(selected);
  useEffect(() => {
    let active = true;
    const missing = JSON.parse(key).filter(id => !known[id]);
    Promise.allSettled(missing.map(async id => [id, await read(`/${resource}/${id}`)])).then(results => {
      if (active) setKnown(prev => {
        const next = {
          ...prev
        };
        for (const r of results) if (r.status === 'fulfilled') next[r.value[0]] = r.value[1];
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [key, resource]);
  function choose(record) {
    setKnown(prev => ({
      ...prev,
      [record._id]: record
    }));
    onChange(multiple ? [...new Set([...selected, record._id])] : record._id);
    setSearch('');
    if (!multiple) setOpen(false);
  }
  return <div className="record-picker"><div className="selected-records">{selected.map(id => <span className="selection" key={id}>{known[id]?.name || known[id]?.title || 'Selected record'}{!disabled && <button type="button" aria-label={`Remove ${known[id]?.name || 'selection'}`} onClick={() => onChange(multiple ? selected.filter(x => x !== id) : null)}><X size={12} /></button>}</span>)}</div>{!disabled && <><input placeholder={placeholder} aria-label={placeholder} value={search} onFocus={() => setOpen(true)} onChange={e => {
        setSearch(e.target.value);
        setOpen(true);
      }} onKeyDown={e => {
        if (e.key === 'Escape') {
          setOpen(false);
          e.stopPropagation();
        }
      }} />{open && <div className="picker-results"><div className="picker-heading"><small>{loading ? 'Searching…' : 'Choose a record · search to narrow'}</small><button type="button" onClick={() => setOpen(false)}>Close</button></div>{error ? <small role="alert">{error}</small> : data?.items?.length ? data.items.filter(r => !selected.includes(r._id)).map(record => <button type="button" key={record._id} onClick={() => choose(record)}><span>{record.name || record.title}</span><small>{record.jobTitle || record.code || label(record.status)}</small></button>) : !loading && <small>No matching records.</small>}{data?.total > 50 && <small>Showing the first 50 matches. Refine your search.</small>}</div>}</>}</div>;
}
