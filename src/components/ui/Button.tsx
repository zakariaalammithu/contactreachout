import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[#0e6de4] text-white hover:bg-[#0758bd] shadow-md shadow-blue-600/20 rounded-xl border border-[#0e6de4]',
        gradient:
          'bg-gradient-to-r from-[#0e6de4] to-[#0758bd] text-white hover:from-[#0758bd] hover:to-[#064da5] shadow-md shadow-blue-500/20 rounded-xl',
        secondary:
          'bg-zinc-950 text-zinc-200 hover:bg-zinc-900 border border-zinc-800/90 shadow-sm rounded-xl',
        outline:
          'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 rounded-xl shadow-xs',
        ghost:
          'bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 rounded-xl',
        destructive:
          'bg-rose-950 text-rose-400 border border-rose-900 hover:bg-rose-900 rounded-xl shadow-xs',
        success:
          'bg-emerald-950 text-emerald-300 border border-emerald-900 hover:bg-emerald-900 rounded-xl shadow-xs',
        glow:
          'bg-[#0e6de4] text-white hover:bg-[#0758bd] shadow-lg shadow-blue-500/25 rounded-full',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-9.5 px-4.5 text-xs',
        lg: 'h-11 px-7 text-sm',
        icon: 'h-9 w-9 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
