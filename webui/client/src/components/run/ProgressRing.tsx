// Stub — full implementation provided by frontend-run-git-components worker
export function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return <span className="text-xs text-text-muted font-mono">{pct}%</span>
}
