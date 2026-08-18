import AdminLayout from '@/Layouts/AdminLayout';
import { useThemeMode } from '@/theme/ThemeContext';
import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function syncHorizonTheme(mode: 'light' | 'dark') {
    localStorage.setItem('horizonColorScheme', mode);
}

export default function Horizon() {
    const { t } = useTranslation('admin');
    const { mode } = useThemeMode();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const prevMode = useRef<string | null>(null);

    // Sync avant le premier chargement de l'iframe
    syncHorizonTheme(mode);

    useEffect(() => {
        if (prevMode.current === null) {
            prevMode.current = mode;
            return;
        }

        // Le thème a changé après le chargement initial — on sync puis on recharge l'iframe
        syncHorizonTheme(mode);
        iframeRef.current?.contentWindow?.location.reload();
        prevMode.current = mode;
    }, [mode]);

    return (
        <AdminLayout
            breadcrumbs={[
                { label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') },
                { label: t('layout.nav.horizon') },
            ]}
        >
            <Head title="Horizon" />

            <iframe
                ref={iframeRef}
                src="/horizon"
                title="Horizon"
                style={{
                    width: '100%',
                    height: 'calc(100vh - 3px - 56px)',
                    border: 'none',
                    display: 'block',
                }}
            />
        </AdminLayout>
    );
}
