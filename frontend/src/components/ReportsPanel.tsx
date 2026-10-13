import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { authFetch } from '@/lib/auth'
import { Button } from '@/components/ui/button'

interface ReportRow {
  id: number
  status: 'queued' | 'running' | 'succeeded' | 'failed'
}

export default function ReportsPanel({ profileId, label }: { profileId: number; label: string }) {
  const [rows, setRows] = useState<ReportRow[]>([])
  
  const load = useCallback(async () => {
    const r = await authFetch(`/profiles/${profileId}/reports`)
    if (r.ok) setRows(await r.json())
  }, [profileId])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">گزارش‌های {label}</h3>
      <ul className="space-y-2">
        {rows.map((rep) => (
          <li key={rep.id} className="border p-3">{rep.status}</li>
        ))}
      </ul>
    </div>
  )
}
