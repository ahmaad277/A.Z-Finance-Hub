import { Input } from './input';
import { forwardRef } from 'react';

export interface ArabicNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'inputMode'> {
  'data-testid'?: string;
  onValueChange?: (values: { floatValue?: number; formattedValue: string; value: string }) => void;
  value?: number | string;
}

export const ArabicNumberInput = forwardRef<HTMLInputElement, ArabicNumberInputProps>(
  ({ onValueChange, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Input component has already normalized Arabic→English
      const stringValue = e.target.value;
      const floatValue = stringValue === '' ? undefined : parseFloat(stringValue);
      
      // Notify parent in standard format
      onValueChange?.({
        value: stringValue,
        formattedValue: stringValue,
        floatValue: isNaN(floatValue as number) ? undefined : floatValue,
      });
      
      // Call original onChange if provided
      onChange?.(e);
    };
    
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={handleChange}
      />
    );
  }
);

ArabicNumberInput.displayName = 'ArabicNumberInput';
