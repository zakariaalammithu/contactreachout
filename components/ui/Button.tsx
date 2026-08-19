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
          'bg-[#0B0F19] text-white hover:bg-slate-800 shadow-md shadow-slate-950/10 rounded-full border border-slate-800',
        gradient:
          'bg-gradient-to-r from-[#FF5722] via-[#8B5CF6] to-[#6366F1] text-white hover:from-[#F4511E] hover:to-[#4F46E5] shadow-md shadow-indigo-500/20 rounded-full',
        secondary:
          'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/90 shadow-sm rounded-xl',
        outline:
          'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl shadow-xs',
        ghost:
          'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl',
        destructive:
          'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl shadow-xs',
        success:
          'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-xs',
        glow:
          'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 rounded-full',
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
