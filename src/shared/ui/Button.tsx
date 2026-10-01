import type { ButtonHTMLAttributes } from 'react'
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
  animate?: boolean
}
const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border border-line bg-white text-ink hover:bg-brand-50',
  quiet: 'text-muted hover:bg-brand-50 hover:text-brand-700',
}
export function Button({
  variant = 'primary',
  className = '',
  animate = true,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${animate ? 'transition-colors' : ''} disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
