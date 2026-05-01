// Stub — full implementation provided by frontend-run-git-components worker
export function LogStream({ lines }: { lines: string[] }) {
  return (
    <div className="font-mono text-xs bg-bg text-text-muted p-4 h-full overflow-auto">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}
