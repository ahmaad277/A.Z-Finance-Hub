import * as React from "react"
import { ControllerRenderProps } from "react-hook-form"

import { cn, normalizeNumberInput } from "@/lib/utils"

export function useNormalizedNumberField(
  field: ControllerRenderProps<any, any>,
  defaultValue: number | null = 0
) {
  const initialValue = field.value === null || field.value === undefined || field.value === 0
    ? ""
    : field.value.toString();
  
  const [stringValue, setStringValue] = React.useState(initialValue);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStringValue(e.target.value);
  }, []);

  const handleBlur = React.useCallback(() => {
    const trimmed = stringValue.replace(/[\.\-]+$/, '');
    if (trimmed === "" || trimmed === "-") {
      field.onChange(defaultValue);
      setStringValue(defaultValue === null || defaultValue === 0 ? "" : defaultValue.toString());
      return;
    }
    
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      field.onChange(num);
      setStringValue(num.toString());
    } else {
      field.onChange(defaultValue);
      setStringValue(defaultValue === null || defaultValue === 0 ? "" : defaultValue.toString());
    }
  }, [stringValue, field, defaultValue]);

  return {
    value: stringValue,
    onChange: handleChange,
    onBlur: handleBlur,
  };
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onBeforeInput, inputMode, ...props }, ref) => {
    const isNumericInput = type === "number";
    const effectiveType = isNumericInput ? "text" : type;
    const effectiveInputMode = isNumericInput ? "numeric" : inputMode;

    const handleBeforeInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
      if (isNumericInput) {
        const inputEvent = e.nativeEvent as InputEvent;
        if (inputEvent.data) {
          const normalized = normalizeNumberInput(inputEvent.data);
          if (normalized !== inputEvent.data) {
            e.preventDefault();
            const input = e.target as HTMLInputElement;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            const before = input.value.substring(0, start);
            const after = input.value.substring(end);
            const newValue = before + normalized + after;
            
            input.value = newValue;
            const newCursorPos = start + normalized.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
      onBeforeInput?.(e);
    }, [isNumericInput, onBeforeInput]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
    }, [onChange]);

    return (
      <input
        type={effectiveType}
        inputMode={effectiveInputMode}
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
