import { useEffect, useState } from "react";
import { onSnapshot, type Query, type DocumentData } from "firebase/firestore";

interface State<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to a Firestore query in realtime. Pass a stable query (memoize it
 * in the caller). Docs are mapped to `{ id, ...data }`.
 */
export function useCollectionData<T>(query: Query<DocumentData> | null): State<T> {
  const [state, setState] = useState<State<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    const unsub = onSnapshot(
      query,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
        setState({ data, loading: false, error: null });
      },
      (error) => setState({ data: [], loading: false, error }),
    );
    return unsub;
  }, [query]);

  return state;
}
