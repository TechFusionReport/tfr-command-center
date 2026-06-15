import { useState, useEffect, useCallback } from 'react'
import type { StatusResponse } from '../types/status'
import { MOCK_STATUS } from '../data/mock'

const API_URL          = import.meta.env.VITE_API_URL as string | undefined
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 60_000)

interface UseStatusResult {
  data:    StatusResponse | null
  error:   string | null
  loading: boolean
  stale:   boolean
  refetch: () => void
}

export function useStatus(): UseStatusResult {
  const [data,    setData]    = useState<StatusResponse | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stale,   setStale]   = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!API_URL) {
      setData(MOCK_STATUS)
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_URL}/status.json`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StatusResponse = await res.json()
      setData(json)
      setError(null)
      setStale(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      if (data) setStale(true)
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, stale, refetch: fetchStatus }
}
