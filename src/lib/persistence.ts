import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

interface FinancialFreedomDB extends DBSchema {
  cache: {
    key: string
    value: {
      data: unknown
      timestamp: number
      key: string
    }
    indexes: { 'by-timestamp': number }
  }
}

const DB_NAME = 'FinancialFreedomDB'
const DB_VERSION = 1
const STORE_NAME = 'cache'
const DB_TIMEOUT = 5000

let dbPromise: Promise<IDBPDatabase<FinancialFreedomDB> | null> | null = null

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

async function getDB(): Promise<IDBPDatabase<FinancialFreedomDB> | null> {
  if (!isIndexedDBAvailable()) {
    return null
  }

  if (!dbPromise) {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn('IndexedDB open timeout')
        }
        resolve(null)
      }, DB_TIMEOUT)
    })

    dbPromise = Promise.race([
      openDB<FinancialFreedomDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
            store.createIndex('by-timestamp', 'timestamp')
          }
        },
      }),
      timeoutPromise,
    ]).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to open IndexedDB:', error)
      }
      return null
    })
  }
  
  try {
    return await dbPromise
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('IndexedDB operation failed:', error)
    }
    dbPromise = null
    return null
  }
}

export async function saveToIndexedDB(key: string, data: unknown): Promise<void> {
  try {
    const db = await getDB()
    if (!db) {
      return
    }
    await db.put(STORE_NAME, {
      key,
      data,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error)
  }
}

export async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  return (await loadEntryFromIndexedDB<T>(key))?.data ?? null
}

// Like loadFromIndexedDB, but also returns when the entry was saved so callers can judge freshness.
export async function loadEntryFromIndexedDB<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
  try {
    const db = await getDB()
    if (!db) {
      return null
    }
    
    const operationPromise = db.get(STORE_NAME, key)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn('IndexedDB load timeout for key:', key)
        }
        resolve(null)
      }, DB_TIMEOUT)
    })
    
    const cached = await Promise.race([operationPromise, timeoutPromise])
    if (cached && typeof cached === 'object' && 'data' in cached && cached.data) {
      return { data: cached.data as T, timestamp: cached.timestamp }
    }
    return null
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to load from IndexedDB:', error)
    }
    return null
  }
}

export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await getDB()
    if (!db) {
      return
    }
    await db.clear(STORE_NAME)
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error)
  }
}

export async function deleteFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await getDB()
    if (!db) {
      return
    }
    await db.delete(STORE_NAME, key)
  } catch (error) {
    console.error('Failed to delete from IndexedDB:', error)
  }
}

export function saveToLocalStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

export function deleteFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to delete from localStorage:', error)
  }
}
