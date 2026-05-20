import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string
  readOnly?: boolean
  placeholder?: string
}

const agencyTheme = EditorView.theme({
  '&': { backgroundColor: '#111118', color: '#F0EEF8', fontSize: '13px' },
  '.cm-cursor': { borderLeftColor: '#7C6FFF' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(124,111,255,0.25) !important' },
  '.cm-activeLine': { backgroundColor: 'rgba(124,111,255,0.04)' },
  '.cm-gutters': { backgroundColor: '#111118', borderRight: '1px solid #1E1E2E', color: '#6E6C85' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(124,111,255,0.04)' },
  '.cm-lineNumbers': { fontFamily: 'JetBrains Mono, monospace' },
  '&.cm-focused': { outline: '1px solid rgba(124,111,255,0.4)' },
  '.cm-scroller': { fontFamily: 'JetBrains Mono, monospace' },
})

export function MarkdownEditor({ value, onChange, height = '400px', readOnly, placeholder }: MarkdownEditorProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <CodeMirror
        value={value}
        height={height}
        extensions={[markdown(), EditorView.lineWrapping, agencyTheme]}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          searchKeymap: true,
        }}
      />
    </div>
  )
}
