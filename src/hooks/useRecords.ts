import { useState } from 'react'
import { isRecord, type RecordEntry } from '../utils/experiments'

export function useRecords(key: string) {
  const [entries, setEntries] = useState<RecordEntry[]>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(stored) ? stored.filter(isRecord).slice(0, 50) : []
    } catch { return [] }
  })
  function update(next: RecordEntry[]) {
    const limited = next.slice(0, 50)
    localStorage.setItem(key, JSON.stringify(limited))
    setEntries(limited)
  }
  return { entries, update }
}
