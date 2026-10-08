/** Token storage + authenticated fetch. Storage may be blocked: everything degrades to "logged out". */
import { friendlyError } from './net'

const KEY = 'ab_token'
const listeners = new Set<() => void>()

export function getToken(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked */ }
  listeners.forEach((l) => l())
}

export function onAuthChange(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

async function parseError(r: Response): Promise<string> {
  const j = await r.json().catch(() => ({}))
  const d = j?.detail
  if (typeof d === 'string') return d
  if (d?.message) return d.message
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg
  return `خطای سرور (${r.status})`
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const r = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (r.status === 401 && token) setToken(null) // expired/invalid -> logged out
  return r
}

export async function login(identifier: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username: identifier, password })
  const r = await fetch('/api/auth/token', { method: 'POST', body }).catch((e) => { throw new Error(friendlyError(e)) })
  if (!r.ok) throw new Error(await parseError(r))
  setToken((await r.json()).access_token)
}

export async function register(username: string, email: string, password: string): Promise<void> {
  const r = await fetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  }).catch((e) => { throw new Error(friendlyError(e)) })
  if (!r.ok) throw new Error(await parseError(r))
  await login(username, password)
}

export const logout = () => setToken(null)
