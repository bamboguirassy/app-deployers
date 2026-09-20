import { ActiveDeploymentEntry, PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Progress, Tag } from 'antd';
import confetti from 'canvas-confetti';
import { ArrowRight, Hourglass, Rocket } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Bande globale "déploiement en cours", affichée sous l'entête sur toutes les
 * pages du layout authentifié. État initial fourni par le prop Inertia
 * partagé `activeDeployments` (HandleInertiaRequests), tenu à jour en direct
 * via le channel privé `workspace.{id}` (statut + progression par étapes).
 * Complémentaire à ActiveDeploymentsBell (qui reste l'historique/liste
 * dépliable), cette bande met en avant la progression sans clic.
 */
export default function ActiveDeploymentBanner() {
    const { workspace, activeDeployments } = usePage<PageProps>().props;
    const { t } = useTranslation('deployments');
    const [items, setItems] = useState<ActiveDeploymentEntry[]>(activeDeployments?.items ?? []);

    useEcho(
        workspace ? `workspace.${workspace.id}` : '',
        '.deploiement.statut',
        (payload: Omit<ActiveDeploymentEntry, 'id' | 'status'> & { deployment_id: number; statut: string }) => {
            const isActive = payload.statut === 'pending' || payload.statut === 'running';

            setItems((prev) => {
                const withoutThisOne = prev.filter((item) => item.id !== payload.deployment_id);

                if (!isActive) {
                    if (payload.statut === 'succes') {
                        const end = Date.now() + 3000;
                        const colors = ['#4f46e5', '#a5b4fc', '#ffffff', '#818cf8'];
                        (function frame() {
                            confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
                            confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
                            if (Date.now() < end) requestAnimationFrame(frame);
                        })();
                    }
                    return withoutThisOne;
                }

                const entry: ActiveDeploymentEntry = {
                    id: payload.deployment_id,
                    status: payload.statut as 'pending' | 'running',
                    queued_reason: payload.queued_reason,
                    queue_position: payload.queue_position,
                    started_at: payload.started_at,
                    application_name: payload.application_name,
                    target_name: payload.target_name,
                    environment_name: payload.environment_name,
                    show_url: payload.show_url,
                    steps_total: payload.steps_total,
                    steps_done: payload.steps_done,
                };

                return [entry, ...withoutThisOne];
            });
        },
        [workspace?.id],
    );

    useEcho(
        workspace ? `workspace.${workspace.id}` : '',
        '.deploiement.etape',
        (payload: { deployment_id: number; statut: string }) => {
            const isStepDone = ['succes', 'echec', 'annule', 'skipped'].includes(payload.statut);
            if (!isStepDone) {
                return;
            }

            setItems((prev) =>
                prev.map((item) =>
                    item.id === payload.deployment_id
                        ? { ...item, steps_done: Math.min(item.steps_done + 1, item.steps_total || item.steps_done + 1) }
                        : item,
                ),
            );
        },
        [workspace?.id],
    );

    if (!workspace || items.length === 0) {
        return null;
    }

    return (
        <div className="active-deployment-banner">
            {items.map((item) => {
                const percent = item.steps_total > 0 ? Math.round((item.steps_done / item.steps_total) * 100) : undefined;
                // Une barre de progression à 0 % pour un déploiement qui
                // attend un slot laisserait croire qu'il a démarré : on
                // affiche l'attente et son rang à la place.
                const queued = item.queued_reason === 'concurrency';

                return (
                    <Link key={item.id} href={item.show_url} className="active-deployment-banner__row">
                        {queued
                            ? <Hourglass size={14} className="active-deployment-banner__icon" />
                            : <Rocket size={14} className="active-deployment-banner__icon" />}
                        <span className="active-deployment-banner__label">
                            {item.application_name}
                            <ArrowRight size={11} />
                            {item.target_name}
                            <ArrowRight size={11} />
                            {item.environment_name}
                        </span>
                        {queued ? (
                            <Tag color="warning" className="active-deployment-banner__queued">
                                {item.queue_position === null
                                    ? t('queued.tag')
                                    : item.queue_position <= 1
                                      ? t('queued.tagNext')
                                      : t('queued.tagWithPosition', { position: item.queue_position })}
                            </Tag>
                        ) : (
                            <Progress
                                className="active-deployment-banner__progress"
                                percent={percent}
                                status="active"
                                showInfo={percent !== undefined}
                                size="small"
                                format={() => `${item.steps_done}/${item.steps_total}`}
                            />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
