import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface Trend {
    type: 'count' | 'percent' | 'percent_point';
    value: number;
}

export default function TrendHint({ trend }: { trend: Trend | null }) {
    const { t } = useTranslation('common');

    if (!trend) {
        return <span className="trend-hint trend-hint--neutral">{t('trendHint.live')}</span>;
    }

    const { type, value } = trend;
    const suffix = type === 'count' ? '' : type === 'percent' ? '%' : ' pts';
    const label = value === 0 ? '0%' : `${value > 0 ? '+' : ''}${value}${suffix}`;

    return (
        <span className={`trend-hint ${value > 0 ? 'trend-hint--up' : value < 0 ? 'trend-hint--down' : 'trend-hint--neutral'}`}>
            {value > 0 ? <TrendingUp size={12} /> : value < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {t('trendHint.vsLast30Days', { label })}
        </span>
    );
}
