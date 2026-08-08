import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export interface Trend {
    type: 'count' | 'percent' | 'percent_point';
    value: number;
}

export default function TrendHint({ trend }: { trend: Trend | null }) {
    if (!trend) {
        return <span className="trend-hint trend-hint--neutral">En direct</span>;
    }

    const { type, value } = trend;
    const suffix = type === 'count' ? '' : type === 'percent' ? '%' : ' pts';
    const label = value === 0 ? '0%' : `${value > 0 ? '+' : ''}${value}${suffix}`;

    return (
        <span className={`trend-hint ${value > 0 ? 'trend-hint--up' : value < 0 ? 'trend-hint--down' : 'trend-hint--neutral'}`}>
            {value > 0 ? <TrendingUp size={12} /> : value < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {label} vs 30 derniers jours
        </span>
    );
}
