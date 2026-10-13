import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, FileText, Loader2, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { authFetch } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** One queued/running/succeeded/failed report job. */
interface ReportRow {
  id: number
  report_type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  attempts: number
  error: string | null
  created_at: string | null
  completed_at: string | null
  result?: {
    profile?: { name?: string }
    generated_at?: string
    interpretation?: {
      paragraphs?: { rule_id: string; topic: string; text_fa: string; rules_version: string; evidence?: unknown }[]
      limitations?: { code: string; message: string }[]
    }
    psyche?: { chapter?: { stage?: string; focus_fa?: string } }
  }
}

const STATUS_FA: Record<string, { label: string; cls: string }> = {
  queued: { label: 'در صف', cls: 'bg-amber-100 text-amber-800' },
  running: { label: 'در حال ساخت', cls: 'bg-blue-100 text-blue-800' },
  succeeded: { label: 'آماده', cls: 'bg-green-100 text-green-800' },
  failed: { label: 'ناموفق', cls: 'bg-red-100 text-red-800' },
}

const POLL_MS = 1500
const POLL_MAX_TRIES = 40

function newIdemKey(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch { /* insecure context */ }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function readError(r: Response): Promise<string> {
  const e = await r.json().catch(() => ({}))
  return e?.detail?.message ?? (typeof e?.detail === 'string' ? e.detail : 'درخواست ناموفق بود')
}

/**
 * Report jobs of one birth profile: status polling, user retry, share links and
 * result view — the front end of the report-job backend (P09-T04).
 */
export default function ReportsPanel({ profileId, label }: { profileId: number; label: string }) {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [busy, setBusy] = useState<'create' | number | null>(null)
  const [err, setErr] = useState('')
  const [share, setShare] = useState<string>('')
  const [open, setOpen] = useState<number | null>(null)
  const alive = useRef(true)
  const polling = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (polling.current) clearTimeout(polling.current)
    }
  }, [])

  /** Fetch one report; late answers (profile changed / panel closed) are ignored. */
  const poll = useCallback(async (reportId: number, tries = 0) => {
    if (!alive.current) return
    const r = await authFetch(`/reports/${reportId}`)
    if (!alive.current) return // late response guard (P09-T04-M4)
    if (!r.ok) {
      if (r.status !== 404) setErr(await readError(r))
      return
    }
    const rep: ReportRow = await r.json()
    setRows((cur) => cur.map((x) => (x.id === reportId ? rep : x)))
    if ((rep.status === 'queued' || rep.status === 'running') && tries < POLL_MAX_TRIES) {
      polling.current = setTimeout(() => void poll(reportId, tries + 1), POLL_MS)
    }
  }, [])

  const load = useCallback(async () => {
    const r = await authFetch(`/profiles/${profileId}/reports`)
    if (!alive.current) return
    if (!r.ok) {
      if (r.status !== 404) setErr(await readError(r))
      setRows([])
      return
    }
    const list: ReportRow[] = await r.json()
    setRows(list)
    list.filter((x) => x.status === 'queued' || x.status === 'running')
      .forEach((x) => void poll(x.id))
  }, [profileId, poll])

  useEffect(() => { void load() }, [load])

  const create = async () => {
    setBusy('create'); setErr(''); setShare('')
    try {
      const r = await authFetch(`/profiles/${profileId}/reports`, {
        method: 'POST',
        headers: { 'Idempotency-Key': newIdemKey() },
      })
      if (!r.ok) throw new Error(await readError(r))
      const rep: ReportRow = await r.json()
      setRows((cur) => [rep, ...cur.filter((x) => x.id !== rep.id)])
      void poll(rep.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  const shareLink = async (id: number) => {
    setBusy(id); setErr(''); setShare('')
    try {
      const r = await authFetch(`/reports/${id}/share?hours=48`, { method: 'POST' })
      if (!r.ok) throw new Error(await readError(r))
      const j = await r.json()
      const url = `${window.location.origin}${j.path}`
      setShare(url)
      try { await navigator.clipboard?.writeText(url) } catch { /* copy is best-effort */ }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  const remove = async (id: number) => {

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3" data-testid="reports-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold">گزارش‌های {label}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw className="ml-1 h-3.5 w-3.5" /> تازه‌سازی</Button>
          <Button size="sm" disabled={busy !== null} onClick={() => void create()}>
            {busy === 'create' ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileText className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
            ساخت گزارش ماندگار
          </Button>
        </div>
      </div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {share && <p className="text-sm text-green-700 dark:text-green-400">لینک منقضی‌شونده کپی شد: <span className="num" dir="ltr">{share}</span></p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">هنوز گزارشی نساخته‌ای.</p>}
      <ul className="space-y-2">
        {rows.map((rep) => {
          const st = STATUS_FA[rep.status] ?? STATUS_FA.queued
          return (
            <li key={rep.id} className="rounded-lg border border-border/60 p-3 text-sm" data-status={rep.status}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('border-0 text-[11px]', st.cls)}>{st.label}</Badge>
                <span className="num text-xs text-muted-foreground">#{rep.id} • تلاش {rep.attempts}</span>
                <span className="ms-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(open === rep.id ? null : rep.id)}>جزئیات</Button>
                  {rep.status === 'succeeded' && (
                    <Button variant="ghost" size="sm" disabled={busy === rep.id} onClick={() => void shareLink(rep.id)}>
                      <Link2 className="ml-1 h-3.5 w-3.5" /> لینک اشتراک
                    </Button>
                  )}
                  {(rep.status === 'failed' || rep.status === 'succeeded') && (
                    <Button variant="ghost" size="sm" onClick={() => void create()}>تلاش دوباره</Button>
                  )}
                  <Button variant="ghost" size="sm" disabled={busy === rep.id} onClick={() => void remove(rep.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
              {(rep.status === 'queued' || rep.status === 'running') && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  وضعیت هر چند ثانیه به‌روز می‌شود…
                </p>
              )}
              {rep.error && <p className="mt-1 text-xs text-destructive">{rep.error}</p>}
              {open === rep.id && rep.result && (
                <div className="mt-2 space-y-2 border-t border-border/60 pt-2 leading-7">
                  <p className="text-xs text-muted-foreground">
                    نسخهٔ قواعد: {rep.result.interpretation?.paragraphs?.[0]?.rules_version ?? '—'} • ساخت: {rep.generated_at?.slice(0, 10) ?? '—'}
                  </p>
                  {rep.result.interpretation?.paragraphs?.map((p) => (
                    <p key={p.rule_id} className="text-sm">
                      <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                      {p.text_fa} <span className="num text-xs text-muted-foreground">[{p.rule_id}]</span>
                    </p>
                  ))}
                  {rep.result.interpretation?.limitations?.map((l) => (
                    <p key={l.code} className="text-xs text-amber-700 dark:text-amber-400">{l.message}</p>
                  ))}
                  {rep.result.psyche?.chapter?.focus_fa && (
                    <p className="text-sm">فصل درونی: {rep.result.psyche.chapter.focus_fa}</p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

    setBusy(id); setErr('')
    const r = await authFetch(`/reports/${id}`, { method: 'DELETE' })
    if (alive.current) {
      if (r.ok || r.status === 204) setRows((cur) => cur.filter((x) => x.id !== id))
      else setErr(await readError(r))
      setBusy(null)
    }
  }
