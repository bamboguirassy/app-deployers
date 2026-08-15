import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface KpiItem {
    key: string;
    title: string;
    value: number | string;
    suffix?: string;
    icon?: ReactNode;
}

export default function KpiCollapse({
    items,
    title,
    subtitle,
}: {
    items: KpiItem[];
    title?: string;
    subtitle?: string;
}) {
    const { t } = useTranslation('common');

    return (
        <div className="kpi-panel">
            <div className="kpi-panel__heading">
                <strong>{title ?? t('kpi.defaultTitle')}</strong>
                {subtitle && <span>{subtitle}</span>}
            </div>

            <div className="kpi-panel__stats">
                {items.map((item) => (
                    <div className="kpi-panel__stat" key={item.key}>
                        {item.icon && <span className="kpi-panel__stat-icon">{item.icon}</span>}
                        <div>
                            <div className="kpi-panel__stat-label">{item.title}</div>
                            <div className="kpi-panel__stat-value">
                                {item.value}
                                {item.suffix}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
