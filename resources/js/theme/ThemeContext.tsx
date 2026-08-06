import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
    mode: ThemeMode;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useThemeMode must be used within an AppThemeProvider');
    }

    return context;
}
