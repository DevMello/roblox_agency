interface DiffViewProps {
  diff: string
  filename?: string
}

function getLineClass(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'text-success bg-success/5 block px-2'
  if (line.startsWith('-') && !line.startsWith('---')) return 'text-danger bg-danger/5 block px-2'
  if (line.startsWith('@@')) return 'text-accent/70 bg-accent/5 block px-2 text-xs'
  if (line.startsWith('diff ') || line.startsWith('---') || line.startsWith('+++')) return 'text-text-muted block px-2 text-xs'
  return 'text-text-muted block px-2'
}

export function DiffView({ diff, filename }: DiffViewProps) {
  if (!diff?.trim()) {
    return <div className="text-text-muted text-sm p-4 text-center">No changes</div>
  }
  return (
    <div className="bg-bg border border-border rounded-lg overflow-auto">
      {filename && (
        <div className="px-4 py-2 border-b border-border font-mono text-xs text-text-muted bg-surface">
          {filename}
        </div>
      )}
      <pre className="text-xs font-mono leading-5 py-2 overflow-auto">
        {diff.split('\n').map((line, i) => (
          <span key={i} className={getLineClass(line)}>{line || ' '}</span>
        ))}
      </pre>
    </div>
  )
}
