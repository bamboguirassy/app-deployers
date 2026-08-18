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
 * normale et la prop partagée `locale` se met bien à jour côté serveur (vu
 * dans les props de la réponse), mais react-i18next ne re-rend pas l'arbre
 * existant suite à `i18n.changeLanguage()` déclenché par LocaleSync — d'où
 * le rechargement complet forcé ici une fois le cookie posé, seule
 * approche qui applique fiablement la nouvelle langue sans intervention
 * manuelle de l'utilisateur.
 */
export default function LanguageSwitcher() {
    const { locale } = usePage<PageProps>().props;
    const { t } = useTranslation('common');

    const items = LOCALES.map(({ value, label }) => ({
        key: value,
        label,
        disabled: value === locale,
        onClick: () =>
            router.post(
                route('locale.set'),
                { locale: value },
                { preserveScroll: true, onSuccess: () => window.location.reload() },
            ),
    }));

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <button type="button" className="app-shell__icon-btn" aria-label={t('languageSwitcher.label')}>
                <Languages size={18} />
            </button>
        </Dropdown>
    );
}
