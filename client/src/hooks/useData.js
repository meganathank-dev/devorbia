import { useEffect, useState } from 'react';
import { read, errorMessage } from '../api/client';
import { useUI, useAuth } from '../stores/app';
export function useDebounce(value, ms = 300) {
  const [next, setNext] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setNext(value), ms);
    return () => clearTimeout(timeout);
  }, [value, ms]);
  return next;
}
export function useData(url, params = {}) {
  const [state, setState] = useState({
    data: null,
    loading: Boolean(url),
    error: null
  });
  const revision = useUI(s => s.revision),
    userId = useAuth(s => s.user?._id),
    key = JSON.stringify(params);
  useEffect(() => {
    if (!url) {
      setState({
        data: null,
        loading: false,
        error: null
      });
      return;
    }
    const controller = new AbortController();
    setState(s => ({
      ...s,
      loading: true,
      error: null
    }));
    read(url, JSON.parse(key), controller.signal).then(data => setState({
      data,
      loading: false,
      error: null
    })).catch(error => {
      if (!controller.signal.aborted) setState({
        data: null,
        loading: false,
        error: errorMessage(error)
      });
    });
    return () => controller.abort();
  }, [url, key, revision, userId]);
  return state;
}
export function useCollection(resource, initial = {}) {
  const [query, setQuery] = useState({
    q: '',
    page: 1,
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
    ...initial
  });
  const deferred = useDebounce(query.q),
    result = useData(`/${resource}`, {
      ...query,
      q: deferred
    });
  return {
    ...result,
    query,
    setQuery,
    filter: (key, value) => setQuery(q => ({
      ...q,
      [key]: value || undefined,
      page: 1
    })),
    search: value => setQuery(q => ({
      ...q,
      q: value,
      page: 1
    }))
  };
}
