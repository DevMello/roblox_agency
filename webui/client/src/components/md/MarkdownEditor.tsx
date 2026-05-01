// Stub — full implementation provided by frontend-markdown worker
export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <textarea
      className="w-full h-full font-mono text-xs bg-surface text-text-primary border border-border p-4 resize-none outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
