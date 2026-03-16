import { useCallback } from 'react';

/**
 * Pass-through hook (auto-dismiss removed to fix keyboard disappearing while typing).
 * @param {Function} callback - The state setter or function to call on text change.
 * @param {number} _delay - Unused, kept for backward compatibility.
 * @returns {Function} - The original callback.
 */
export const useAutoDismissKeyboard = (callback, _delay = 1250) => {
    return useCallback((text) => {
        if (callback) {
            callback(text);
        }
    }, [callback]);
};
