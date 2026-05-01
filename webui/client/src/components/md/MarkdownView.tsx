// Stub — full implementation provided by frontend-markdown worker
export function MarkdownView({ content }: { content: string }) {
  return <pre className="font-mono text-xs text-text-muted whitespace-pre-wrap p-4">{content}</pre>
}
