import * as React from "react"

import { cn, normalizeNumberInput } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onBeforeInput, ...props }, ref) => {
    const handleBeforeInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
      if (type === "number") {
        const inputEvent = e.nativeEvent as InputEvent;
        if (inputEvent.data) {
          const normalized = normalizeNumberInput(inputEvent.data);
          if (normalized !== inputEvent.data) {
            e.preventDefault();
            const input = e.target as HTMLInputElement;
            const currentValue = input.value;
            const newValue = currentValue + normalized;
            input.value = newValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
      onBeforeInput?.(e);
    }, [type, onBeforeInput]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "number" && e.target.value) {
        const normalized = normalizeNumberInput(e.target.value);
        if (normalized !== e.target.value) {
          e.target.value = normalized;
        }
      }
      onChange?.(e);
    }, [type, onChange]);

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onBeforeInput={handleBeforeInput}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
