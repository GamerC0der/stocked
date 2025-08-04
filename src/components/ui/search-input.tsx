import * as React from "react"
import { cn } from "@/lib/utils"
import { Search, X, Loader2 } from "lucide-react"

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  loading?: boolean
  placeholder?: string
  className?: string
  variant?: 'default' | 'glow' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    className, 
    value, 
    onChange, 
    onClear, 
    loading = false, 
    placeholder = "Search...",
    variant = 'default',
    size = 'md',
    ...props 
  }, ref) => {
    const baseStyles = "flex w-full items-center rounded-md border bg-background px-3 text-sm ring-offset-background transition-all duration-200"
    
    const variants = {
      default: "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-within:border-white/40 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-white/20",
      glow: "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-within:border-white/40 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-white/30 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
      minimal: "border-transparent bg-transparent text-white placeholder:text-white/50 focus-within:border-white/20"
    }
    
    const sizes = {
      sm: "h-8 text-xs",
      md: "h-10 text-sm", 
      lg: "h-12 text-base"
    }

    return (
      <div className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}>
        <Search className="h-4 w-4 text-white/50 mr-2 flex-shrink-0" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/50"
          {...props}
        />
        {loading && (
          <Loader2 className="h-4 w-4 text-white/50 animate-spin ml-2 flex-shrink-0" />
        )}
        {value && !loading && onClear && (
          <button
            onClick={onClear}
            className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-white/50 hover:text-white/70" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput } 