import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  mono?: boolean
  fieldSize?: 'default' | 'lg'
}

const errorStyle = { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-soft)' }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, mono, fieldSize = 'default', className, id: externalId, ...props },
  ref,
) {
  const generatedId = useId()
  const id = externalId ?? generatedId

  return (
    <div className="col gap-4">
      {label && (
        <label htmlFor={id} className="label-cap">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'field',
          mono && 'field-mono',
          fieldSize === 'lg' && 'field-lg',
          className,
        )}
        style={error ? errorStyle : undefined}
        {...props}
      />
      {error && (
        <p style={{ fontSize: '11.5px', color: 'var(--danger)', margin: 0 }}>{error}</p>
      )}
      {!error && hint && (
        <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: 0 }}>{hint}</p>
      )}
    </div>
  )
})
