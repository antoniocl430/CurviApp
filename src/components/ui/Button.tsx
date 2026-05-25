import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-orange-500 hover:bg-orange-600 text-white': variant === 'primary',
          'bg-white/10 hover:bg-white/20 text-white border border-white/20': variant === 'secondary',
          'hover:bg-white/10 text-white/70 hover:text-white': variant === 'ghost',
          'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',
          'px-2 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
