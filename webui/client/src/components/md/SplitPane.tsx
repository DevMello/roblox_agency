import { useState, useRef, useCallback, useEffect } from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultSplit?: number
  minSize?: number
}

export function SplitPane({ left, right, defaultSplit = 50, minSize = 20 }: SplitPaneProps) {
  const [split, setSplit] = useState(defaultSplit)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newSplit = Math.max(minSize, Math.min(100 - minSize, ((e.clientX - rect.left) / rect.width) * 100))
    setSplit(newSplit)
  }, [minSize])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      <div style={{ width: `${split}%` }} className="overflow-auto min-w-0">{left}</div>
      <div
        className="w-1 bg-border hover:bg-accent/40 cursor-col-resize flex-shrink-0 transition-colors"
        onMouseDown={() => { dragging.current = true }}
      />
      <div className="flex-1 overflow-auto min-w-0">{right}</div>
    </div>
  )
}
