import type { ReactNode } from 'react'

/**
 * Tiny safe renderer: **bold**, "• " bullets and numbered lines — React nodes
 * only, no HTML injection. Shared by Chat and the three-lens page.
 */
export default function RichText({ text }: { text: string }) {
  const inline = (s: string, k: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? <strong key={`${k}${i}`}>{part.slice(2, -2)}</strong>
        : <span key={`${k}${i}`}>{part}</span>)
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = (k: number) => {
    if (list.length) {
      blocks.push(<ul key={`ul${k}`} className="my-2 list-disc space-y-1 pr-5">{list.map((l, i) => <li key={i}>{inline(l, `li${k}${i}`)}</li>)}</ul>)
      list = []
    }
  }
  text.split('\n').forEach((line, i) => {
    const heading = line.match(/^#{1,3}\s+(.*)$/)
    if (heading) {
      flush(i)
      blocks.push(
        <h4 key={`h${i}`} className="mb-1 mt-4 text-sm font-extrabold text-[hsl(var(--primary))]">
          {inline(heading[1], `ht${i}`)}
        </h4>,
      )
      return
    }
    const m = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/)
    if (m) { list.push(m[1]); return }
    flush(i)
    if (line.trim()) blocks.push(<p key={`p${i}`} className="my-1.5">{inline(line, `p${i}`)}</p>)
  })
  flush(9999)
  return <>{blocks}</>
}