'use client'

import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

// Loads JSON from several endpoints at once and tracks loading and failure.
export function useFetchJson<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [hasFailed, setHasFailed] = useState(false)

  const reload = useCallback(async () => {
    setHasFailed(false)

    try {
      setData(await load())
    } catch (error) {
      logger.error('Error loading data:', error)
      setHasFailed(true)
    }
  }, [load])

  useEffect(() => {
    let isCurrent = true

    load()
      .then((result) => {
        if (isCurrent) setData(result)
      })
      .catch((error) => {
        logger.error('Error loading data:', error)
        if (isCurrent) setHasFailed(true)
      })

    return () => {
      isCurrent = false
    }
  }, [load])

  return { data, hasFailed, reload }
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}
