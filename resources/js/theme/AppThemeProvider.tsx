import { ConfigProvider, Modal, theme as antdTheme } from 'antd';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { ConfirmContext } from './ConfirmContext';
import { ThemeContext, ThemeMode } from './ThemeContext';

const STORAGE_KEY = 'app-deployers:theme';

// Doit rester aligné avec les variables --color-* définies dans
// resources/sass/themes/_light.scss et _dark.scss.
const PALETTE: Record<ThemeMode, { colorPrimary: string; colorBgBase: string; colorTextBase: string }> = {
    light: { colorPrimary: '#4f46e5', colorBgBase: '#ffffff', colorTextBase: '#1a1f27' },
    dark: { colorPrimary: '#6d5ef8', colorBgBase: '#12141b', colorTextBase: '#eef0f5' },
};

function ConfirmBridge({ children }: PropsWithChildren) {
    const [modal, contextHolder] = Modal.useModal();

    return (
        <ConfirmContext.Provider value={modal}>
            {contextHolder}
            {children}
        </ConfirmContext.Provider>
    );
}

function getPreferredMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'light';
    }

    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
    const [mode, setModeState] = useState<ThemeMode>(getPreferredMode);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
        localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
    const toggle = useCallback(() => setModeState((current) => (current === 'dark' ? 'light' : 'dark')), []);

    return (
        <ThemeContext.Provider value={{ mode, toggle, setMode }}>
            <ConfigProvider
                theme={{
                    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                    token: {
                        colorPrimary: PALETTE[mode].colorPrimary,
                        colorBgBase: PALETTE[mode].colorBgBase,
                        colorTextBase: PALETTE[mode].colorTextBase,
                        borderRadius: 12,
                        fontFamily:
                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    },
                }}
            >
                <ConfirmBridge>{children}</ConfirmBridge>
            </ConfigProvider>
        </ThemeContext.Provider>
    );
}
