import { Ban, Calendar, CheckCircle2, Clock, RefreshCw, User, Webhook, XCircle } from 'lucide-react';

export function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
    switch (status) {
        case 'running':
            return <RefreshCw size={size} className="status-icon--spin" />;
        case 'succes':
            return <CheckCircle2 size={size} />;
        case 'echec':
            return <XCircle size={size} />;
        case 'annule':
            return <Ban size={size} />;
        default:
            return <Clock size={size} />;
    }
}

export function SourceIcon({ source, size = 12 }: { source: string; size?: number }) {
    switch (source) {
        case 'webhook':
            return <Webhook size={size} />;
        case 'scheduled':
            return <Calendar size={size} />;
        default:
            return <User size={size} />;
    }
}

export function StatusDotsIcon() {
    return (
        <span style={{ display: 'inline-flex', gap: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-success)', display: 'inline-block' }} />
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-danger)', display: 'inline-block' }} />
        </span>
    );
}
