import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Modal } from 'antd';
import { BookOpen, ChevronRight, LayoutList, Mail, ShieldCheck } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function HelpLink({
    icon,
    label,
    description,
    href,
    external,
    onClick,
}: {
    icon: ReactNode;
    label: string;
    description: string;
    href: string;
    external?: boolean;
    onClick: () => void;
}) {
    const content = (
        <>
            <span className="help-modal__icon">{icon}</span>
            <span className="help-modal__text">
                <strong>{label}</strong>
                <span className="help-modal__description">{description}</span>
            </span>
            <ChevronRight size={16} className="help-modal__chevron" />
        </>
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="help-modal__link" onClick={onClick}>
                {content}
            </a>
        );
    }

    return (
        <a href={href} className="help-modal__link" onClick={onClick}>
            {content}
        </a>
    );
}

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t, i18n } = useTranslation('dashboard');
    const { supportEmail } = usePage<PageProps>().props;
    const isFrench = i18n.language === 'fr';

    const docLinks = [
        {
            key: 'how-it-works',
            icon: <LayoutList size={16} />,
            label: t('help.howItWorks'),
            description: t('help.howItWorksDescription'),
            href: isFrench ? route('marketing.how-it-works') : route('marketing.how-it-works.en'),
        },
        {
            key: 'features',
            icon: <BookOpen size={16} />,
            label: t('help.features'),
            description: t('help.featuresDescription'),
            href: isFrench ? route('marketing.features') : route('marketing.features.en'),
        },
        {
            key: 'security',
            icon: <ShieldCheck size={16} />,
            label: t('help.security'),
            description: t('help.securityDescription'),
            href: isFrench ? route('marketing.security') : route('marketing.security.en'),
        },
    ];

    return (
        <Modal open={open} onCancel={onClose} footer={null} title={t('help.title')} destroyOnClose width={420}>
            <p className="help-modal__subtitle">{t('help.subtitle')}</p>

            <div className="help-modal__section">
                <h5 className="help-modal__section-title">{t('help.docsSection')}</h5>
                <div className="help-modal__list">
                    {docLinks.map(({ key, ...link }) => (
                        <HelpLink key={key} {...link} external onClick={onClose} />
                    ))}
                </div>
            </div>

            <div className="help-modal__section">
                <h5 className="help-modal__section-title">{t('help.supportSection')}</h5>
                <div className="help-modal__list">
                    <HelpLink
                        icon={<Mail size={16} />}
                        label={t('help.contactSupport')}
                        description={t('help.contactSupportDescription')}
                        href={`mailto:${supportEmail}`}
                        onClick={onClose}
                    />
                </div>
            </div>
        </Modal>
    );
}
