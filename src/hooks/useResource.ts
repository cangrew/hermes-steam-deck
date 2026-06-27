import { useCallback, useEffect, useState } from "react";

interface ResourceState<T> {
  data: T | undefined;
  loading: boolean;
  error?: string;
  reload: () => void;
}

/** Loads an async resource on mount (and on demand via `reload`). */
export function useResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): ResourceState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoLoader = useCallback(loader, deps);

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    memoLoader()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memoLoader]);

  useEffect(run, [run]);

  return { data, loading, error, reload: run };
}
