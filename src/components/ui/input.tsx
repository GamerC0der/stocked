import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'search' | 'glow'
  size?: 'sm' | 'md' | 'lg'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = "flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
    
    const variants = {
      default: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      search: "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/20",
      glow: "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    }
    
    const sizes = {
      sm: "h-8 text-xs",
      md: "h-10 text-sm", 
      lg: "h-12 text-base"
    }

    return (
      <input
        type={type}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input } 