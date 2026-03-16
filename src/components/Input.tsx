import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
    delay?: number;
}

/**
 * Universal Input Component — simple TextInput pass-through.
 * `delay` prop kept for backward compatibility (ignored).
 */
export const Input = forwardRef<TextInput, InputProps>(({ delay: _delay, ...props }, ref) => {
    return (
        <TextInput
            ref={ref}
            {...props}
        />
    );
});
