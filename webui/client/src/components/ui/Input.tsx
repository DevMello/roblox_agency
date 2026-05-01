import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id: externalId, ...props },
  ref,
) {
  const generatedId = useId()
  const id = externalId ?? generatedId

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-text-muted font-body"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'h-9 w-full rounded-md border bg-bg px-3 text-sm text-text-primary font-body placeholder:text-text-muted transition-colors',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20'
            : 'border-border focus:border-accent/60 focus:ring-accent/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger font-body">{error}</p>
      )}
      {!error && hint && (
        <p className="text-xs text-text-muted font-body">{hint}</p>
      )}
    </div>
  )
})
