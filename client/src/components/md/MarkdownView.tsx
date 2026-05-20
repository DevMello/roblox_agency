import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Components } from 'react-markdown'

interface MarkdownViewProps {
  content: string
  className?: string
}

// Strip ANSI if accidentally in markdown
function clean(s: string) {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

const components: Components = {
  h1: ({ children }) => <h1 className="font-display text-2xl font-bold text-text-primary mt-6 mb-3 border-b border-border pb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="font-display text-xl font-semibold text-text-primary mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="font-display text-lg font-medium text-text-primary mt-4 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-text-primary leading-relaxed mb-3">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
       className="text-accent hover:underline">{children}</a>
  ),
  code: ({ inline, className, children }: any) => {
    if (inline) {
      return <code className="bg-surface border border-border px-1 py-0.5 rounded text-sm font-mono text-accent">{children}</code>
    }
    const lang = (className ?? '').replace('language-', '')
    return (
      <div className="my-3 rounded-lg border border-border overflow-hidden">
        {lang && <div className="px-3 py-1 bg-surface border-b border-border text-xs text-text-muted font-mono">{lang}</div>}
        <pre className="bg-bg p-4 overflow-auto text-sm font-mono text-text-primary leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    )
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-4 my-3 text-text-muted italic">{children}</blockquote>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-text-primary">{children}</ol>,
  li: ({ children }) => <li className="text-text-primary">{children}</li>,
  hr: () => <hr className="border-border my-4" />,
  table: ({ children }) => (
    <div className="overflow-auto my-3">
      <table className="w-full text-sm border-collapse border border-border rounded">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left text-text-muted font-medium border-b border-border text-xs uppercase tracking-wide">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-text-primary border-b border-border/50">{children}</td>,
  tr: ({ children }) => <tr className="hover:bg-surface/50 transition-colors">{children}</tr>,
  strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-text-primary italic">{children}</em>,
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  return (
    <div className={`text-sm ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {clean(content)}
      </ReactMarkdown>
    </div>
  )
}
