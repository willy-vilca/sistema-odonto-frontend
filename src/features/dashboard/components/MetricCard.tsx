import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  to,
  tone = 'brand',
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  to?: string
  tone?: 'brand' | 'amber'
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <span
          className={
            tone === 'amber'
              ? 'rounded-xl bg-amber-50 p-2.5 text-amber-800'
              : 'rounded-xl bg-brand-50 p-2.5 text-brand-700'
          }
        >
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 break-words text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </>
  )
  return to ? (
    <Link
      to={to}
      className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand-600"
    >
      {content}
    </Link>
  ) : (
    <article className="rounded-2xl border border-line bg-white p-5">{content}</article>
  )
}
