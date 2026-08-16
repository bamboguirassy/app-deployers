import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Dropdown } from 'antd';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LOCALES: { value: 'en' | 'fr'; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
];

/**
 * Bascule explicite EN/FR pour le dashboard — pose le cookie `locale` via
 * la route `locale.set` (App\Http\Middleware\SetLocale le lira ensuite pour
 * toutes les pages sans locale fixe). La redirection est une visite Inertia
 * normale : la prop partagée `locale` se met à jour et LocaleSync
 * resynchronise i18next automatiquement, pas besoin de recharger la page.
 */
export default function LanguageSwitcher() {
    const { locale } = usePage<PageProps>().props;
    const { t } = useTranslation('common');

    const items = LOCALES.map(({ value, label }) => ({
        key: value,
        label,
        disabled: value === locale,
        onClick: () => router.post(route('locale.set'), { locale: value }, { preserveScroll: true }),
    }));

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <button type="button" className="app-shell__icon-btn" aria-label={t('languageSwitcher.label')}>
                <Languages size={18} />
            </button>
        </Dropdown>
    );
}
