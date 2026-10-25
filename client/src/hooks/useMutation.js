import { useState } from 'react';
import { send, errorMessage } from '../api/client';
import { useUI } from '../stores/app';
export function useMutation(onSuccess) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    {
      toast,
      refresh
    } = useUI();
  return {
    busy,
    error,
    async save(method, url, data, message = 'Changes saved.') {
      setBusy(true);
      setError(null);
      try {
        const result = await send(method, url, data);
        refresh();
        toast(message);
        onSuccess?.(result);
        return result;
      } catch (e) {
        setError(errorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    }
  };
}
