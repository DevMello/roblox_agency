import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn',
  danger: 'btn btn-danger',
  ghost: 'btn btn-ghost',
}

const sizeClasses: Record<Size, string | undefined> = {
  sm: 'btn-sm',
  md: undefined,
  lg: 'btn-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={clsx(variantClasses[variant], sizeClasses[size], className)}
      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
})
