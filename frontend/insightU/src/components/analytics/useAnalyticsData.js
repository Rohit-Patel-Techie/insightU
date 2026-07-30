import { useCallback, useEffect, useRef, useState } from "react"

export function useAnalyticsData(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [reloadToken, setReloadToken] = useState(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher }, [fetcher])
  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => { if (active) setState((previous) => ({ ...previous, loading: true, error: null })) })
      .then(() => fetcherRef.current(...deps))
      .then((data) => { if (active) setState({ data, error: null, loading: false }) })
      .catch((error) => { if (active) setState({ data: null, error, loading: false }) })
    return () => { active = false }
    // Dependencies are explicit primitive values supplied by each page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  return { ...state, refetch }
}
